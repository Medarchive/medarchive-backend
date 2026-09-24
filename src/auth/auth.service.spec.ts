import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterRole } from './dto/register.dto';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  argon2id: 'argon2id',
}));

function createTxMock() {
  return {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
      }),
    }),
  };
}

describe('AuthService.register', () => {
  let db: {
    query: { users: { findFirst: jest.Mock } };
    transaction: jest.Mock;
  };
  let cache: { get: jest.Mock; set: jest.Mock };
  let mail: { sendOtp: jest.Mock };
  let activityLog: { log: jest.Mock };
  let wallet: { enqueueProvisioning: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    const tx = createTxMock();
    db = {
      query: { users: { findFirst: jest.fn().mockResolvedValue(undefined) } },
      transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)),
    };
    cache = { get: jest.fn(), set: jest.fn().mockResolvedValue(undefined) };
    mail = { sendOtp: jest.fn().mockResolvedValue(undefined) };
    activityLog = { log: jest.fn() };
    wallet = { enqueueProvisioning: jest.fn().mockResolvedValue(undefined) };

    service = new AuthService(
      db as never,
      cache as never,
      undefined as never,
      mail as never,
      activityLog as never,
      wallet as never,
    );
  });

  it('rejects registration for an already-registered email', async () => {
    db.query.users.findFirst.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register({
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'P@ssw0rd123',
        role: RegisterRole.PATIENT,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates the user without inserting a wallet, then enqueues background provisioning', async () => {
    await service.register({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'P@ssw0rd123',
      role: RegisterRole.PATIENT,
    });

    expect(wallet.enqueueProvisioning).toHaveBeenCalledWith('user-1');
  });

  it('still sends the OTP even if enqueueing wallet provisioning fails', async () => {
    wallet.enqueueProvisioning.mockRejectedValue(new Error('redis down'));

    await service.register({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'P@ssw0rd123',
      role: RegisterRole.PATIENT,
    });

    expect(mail.sendOtp).toHaveBeenCalled();
  });
});
