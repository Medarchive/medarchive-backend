import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users, wallets } from '../../src/db/schema';
import type { Database } from '../../src/db/db.module';
import type { createMailServiceMock } from './mock-mail.service';

export interface AuthedUser {
  userId: string;
  email: string;
  accessToken: string;
}

async function waitForProvisionedWallet(
  db: Database,
  userId: string,
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });
    if (wallet) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Custodial wallet was not provisioned in time for user ${userId}`,
  );
}

let counter = 0;

export async function registerAndLogin(
  app: INestApplication,
  db: Database,
  mail: ReturnType<typeof createMailServiceMock>,
  role: 'PATIENT' | 'PROVIDER',
): Promise<AuthedUser> {
  counter += 1;
  const email = `e2e-${role.toLowerCase()}-${Date.now()}-${counter}@example.com`;
  const password = 'P@ssw0rd123';
  const fullName = `E2E ${role} ${counter}`;

  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ fullName, email, password, role })
    .expect(201);

  const otpCall = mail.sendOtp.mock.calls.find((call) => call[0] === email);
  if (!otpCall) throw new Error(`No OTP captured for ${email}`);
  const otp = otpCall[1] as string;

  await request(app.getHttpServer())
    .post('/api/v1/auth/validate-otp')
    .send({ email, otp })
    .expect(200);

  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user) throw new Error(`User not found after registration: ${email}`);

  // Custodial wallet is provisioned by a background job — wait for it so
  // callers can rely on a verified wallet existing right after this resolves.
  await waitForProvisionedWallet(db, user.id);

  return {
    userId: user.id,
    email,
    accessToken: loginRes.body.data.accessToken as string,
  };
}
