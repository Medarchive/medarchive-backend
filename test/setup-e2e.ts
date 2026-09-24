import { config } from 'dotenv';
import { resolve } from 'path';
import { connect } from 'net';
import { validateEnv } from '../src/config/env';

config({ path: resolve(__dirname, '../.env.development.local') });

process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/medarchive_e2e_test';
process.env.NODE_ENV = 'development';

validateEnv(process.env);

function flushRedis(): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const socket = connect(6379, 'localhost');
    socket.on('connect', () => socket.write('*1\r\n$8\r\nFLUSHALL\r\n'));
    socket.on('data', () => {
      socket.end();
      resolvePromise();
    });
    socket.on('error', reject);
  });
}

beforeAll(async () => {
  await flushRedis();
});
