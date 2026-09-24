import { ConflictException } from '@nestjs/common';
import { WalletService } from './wallet.service';

jest.mock('src/config/env', () => ({
  env: () => ({ STELLAR_NETWORK: 'testnet' }),
}));

function createDbMock() {
  return {
    query: {
      wallets: { findFirst: jest.fn() },
      users: { findFirst: jest.fn() },
    },
    insert: jest.fn(),
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

describe('WalletService', () => {
  let db: ReturnType<typeof createDbMock>;
  let cache: Record<string, jest.Mock>;
  let activityLog: { log: jest.Mock };
  let mail: { sendWalletLinked: jest.Mock };
  let walletEncryption: { encrypt: jest.Mock };
  let stellar: { fundNewAccount: jest.Mock };
  let provisionQueue: { add: jest.Mock };
  let service: WalletService;

  beforeEach(() => {
    db = createDbMock();
    cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    activityLog = { log: jest.fn() };
    mail = { sendWalletLinked: jest.fn().mockResolvedValue(undefined) };
    walletEncryption = {
      encrypt: jest.fn().mockReturnValue('encrypted-secret'),
    };
    stellar = { fundNewAccount: jest.fn().mockResolvedValue(undefined) };
    provisionQueue = { add: jest.fn().mockResolvedValue(undefined) };
    service = new WalletService(
      db as never,
      cache as never,
      activityLog as never,
      mail as never,
      walletEncryption as never,
      stellar as never,
      provisionQueue as never,
    );
  });

  describe('enqueueProvisioning', () => {
    it('adds a provisioning job for the user', async () => {
      await service.enqueueProvisioning('user-1');

      expect(provisionQueue.add).toHaveBeenCalledWith('provision', {
        userId: 'user-1',
      });
    });
  });

  describe('create', () => {
    it('rejects when a wallet is already linked', async () => {
      db.query.wallets.findFirst.mockResolvedValue({ id: 'wallet-1' });

      await expect(service.create('user-1')).rejects.toThrow(ConflictException);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('generates a custodial wallet that is verified immediately', async () => {
      db.query.wallets.findFirst.mockResolvedValue(undefined);
      db.query.users.findFirst.mockResolvedValue({
        email: 'patient@example.com',
        fullName: 'Test Patient',
      });
      mockInsertReturning(db, {
        id: 'wallet-1',
        userId: 'user-1',
        address: 'GABC123',
        network: 'TESTNET',
        encryptedSecret: 'encrypted-secret',
        verifiedAt: new Date('2026-01-01'),
      });

      const wallet = await service.create('user-1');

      expect(walletEncryption.encrypt).toHaveBeenCalled();
      expect(wallet).not.toHaveProperty('encryptedSecret');
      expect(wallet.verifiedAt).toEqual(new Date('2026-01-01'));
      expect(stellar.fundNewAccount).toHaveBeenCalled();
      expect(activityLog.log).toHaveBeenCalledWith(
        'user-1',
        'WALLET_LINKED',
        expect.objectContaining({ custodial: true }),
      );
      expect(mail.sendWalletLinked).toHaveBeenCalled();
    });

    it('does not fail wallet creation if the funding call rejects', async () => {
      db.query.wallets.findFirst.mockResolvedValue(undefined);
      db.query.users.findFirst.mockResolvedValue(null);
      mockInsertReturning(db, {
        id: 'wallet-1',
        userId: 'user-1',
        address: 'GABC123',
        network: 'TESTNET',
        encryptedSecret: 'encrypted-secret',
        verifiedAt: new Date(),
      });
      stellar.fundNewAccount.mockRejectedValue(new Error('horizon down'));

      await expect(service.create('user-1')).resolves.toBeDefined();
    });
  });
});
