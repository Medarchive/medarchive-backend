import { BadRequestException } from '@nestjs/common';
import {
  Account,
  Asset,
  Horizon,
  Keypair,
  Transaction,
} from '@stellar/stellar-sdk';
import { StellarService } from './stellar.service';

const issuerKeypair = Keypair.random();
const usdcIssuer = issuerKeypair.publicKey();

const envSettings: { STELLAR_NETWORK: 'testnet' | 'mainnet' } = {
  STELLAR_NETWORK: 'testnet',
};

jest.mock('../config/env', () => ({
  env: () => ({
    ...envSettings,
    STELLAR_USDC_ASSET_CODE: 'USDC',
    STELLAR_USDC_ISSUER: usdcIssuer,
    STELLAR_ANCHOR_SECRET: Keypair.random().secret(),
  }),
}));

jest.mock('@stellar/stellar-sdk', () => {
  const actual = jest.requireActual<typeof import('@stellar/stellar-sdk')>(
    '@stellar/stellar-sdk',
  );
  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: jest.fn(),
    },
  };
});

const MockedServer = Horizon.Server as unknown as jest.Mock;

function mockServerImplementation(overrides: Record<string, unknown>) {
  MockedServer.mockImplementation(() => overrides);
}

describe('StellarService', () => {
  let service: StellarService;

  beforeEach(() => {
    service = new StellarService();
    MockedServer.mockReset();
  });

  describe('accountExists', () => {
    it('returns true when the account loads', async () => {
      mockServerImplementation({
        loadAccount: jest.fn().mockResolvedValue({}),
      });
      await expect(service.accountExists(usdcIssuer)).resolves.toBe(true);
    });

    it('returns false on a 404 not-found response', async () => {
      mockServerImplementation({
        loadAccount: jest.fn().mockRejectedValue({ response: { status: 404 } }),
      });
      await expect(service.accountExists(usdcIssuer)).resolves.toBe(false);
    });

    it('rethrows unrelated errors', async () => {
      mockServerImplementation({
        loadAccount: jest.fn().mockRejectedValue({ response: { status: 500 } }),
      });
      await expect(service.accountExists(usdcIssuer)).rejects.toBeDefined();
    });
  });

  describe('hasUsdcTrustline', () => {
    it('returns false for an unfunded account', async () => {
      mockServerImplementation({
        loadAccount: jest.fn().mockRejectedValue({ response: { status: 404 } }),
      });
      await expect(service.hasUsdcTrustline(usdcIssuer)).resolves.toBe(false);
    });

    it('returns false when USDC balance is absent', async () => {
      mockServerImplementation({
        loadAccount: jest.fn().mockResolvedValue({
          balances: [{ asset_type: 'native', balance: '10' }],
        }),
      });
      await expect(service.hasUsdcTrustline(usdcIssuer)).resolves.toBe(false);
    });

    it('returns true when a matching USDC trustline exists', async () => {
      mockServerImplementation({
        loadAccount: jest.fn().mockResolvedValue({
          balances: [
            { asset_type: 'native', balance: '10' },
            {
              asset_type: 'credit_alphanum4',
              asset_code: 'USDC',
              asset_issuer: usdcIssuer,
              balance: '0',
            },
          ],
        }),
      });
      await expect(service.hasUsdcTrustline(usdcIssuer)).resolves.toBe(true);
    });

    it('ignores a same-code trustline from a different issuer', async () => {
      mockServerImplementation({
        loadAccount: jest.fn().mockResolvedValue({
          balances: [
            {
              asset_type: 'credit_alphanum4',
              asset_code: 'USDC',
              asset_issuer: Keypair.random().publicKey(),
              balance: '0',
            },
          ],
        }),
      });
      await expect(service.hasUsdcTrustline(usdcIssuer)).resolves.toBe(false);
    });
  });

  describe('findPaymentForOrder', () => {
    const providerWalletAddress =
      'GPROVIDERWALLETADDRESS000000000000000000000000000000000';
    const amount = '25.0000000';

    it('returns null when no payments exist for the account', async () => {
      mockServerImplementation({
        payments: () => ({
          forAccount: () => ({
            order: () => ({
              limit: () => ({
                call: jest.fn().mockResolvedValue({ records: [] }),
              }),
            }),
          }),
        }),
      });
      await expect(
        service.findPaymentForOrder({ providerWalletAddress, amount }),
      ).resolves.toBeNull();
    });

    it('ignores payments with a different amount or asset', async () => {
      mockServerImplementation({
        payments: () => ({
          forAccount: () => ({
            order: () => ({
              limit: () => ({
                call: jest.fn().mockResolvedValue({
                  records: [
                    {
                      type: 'payment',
                      to: providerWalletAddress,
                      asset_type: 'credit_alphanum4',
                      asset_code: 'USDC',
                      asset_issuer: usdcIssuer,
                      amount: '1.0000000',
                      transaction_hash: 'wrong-amount',
                    },
                    {
                      type: 'payment',
                      to: providerWalletAddress,
                      asset_type: 'native',
                      amount,
                      transaction_hash: 'wrong-asset',
                    },
                  ],
                }),
              }),
            }),
          }),
        }),
      });
      await expect(
        service.findPaymentForOrder({ providerWalletAddress, amount }),
      ).resolves.toBeNull();
    });

    it('returns the transaction hash of a matching payment', async () => {
      mockServerImplementation({
        payments: () => ({
          forAccount: () => ({
            order: () => ({
              limit: () => ({
                call: jest.fn().mockResolvedValue({
                  records: [
                    {
                      type: 'payment',
                      to: providerWalletAddress,
                      asset_type: 'credit_alphanum4',
                      asset_code: 'USDC',
                      asset_issuer: usdcIssuer,
                      amount,
                      transaction_hash: 'matching-tx-hash',
                    },
                  ],
                }),
              }),
            }),
          }),
        }),
      });
      await expect(
        service.findPaymentForOrder({ providerWalletAddress, amount }),
      ).resolves.toBe('matching-tx-hash');
    });

    it('returns null when the account has no payments yet (404)', async () => {
      mockServerImplementation({
        payments: () => ({
          forAccount: () => ({
            order: () => ({
              limit: () => ({
                call: jest
                  .fn()
                  .mockRejectedValue({ response: { status: 404 } }),
              }),
            }),
          }),
        }),
      });
      await expect(
        service.findPaymentForOrder({ providerWalletAddress, amount }),
      ).resolves.toBeNull();
    });
  });

  describe('establishUsdcTrustline', () => {
    it('signs and submits a ChangeTrust operation for USDC', async () => {
      const patient = Keypair.random();
      const submitTransaction = jest
        .fn<(tx: Transaction) => Promise<{ hash: string }>>()
        .mockResolvedValue({ hash: 'tx-hash-123' });
      mockServerImplementation({
        loadAccount: jest
          .fn()
          .mockResolvedValue(new Account(patient.publicKey(), '100')),
        submitTransaction,
      });

      const hash = await service.establishUsdcTrustline(patient.secret());

      expect(hash).toBe('tx-hash-123');
      expect(submitTransaction).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const submittedTx: Transaction = submitTransaction.mock.calls[0][0];
      expect(submittedTx.signatures.length).toBeGreaterThan(0);
      const op = submittedTx.operations[0];
      expect(op.type).toBe('changeTrust');
      if (op.type !== 'changeTrust' || !(op.line instanceof Asset))
        throw new Error('unreachable');
      expect(op.line.getCode()).toBe('USDC');
      expect(op.line.getIssuer()).toBe(usdcIssuer);
    });
  });

  describe('fundTestnetAccountViaFriendbot', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      envSettings.STELLAR_NETWORK = 'testnet';
    });

    it('refuses to fund on mainnet', async () => {
      envSettings.STELLAR_NETWORK = 'mainnet';
      await expect(
        service.fundTestnetAccountViaFriendbot(usdcIssuer),
      ).rejects.toThrow(BadRequestException);
    });

    it('calls the friendbot endpoint for the given public key', async () => {
      const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(''),
      });
      global.fetch = fetchMock;

      await service.fundTestnetAccountViaFriendbot(usdcIssuer);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('friendbot.stellar.org'),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const requestedUrl: string = fetchMock.mock.calls[0][0];
      expect(requestedUrl).toContain(usdcIssuer);
    });

    it('throws when friendbot responds with an error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('boom'),
      });

      await expect(
        service.fundTestnetAccountViaFriendbot(usdcIssuer),
      ).rejects.toThrow('Friendbot funding failed');
    });
  });

  describe('verifyPayment', () => {
    const expected = {
      destination: 'GPROVIDERWALLETADDRESS000000000000000000000000000000000',
      amount: '25.0000000',
      assetCode: 'USDC',
      assetIssuer: usdcIssuer,
      memo: 'ORD-ABCD1234',
    };

    it('fails when the transaction cannot be found', async () => {
      mockServerImplementation({
        transactions: () => ({
          transaction: () => ({
            call: jest.fn().mockRejectedValue(new Error('404')),
          }),
        }),
      });
      const result = await service.verifyPayment('deadbeef', expected);
      expect(result).toEqual({ valid: false, reason: 'Transaction not found' });
    });

    it('fails when the transaction was not successful', async () => {
      mockServerImplementation({
        transactions: () => ({
          transaction: () => ({
            call: jest.fn().mockResolvedValue({ successful: false }),
          }),
        }),
      });
      const result = await service.verifyPayment('deadbeef', expected);
      expect(result).toEqual({ valid: false, reason: 'Transaction failed' });
    });

    it('fails when the memo does not match the order reference', async () => {
      mockServerImplementation({
        transactions: () => ({
          transaction: () => ({
            call: jest.fn().mockResolvedValue({
              successful: true,
              memo_type: 'text',
              memo: 'ORD-WRONG',
            }),
          }),
        }),
      });
      const result = await service.verifyPayment('deadbeef', expected);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/memo/i);
    });

    it('fails when no payment operation is present', async () => {
      mockServerImplementation({
        transactions: () => ({
          transaction: () => ({
            call: jest.fn().mockResolvedValue({
              successful: true,
              memo_type: 'text',
              memo: expected.memo,
            }),
          }),
        }),
        operations: () => ({
          forTransaction: () => ({
            call: jest.fn().mockResolvedValue({ records: [] }),
          }),
        }),
      });
      const result = await service.verifyPayment('deadbeef', expected);
      expect(result).toEqual({
        valid: false,
        reason: 'No payment operation found',
      });
    });

    it('fails when the payment amount does not match', async () => {
      mockServerImplementation({
        transactions: () => ({
          transaction: () => ({
            call: jest.fn().mockResolvedValue({
              successful: true,
              memo_type: 'text',
              memo: expected.memo,
            }),
          }),
        }),
        operations: () => ({
          forTransaction: () => ({
            call: jest.fn().mockResolvedValue({
              records: [
                {
                  type: 'payment',
                  to: expected.destination,
                  asset_type: 'credit_alphanum4',
                  asset_code: expected.assetCode,
                  asset_issuer: expected.assetIssuer,
                  amount: '1.0000000',
                },
              ],
            }),
          }),
        }),
      });
      const result = await service.verifyPayment('deadbeef', expected);
      expect(result).toEqual({
        valid: false,
        reason: 'Payment amount does not match',
      });
    });

    it('succeeds when every field matches', async () => {
      mockServerImplementation({
        transactions: () => ({
          transaction: () => ({
            call: jest.fn().mockResolvedValue({
              successful: true,
              memo_type: 'text',
              memo: expected.memo,
            }),
          }),
        }),
        operations: () => ({
          forTransaction: () => ({
            call: jest.fn().mockResolvedValue({
              records: [
                {
                  type: 'payment',
                  to: expected.destination,
                  asset_type: 'credit_alphanum4',
                  asset_code: expected.assetCode,
                  asset_issuer: expected.assetIssuer,
                  amount: expected.amount,
                },
              ],
            }),
          }),
        }),
      });
      const result = await service.verifyPayment('deadbeef', expected);
      expect(result).toEqual({ valid: true });
    });
  });
});
