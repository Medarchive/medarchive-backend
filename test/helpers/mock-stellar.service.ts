export function createStellarServiceMock() {
  return {
    getUsdcAsset: jest.fn().mockReturnValue({
      getCode: () => 'USDC',
      getIssuer: () =>
        'GISSUERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    }),
    accountExists: jest.fn().mockResolvedValue(true),
    hasUsdcTrustline: jest.fn().mockResolvedValue(true),
    establishUsdcTrustline: jest.fn().mockResolvedValue('trustline-tx-hash'),
    fundTestnetAccountViaFriendbot: jest.fn().mockResolvedValue(undefined),
    verifyPayment: jest.fn().mockResolvedValue({ valid: true }),
    findPaymentForOrder: jest.fn().mockResolvedValue(null),
    submitVerificationTx: jest.fn().mockResolvedValue('verification-tx-hash'),
    fundNewAccount: jest.fn().mockResolvedValue(undefined),
  };
}
