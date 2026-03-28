// JWT_SECRET is set in setup.ts (loaded via bunfig.toml preload) before this file runs
import { describe, test, expect } from 'bun:test';
import { generateToken, verifyToken } from '../utils/jwt.js';

describe('generateToken', () => {
  test('returns a non-empty string', () => {
    const token = generateToken('user-123');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  test('produces a valid JWT with three dot-separated parts', () => {
    const token = generateToken('user-abc');
    const parts = token.split('.');
    expect(parts.length).toBe(3);
  });

  test('generates different tokens for different userIds', () => {
    const t1 = generateToken('user-1');
    const t2 = generateToken('user-2');
    expect(t1).not.toBe(t2);
  });
});

describe('verifyToken', () => {
  test('returns the userId embedded in the token', () => {
    const userId = 'user-verify-test';
    const token = generateToken(userId);
    const payload = verifyToken(token);
    expect(payload.userId).toBe(userId);
  });

  test('round-trips correctly', () => {
    const id = 'round-trip-id';
    expect(verifyToken(generateToken(id)).userId).toBe(id);
  });

  test('throws on a tampered token', () => {
    const token = generateToken('user-xyz');
    const parts = token.split('.');
    // Flip last char in the signature
    const last = parts[2]!;
    parts[2] = last.slice(0, -1) + (last.slice(-1) === 'a' ? 'b' : 'a');
    expect(() => verifyToken(parts.join('.'))).toThrow();
  });

  test('throws on a completely invalid token', () => {
    expect(() => verifyToken('not.a.token')).toThrow();
    expect(() => verifyToken('')).toThrow();
  });
});
