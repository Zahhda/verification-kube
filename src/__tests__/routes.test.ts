import request from 'supertest';
import express from 'express';
import { router } from '../routes';
import * as database from '../database';

// Mock the database module
jest.mock('../database', () => ({
  verifyCredential: jest.fn(),
  isVerified: jest.fn()
}));

const app = express();
app.use(express.json());
app.use(router);

describe('Verification Service Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WORKER_ID = 'test-worker';
  });

  test('POST /verify should verify a credential successfully', async () => {
    // Mock database functions
    (database.isVerified as jest.Mock).mockResolvedValue(false);
    (database.verifyCredential as jest.Mock).mockResolvedValue(true);

    const response = await request(app)
      .post('/verify')
      .send({ id: 'test-id', data: { name: 'Test User' } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      verified: true,
      workerId: 'test-worker'
    });
    expect(database.isVerified).toHaveBeenCalledWith('test-id');
    expect(database.verifyCredential).toHaveBeenCalledWith('test-id', { name: 'Test User' });
  });

  test('POST /verify should return 400 if id is missing', async () => {
    const response = await request(app)
      .post('/verify')
      .send({ data: { name: 'Test User' } });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Missing required fields: id and data'
    });
  });

  test('POST /verify should return cached result if already verified', async () => {
    // Mock database functions
    (database.isVerified as jest.Mock).mockResolvedValue(true);

    const response = await request(app)
      .post('/verify')
      .send({ id: 'existing-id', data: { name: 'Test User' } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      verified: true,
      workerId: 'test-worker'
    });
    expect(database.isVerified).toHaveBeenCalledWith('existing-id');
    expect(database.verifyCredential).not.toHaveBeenCalled();
  });
});