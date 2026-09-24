export function createMailServiceMock() {
  return {
    sendOtp: jest.fn().mockResolvedValue(undefined),
    sendWelcome: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendLoginAlert: jest.fn().mockResolvedValue(undefined),
    sendWalletLinked: jest.fn().mockResolvedValue(undefined),
    sendHealthRecordUploaded: jest.fn().mockResolvedValue(undefined),
  };
}
