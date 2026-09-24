import request from 'supertest';
import { randomBytes } from 'crypto';
import { createTestApp } from './helpers/app';
import type { TestApp } from './helpers/app';
import { registerAndLogin } from './helpers/auth';
import type { AuthedUser } from './helpers/auth';

function fakeTxHash(): string {
  return randomBytes(32).toString('hex');
}

describe('Service Orders (e2e)', () => {
  let testApp: TestApp;
  let provider: AuthedUser;
  let patient: AuthedUser;
  const paidTxHash = fakeTxHash();

  beforeAll(async () => {
    testApp = await createTestApp();
    provider = await registerAndLogin(
      testApp.app,
      testApp.db,
      testApp.mail,
      'PROVIDER',
    );
    patient = await registerAndLogin(
      testApp.app,
      testApp.db,
      testApp.mail,
      'PATIENT',
    );
    // registerAndLogin already waits for the background-provisioned
    // custodial wallet, which is verified immediately on creation.
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it('rejects order creation when the provider has no USDC trustline', async () => {
    testApp.stellar.hasUsdcTrustline.mockResolvedValueOnce(false);

    await request(testApp.app.getHttpServer())
      .post('/api/v1/service-orders')
      .set('Authorization', `Bearer ${provider.accessToken}`)
      .send({
        patientId: patient.userId,
        description: 'Consultation',
        amount: '25.0000000',
      })
      .expect(400);
  });

  it('creates an order, generates a payment intent, and settles on verify', async () => {
    const createRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/service-orders')
      .set('Authorization', `Bearer ${provider.accessToken}`)
      .send({
        patientId: patient.userId,
        description: 'Consultation',
        amount: '25.0000000',
      })
      .expect(201);

    const orderId = createRes.body.data.id as string;
    expect(createRes.body.data.status).toBe('PENDING');

    const getRes = await request(testApp.app.getHttpServer())
      .get(`/api/v1/service-orders/${orderId}`)
      .set('Authorization', `Bearer ${patient.accessToken}`)
      .expect(200);
    expect(getRes.body.data.id).toBe(orderId);

    const intentRes = await request(testApp.app.getHttpServer())
      .get(`/api/v1/service-orders/${orderId}/payment-intent`)
      .set('Authorization', `Bearer ${patient.accessToken}`)
      .expect(200);
    expect(intentRes.body.data.amount).toBe('25.0000000');
    expect(intentRes.body.data.assetCode).toBe('USDC');

    const verifyRes = await request(testApp.app.getHttpServer())
      .post(`/api/v1/service-orders/${orderId}/payment/verify`)
      .set('Authorization', `Bearer ${patient.accessToken}`)
      .send({ txHash: paidTxHash })
      .expect(200);

    expect(verifyRes.body.data.status).toBe('PAID');
    expect(verifyRes.body.data.txHash).toBe(paidTxHash);

    const finalRes = await request(testApp.app.getHttpServer())
      .get(`/api/v1/service-orders/${orderId}`)
      .set('Authorization', `Bearer ${patient.accessToken}`)
      .expect(200);
    expect(finalRes.body.data.status).toBe('PAID');
  });

  it('rejects a second verify with a fake tx hash already used on another order', async () => {
    const createRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/service-orders')
      .set('Authorization', `Bearer ${provider.accessToken}`)
      .send({
        patientId: patient.userId,
        description: 'Follow-up',
        amount: '10.0000000',
      })
      .expect(201);
    const orderId = createRes.body.data.id as string;

    await request(testApp.app.getHttpServer())
      .post(`/api/v1/service-orders/${orderId}/payment/verify`)
      .set('Authorization', `Bearer ${patient.accessToken}`)
      .send({ txHash: paidTxHash })
      .expect(409);
  });

  it('rejects a patient trying to view another patients order', async () => {
    const otherPatient = await registerAndLogin(
      testApp.app,
      testApp.db,
      testApp.mail,
      'PATIENT',
    );
    const createRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/service-orders')
      .set('Authorization', `Bearer ${provider.accessToken}`)
      .send({
        patientId: patient.userId,
        description: 'Consultation',
        amount: '5.0000000',
      })
      .expect(201);
    const orderId = createRes.body.data.id as string;

    await request(testApp.app.getHttpServer())
      .get(`/api/v1/service-orders/${orderId}`)
      .set('Authorization', `Bearer ${otherPatient.accessToken}`)
      .expect(403);
  });
});
