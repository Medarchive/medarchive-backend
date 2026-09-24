import request from 'supertest';
import { createTestApp } from './helpers/app';
import type { TestApp } from './helpers/app';
import { registerAndLogin } from './helpers/auth';
import type { AuthedUser } from './helpers/auth';

async function waitForGenerated(
  testApp: TestApp,
  token: string,
  proofId: string,
): Promise<{ status: string; commitment: string | null }> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await request(testApp.app.getHttpServer())
      .get(`/api/v1/clinical-proofs/${proofId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    if (res.body.data.status !== 'PENDING') return res.body.data;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Proof ${proofId} did not leave PENDING in time`);
}

describe('Clinical Proofs (e2e)', () => {
  let testApp: TestApp;
  let provider: AuthedUser;
  let patient: AuthedUser;

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

    await request(testApp.app.getHttpServer())
      .patch('/api/v1/medical-profile')
      .set('Authorization', `Bearer ${patient.accessToken}`)
      .send({ bloodGroup: 'O_POSITIVE' })
      .expect(200);
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it('rejects generating a proof for a claim that does not match the medical profile', async () => {
    await request(testApp.app.getHttpServer())
      .post('/api/v1/clinical-proofs')
      .set('Authorization', `Bearer ${patient.accessToken}`)
      .send({
        proofType: 'BLOOD_GROUP',
        claimData: { bloodGroup: 'A_NEGATIVE' },
      })
      .expect(400);
  });

  it('generates a proof, and lets an approved provider verify it', async () => {
    const createRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/clinical-proofs')
      .set('Authorization', `Bearer ${patient.accessToken}`)
      .send({
        proofType: 'BLOOD_GROUP',
        claimData: { bloodGroup: 'O_POSITIVE' },
      })
      .expect(201);

    const proofId = createRes.body.data.id as string;
    expect(createRes.body.data.status).toBe('PENDING');

    const generated = await waitForGenerated(
      testApp,
      patient.accessToken,
      proofId,
    );
    expect(generated.status).toBe('GENERATED');
    expect(generated.commitment).toBeTruthy();

    const dashboardRes = await request(testApp.app.getHttpServer())
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${patient.accessToken}`)
      .expect(200);
    expect(dashboardRes.body.data.recentClinicalProofs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: proofId, status: 'GENERATED' }),
      ]),
    );

    const requestRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/provider/profile/record-requests')
      .set('Authorization', `Bearer ${provider.accessToken}`)
      .send({
        patientId: patient.userId,
        requestType: 'Blood group confirmation',
        proofType: 'BLOOD_GROUP',
      })
      .expect(201);
    const requestId = requestRes.body.data.id as string;

    // Provider cannot verify before the patient approves.
    await request(testApp.app.getHttpServer())
      .post(`/api/v1/provider/profile/clinical-proofs/${proofId}/verify`)
      .set('Authorization', `Bearer ${provider.accessToken}`)
      .expect(403);

    await request(testApp.app.getHttpServer())
      .patch(`/api/v1/health-records/access-requests/${requestId}`)
      .set('Authorization', `Bearer ${patient.accessToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);

    const verifyRes = await request(testApp.app.getHttpServer())
      .post(`/api/v1/provider/profile/clinical-proofs/${proofId}/verify`)
      .set('Authorization', `Bearer ${provider.accessToken}`)
      .expect(200);

    expect(verifyRes.body.data.valid).toBe(true);
    expect(verifyRes.body.data.proofType).toBe('BLOOD_GROUP');
    expect(verifyRes.body.data.claimData).toEqual({ bloodGroup: 'O_POSITIVE' });
  });

  it('rejects a provider with no approved request for a different patient', async () => {
    const otherPatient = await registerAndLogin(
      testApp.app,
      testApp.db,
      testApp.mail,
      'PATIENT',
    );
    await request(testApp.app.getHttpServer())
      .patch('/api/v1/medical-profile')
      .set('Authorization', `Bearer ${otherPatient.accessToken}`)
      .send({ bloodGroup: 'AB_NEGATIVE' })
      .expect(200);

    const createRes = await request(testApp.app.getHttpServer())
      .post('/api/v1/clinical-proofs')
      .set('Authorization', `Bearer ${otherPatient.accessToken}`)
      .send({
        proofType: 'BLOOD_GROUP',
        claimData: { bloodGroup: 'AB_NEGATIVE' },
      })
      .expect(201);
    const proofId = createRes.body.data.id as string;
    await waitForGenerated(testApp, otherPatient.accessToken, proofId);

    await request(testApp.app.getHttpServer())
      .post(`/api/v1/provider/profile/clinical-proofs/${proofId}/verify`)
      .set('Authorization', `Bearer ${provider.accessToken}`)
      .expect(403);
  });
});
