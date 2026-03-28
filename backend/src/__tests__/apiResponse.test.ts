import { describe, test, expect, mock } from 'bun:test';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// Minimal mock of Express Response
function makeRes() {
  const res: any = {};
  const captured: { status?: number; body?: any } = {};

  res.status = mock((code: number) => {
    captured.status = code;
    return res;
  });
  res.json = mock((body: any) => {
    captured.body = body;
    return res;
  });

  res._captured = captured;
  return res;
}

describe('successResponse', () => {
  test('sends 200 with success:true and data', () => {
    const res = makeRes();
    successResponse(res, { id: 1 });
    expect(res._captured.status).toBe(200);
    expect(res._captured.body).toEqual({ success: true, data: { id: 1 } });
  });

  test('uses custom status code', () => {
    const res = makeRes();
    successResponse(res, { created: true }, 201);
    expect(res._captured.status).toBe(201);
  });

  test('sends success:true with no data when omitted', () => {
    const res = makeRes();
    successResponse(res);
    expect(res._captured.body.success).toBe(true);
  });
});

describe('errorResponse', () => {
  test('sends 400 with success:false and error message', () => {
    const res = makeRes();
    errorResponse(res, 'Something went wrong');
    expect(res._captured.status).toBe(400);
    expect(res._captured.body).toEqual({ success: false, error: 'Something went wrong' });
  });

  test('uses custom status code', () => {
    const res = makeRes();
    errorResponse(res, 'Not found', 404);
    expect(res._captured.status).toBe(404);
  });

  test('sends 401 status', () => {
    const res = makeRes();
    errorResponse(res, 'Unauthorized', 401);
    expect(res._captured.status).toBe(401);
    expect(res._captured.body.success).toBe(false);
  });
});
