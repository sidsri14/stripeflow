import { describe, test, expect } from 'bun:test';
import { RegisterSchema, LoginSchema } from '../schemas/auth.schema.js';
import { MonitorSchema } from '../schemas/monitor.schema.js';

// ─── RegisterSchema ──────────────────────────────────────────────────────────

describe('RegisterSchema', () => {
  const valid = { email: 'user@example.com', password: 'Secure1@pass' };

  test('accepts a valid payload', () => {
    const result = RegisterSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  test('normalises email to lowercase', () => {
    const result = RegisterSchema.safeParse({ ...valid, email: 'USER@EXAMPLE.COM' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('user@example.com');
  });

  test('rejects invalid email format', () => {
    const result = RegisterSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  test('rejects password shorter than 8 characters', () => {
    const result = RegisterSchema.safeParse({ ...valid, password: 'Ab1@' });
    expect(result.success).toBe(false);
  });

  test('rejects password without uppercase letter', () => {
    const result = RegisterSchema.safeParse({ ...valid, password: 'alllower1@' });
    expect(result.success).toBe(false);
  });

  test('rejects password without a number', () => {
    const result = RegisterSchema.safeParse({ ...valid, password: 'NoNumber@pass' });
    expect(result.success).toBe(false);
  });

  test('rejects missing email', () => {
    const result = RegisterSchema.safeParse({ password: valid.password });
    expect(result.success).toBe(false);
  });

  test('rejects missing password', () => {
    const result = RegisterSchema.safeParse({ email: valid.email });
    expect(result.success).toBe(false);
  });
});

// ─── LoginSchema ─────────────────────────────────────────────────────────────

describe('LoginSchema', () => {
  const valid = { email: 'user@example.com', password: 'anypassword' };

  test('accepts a valid login payload', () => {
    expect(LoginSchema.safeParse(valid).success).toBe(true);
  });

  test('rejects invalid email', () => {
    expect(LoginSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false);
  });

  test('rejects empty password', () => {
    expect(LoginSchema.safeParse({ ...valid, password: '' }).success).toBe(false);
  });

  test('normalises email to lowercase', () => {
    const result = LoginSchema.safeParse({ ...valid, email: 'USER@EXAMPLE.COM' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('user@example.com');
  });
});

// ─── MonitorSchema ────────────────────────────────────────────────────────────

describe('MonitorSchema', () => {
  const valid = { name: 'My API', url: 'https://api.example.com/health', method: 'GET' as const, interval: 60 };

  test('accepts a fully valid monitor', () => {
    expect(MonitorSchema.safeParse(valid).success).toBe(true);
  });

  test('defaults method to GET when omitted', () => {
    const result = MonitorSchema.safeParse({ name: 'Test', url: 'https://example.com', interval: 60 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.method).toBe('GET');
  });

  test('defaults interval to 60 when omitted', () => {
    const result = MonitorSchema.safeParse({ name: 'Test', url: 'https://example.com' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.interval).toBe(60);
  });

  test('rejects non-http URL', () => {
    expect(MonitorSchema.safeParse({ ...valid, url: 'ftp://example.com' }).success).toBe(false);
  });

  test('rejects invalid URL', () => {
    expect(MonitorSchema.safeParse({ ...valid, url: 'not-a-url' }).success).toBe(false);
  });

  test('rejects interval below minimum (10s)', () => {
    expect(MonitorSchema.safeParse({ ...valid, interval: 5 }).success).toBe(false);
  });

  test('rejects interval above maximum (86400s)', () => {
    expect(MonitorSchema.safeParse({ ...valid, interval: 100000 }).success).toBe(false);
  });

  test('rejects invalid HTTP method', () => {
    expect(MonitorSchema.safeParse({ ...valid, method: 'CONNECT' }).success).toBe(false);
  });

  test('accepts all valid HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'] as const;
    for (const method of methods) {
      expect(MonitorSchema.safeParse({ ...valid, method }).success).toBe(true);
    }
  });

  test('rejects empty name', () => {
    expect(MonitorSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  test('rejects name longer than 50 characters', () => {
    expect(MonitorSchema.safeParse({ ...valid, name: 'a'.repeat(51) }).success).toBe(false);
  });
});
