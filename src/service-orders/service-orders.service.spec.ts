import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';

jest.mock('../config/env', () => ({
  env: () => ({
    STELLAR_USDC_ASSET_CODE: 'USDC',
    STELLAR_USDC_ISSUER:
      'GISSUERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  }),
}));

function createDbMock() {
  return {
    query: {
      users: { findFirst: jest.fn() },
      wallets: { findFirst: jest.fn() },
      serviceOrders: { findFirst: jest.fn(), findMany: jest.fn() },
    },
    insert: jest.fn(),
    update: jest.fn(),
  };
}

function mockInsertReturning(
  db: ReturnType<typeof createDbMock>,
  row: unknown,
) {
  db.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([row]),
    }),
  });
}

function mockUpdateReturning(
  db: ReturnType<typeof createDbMock>,
  row: unknown,
) {
  db.update.mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(row ? [row] : []),
      }),
    }),
  });
}

describe('ServiceOrdersService', () => {
  let db: ReturnType<typeof createDbMock>;
  let stellar: { verifyPayment: jest.Mock; hasUsdcTrustline: jest.Mock };
  let activityLog: { log: jest.Mock };
  let notifications: { push: jest.Mock };
  let service: ServiceOrdersService;

  beforeEach(() => {
    db = createDbMock();
    stellar = { verifyPayment: jest.fn(), hasUsdcTrustline: jest.fn() };
    activityLog = { log: jest.fn() };
    notifications = { push: jest.fn() };
    service = new ServiceOrdersService(
      db as never,
      stellar as never,
      activityLog as never,
      notifications as never,
    );
  });

  describe('create', () => {
    const dto = {
      patientId: 'patient-1',
      description: 'Consultation',
      amount: '25.0000000',
    };

    it('rejects when the provider wallet has no USDC trustline', async () => {
      db.query.users.findFirst.mockResolvedValue({
        id: 'patient-1',
        role: 'PATIENT',
      });
      db.query.wallets.findFirst.mockResolvedValue({
        address: 'GPROVIDER',
        verifiedAt: new Date(),
      });
      stellar.hasUsdcTrustline.mockResolvedValue(false);

      await expect(service.create('provider-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('creates the order once the provider wallet has a trustline', async () => {
      db.query.users.findFirst.mockResolvedValue({
        id: 'patient-1',
        role: 'PATIENT',
      });
      db.query.wallets.findFirst.mockResolvedValue({
        address: 'GPROVIDER',
        verifiedAt: new Date(),
      });
      stellar.hasUsdcTrustline.mockResolvedValue(true);
      mockInsertReturning(db, { id: 'order-1', reference: 'ORD-ABCD1234' });

      const order = await service.create('provider-1', dto);

      expect(order).toEqual({ id: 'order-1', reference: 'ORD-ABCD1234' });
      expect(activityLog.log).toHaveBeenCalledWith(
        'provider-1',
        'SERVICE_ORDER_CREATED',
        expect.any(Object),
      );
      expect(notifications.push).toHaveBeenCalled();
    });
  });

  describe('getPaymentIntent', () => {
    const order = {
      id: 'order-1',
      patientId: 'patient-1',
      providerId: 'provider-1',
      providerWalletAddress: 'GPROVIDER',
      reference: 'ORD-ABCD1234',
      amount: '25.0000000',
      status: 'PENDING',
    };

    it('rejects when the patient has no linked wallet', async () => {
      db.query.serviceOrders.findFirst.mockResolvedValue(order);
      db.query.wallets.findFirst.mockResolvedValue(undefined);

      await expect(
        service.getPaymentIntent('patient-1', 'order-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the patient wallet has no USDC trustline', async () => {
      db.query.serviceOrders.findFirst.mockResolvedValue(order);
      db.query.wallets.findFirst.mockResolvedValue({ address: 'GPATIENT' });
      stellar.hasUsdcTrustline.mockResolvedValue(false);

      await expect(
        service.getPaymentIntent('patient-1', 'order-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns the payment intent once the patient wallet has a trustline', async () => {
      db.query.serviceOrders.findFirst.mockResolvedValue(order);
      db.query.wallets.findFirst.mockResolvedValue({ address: 'GPATIENT' });
      stellar.hasUsdcTrustline.mockResolvedValue(true);

      const intent = await service.getPaymentIntent('patient-1', 'order-1');

      expect(intent).toEqual({
        orderId: 'order-1',
        reference: 'ORD-ABCD1234',
        destination: 'GPROVIDER',
        assetCode: 'USDC',
        assetIssuer: 'GISSUERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        amount: '25.0000000',
        memo: 'ORD-ABCD1234',
      });
    });

    it('rejects a caller who is not the order patient', async () => {
      db.query.serviceOrders.findFirst.mockResolvedValue(order);

      await expect(
        service.getPaymentIntent('someone-else', 'order-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyPayment', () => {
    const order = {
      id: 'order-1',
      patientId: 'patient-1',
      providerId: 'provider-1',
      providerWalletAddress: 'GPROVIDER',
      reference: 'ORD-ABCD1234',
      amount: '25.0000000',
      status: 'PENDING',
    };

    it('marks the order PAID on a valid transaction', async () => {
      db.query.serviceOrders.findFirst
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(undefined);
      stellar.verifyPayment.mockResolvedValue({ valid: true });
      mockUpdateReturning(db, { ...order, status: 'PAID', txHash: 'tx-1' });

      const updated = await service.verifyPayment(
        'patient-1',
        'order-1',
        'tx-1',
      );

      expect(updated.status).toBe('PAID');
      expect(notifications.push).toHaveBeenCalledTimes(2);
    });

    it('throws when Stellar verification fails, and does not touch the order', async () => {
      db.query.serviceOrders.findFirst
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(undefined);
      stellar.verifyPayment.mockResolvedValue({
        valid: false,
        reason: 'Payment amount does not match',
      });

      await expect(
        service.verifyPayment('patient-1', 'order-1', 'tx-1'),
      ).rejects.toThrow('Payment amount does not match');
      expect(db.update).not.toHaveBeenCalled();
    });

    it('rejects a transaction hash already used on another order', async () => {
      db.query.serviceOrders.findFirst
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce({ id: 'other-order' });

      await expect(
        service.verifyPayment('patient-1', 'order-1', 'tx-1'),
      ).rejects.toThrow('already been used');
      expect(stellar.verifyPayment).not.toHaveBeenCalled();
    });
  });
});
