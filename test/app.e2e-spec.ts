import request from 'supertest';
import { createTestApp } from './helpers/app';
import type { TestApp } from './helpers/app';

describe('AppController (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it('/health (GET)', async () => {
    const res = await request(testApp.app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.db).toBe('ok');
    expect(res.body.data.redis).toBe('ok');
  });
});
