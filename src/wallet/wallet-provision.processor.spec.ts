import { WalletProvisionProcessor } from './wallet-provision.processor';

describe('WalletProvisionProcessor', () => {
  let walletService: { create: jest.Mock };
  let processor: WalletProvisionProcessor;

  beforeEach(() => {
    walletService = { create: jest.fn() };
    processor = new WalletProvisionProcessor(walletService as never);
  });

  it('provisions a custodial wallet for the job user', async () => {
    walletService.create.mockResolvedValue({ id: 'wallet-1' });

    await processor.process({ data: { userId: 'user-1' } } as never);

    expect(walletService.create).toHaveBeenCalledWith('user-1');
  });

  it('swallows errors so a failed provisioning does not crash the worker', async () => {
    walletService.create.mockRejectedValue(new Error('db unreachable'));

    await expect(
      processor.process({ data: { userId: 'user-1' } } as never),
    ).resolves.toBeUndefined();
  });
});
