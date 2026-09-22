import { WalletTrustlineService } from './wallet-trustline.service';

function createDbMock(wallets: unknown[]) {
  return {
    query: {
      wallets: { findMany: jest.fn().mockResolvedValue(wallets) },
    },
  };
}

describe('WalletTrustlineService', () => {
  let stellar: {
    accountExists: jest.Mock;
    hasUsdcTrustline: jest.Mock;
    establishUsdcTrustline: jest.Mock;
    fundTestnetAccountViaFriendbot: jest.Mock;
  };
  let walletEncryption: { decrypt: jest.Mock };
  let notifications: { push: jest.Mock };

  beforeEach(() => {
    stellar = {
      accountExists: jest.fn(),
      hasUsdcTrustline: jest.fn(),
      establishUsdcTrustline: jest.fn(),
      fundTestnetAccountViaFriendbot: jest.fn(),
    };
    walletEncryption = { decrypt: jest.fn().mockReturnValue('S-secret') };
    notifications = { push: jest.fn() };
  });

  function build(wallets: unknown[]) {
    const db = createDbMock(wallets);
    const service = new WalletTrustlineService(
      db as never,
      stellar as never,
      walletEncryption as never,
      notifications as never,
    );
    return { db, service };
  }

  it('skips wallets without a stored secret', async () => {
    const { service, db } = build([
      { id: 'w1', userId: 'u1', address: 'GADDR', encryptedSecret: null },
    ]);

    const result = await service.ensureTrustlines();

    expect(result).toEqual({ processed: 1, fixed: 0, skipped: 1, failed: 0 });
    expect(stellar.accountExists).not.toHaveBeenCalled();
    expect(db.query.wallets.findMany).toHaveBeenCalledTimes(1);
  });

  it('skips a wallet that is already funded and already has a trustline', async () => {
    const { service } = build([
      { id: 'w1', userId: 'u1', address: 'GADDR', encryptedSecret: 'enc' },
    ]);
    stellar.accountExists.mockResolvedValue(true);
    stellar.hasUsdcTrustline.mockResolvedValue(true);

    const result = await service.ensureTrustlines();

    expect(result).toEqual({ processed: 1, fixed: 0, skipped: 1, failed: 0 });
    expect(stellar.fundTestnetAccountViaFriendbot).not.toHaveBeenCalled();
    expect(stellar.establishUsdcTrustline).not.toHaveBeenCalled();
  });

  it('establishes a trustline for a funded wallet missing one', async () => {
    const { service } = build([
      { id: 'w1', userId: 'u1', address: 'GADDR', encryptedSecret: 'enc' },
    ]);
    stellar.accountExists.mockResolvedValue(true);
    stellar.hasUsdcTrustline.mockResolvedValue(false);
    stellar.establishUsdcTrustline.mockResolvedValue('tx-hash');

    const result = await service.ensureTrustlines();

    expect(result).toEqual({ processed: 1, fixed: 1, skipped: 0, failed: 0 });
    expect(stellar.fundTestnetAccountViaFriendbot).not.toHaveBeenCalled();
    expect(walletEncryption.decrypt).toHaveBeenCalledWith('enc');
    expect(stellar.establishUsdcTrustline).toHaveBeenCalledWith('S-secret');
    expect(notifications.push).toHaveBeenCalledWith(
      'u1',
      'USDC_TRUSTLINE_ESTABLISHED',
      expect.any(String),
      expect.any(String),
      { txHash: 'tx-hash' },
    );
  });

  it('funds an unfunded wallet via friendbot before establishing a trustline', async () => {
    const { service } = build([
      { id: 'w1', userId: 'u1', address: 'GADDR', encryptedSecret: 'enc' },
    ]);
    stellar.accountExists.mockResolvedValue(false);
    stellar.fundTestnetAccountViaFriendbot.mockResolvedValue(undefined);
    stellar.establishUsdcTrustline.mockResolvedValue('tx-hash');

    const result = await service.ensureTrustlines();

    expect(result).toEqual({ processed: 1, fixed: 1, skipped: 0, failed: 0 });
    expect(stellar.fundTestnetAccountViaFriendbot).toHaveBeenCalledWith(
      'GADDR',
    );
    expect(stellar.hasUsdcTrustline).not.toHaveBeenCalled();
    expect(stellar.establishUsdcTrustline).toHaveBeenCalledWith('S-secret');
  });

  it('keeps processing remaining wallets after one fails', async () => {
    const { service } = build([
      { id: 'w1', userId: 'u1', address: 'GADDR1', encryptedSecret: 'enc1' },
      { id: 'w2', userId: 'u2', address: 'GADDR2', encryptedSecret: 'enc2' },
    ]);
    stellar.accountExists
      .mockRejectedValueOnce(new Error('horizon down'))
      .mockResolvedValueOnce(true);
    stellar.hasUsdcTrustline.mockResolvedValue(false);
    stellar.establishUsdcTrustline.mockResolvedValue('tx-hash');

    const result = await service.ensureTrustlines();

    expect(result).toEqual({ processed: 2, fixed: 1, skipped: 0, failed: 1 });
  });
});
