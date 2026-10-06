const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.JWT_SECRET = 'test-secret';

const app = require('../src/app');

test('health endpoint returns ok', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('protected books endpoint rejects unauthenticated requests', async () => {
  const response = await request(app).get('/api/books');
  assert.equal(response.status, 401);
});
