import { mock, describe, test, expect, beforeEach, beforeAll } from 'bun:test';

// ─── Module mocks (hoisted by Bun before imports) ───────────────────────────
// We mock Prisma (needs DB) but NOT jwt — JWT_SECRET is set in setup.ts so
// the real jwt module works fine and jwt.test.ts is not polluted.

const mockUserFindUnique = mock(async (_args?: any): Promise<any> => null);
const mockUserCreate = mock(async (_args?: any): Promise<any> => ({
  id: 'user-uuid-1',
  email: 'test@example.com',
  password: 'hashed-password',
  createdAt: new Date(),
}));
const mockAuditCreate = mock(async (): Promise<any> => null);

mock.module('../utils/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
    auditLog: {
      create: mockAuditCreate,
    },
  },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { AuthService } from '../services/auth.service.js';

// ─── AuthService.register ────────────────────────────────────────────────────

describe('AuthService.register', () => {
  beforeEach(() => {
    mockUserFindUnique.mockImplementation(async () => null);
    mockUserCreate.mockImplementation(async (args: any) => ({
      id: 'user-uuid-1',
      email: args?.data?.email ?? 'test@example.com',
      password: args?.data?.password ?? 'hashed',
      createdAt: new Date(),
    }));
    mockAuditCreate.mockImplementation(async () => null);
  });

  test('returns user and token on successful registration', async () => {
    const result = await AuthService.register({
      email: 'new@example.com',
      password: 'Secure1@pass',
    });

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  test('returned user contains id and email', async () => {
    const result = await AuthService.register({ email: 'new@example.com', password: 'Secure1@pass' });
    expect(result.user).toHaveProperty('id');
    expect(result.user).toHaveProperty('email');
  });

  test('throws when email is already taken', async () => {
    mockUserFindUnique.mockImplementation(async () => ({
      id: 'existing-user',
      email: 'test@example.com',
      password: 'hash',
      createdAt: new Date(),
    }));

    await expect(
      AuthService.register({ email: 'test@example.com', password: 'Secure1@pass' })
    ).rejects.toThrow('User already exists');
  });

  test('stores a bcrypt hash, not the plain-text password', async () => {
    let storedPassword = '';
    mockUserCreate.mockImplementation(async (args: any) => {
      storedPassword = args.data.password;
      return { id: 'user-uuid-1', email: args.data.email, password: storedPassword, createdAt: new Date() };
    });

    await AuthService.register({ email: 'new@example.com', password: 'Secure1@pass' });

    expect(storedPassword).not.toBe('Secure1@pass');
    expect(storedPassword.length).toBeGreaterThan(20); // bcrypt hash
    expect(storedPassword.startsWith('$2')).toBe(true); // bcrypt identifier
  });
});

// ─── AuthService.login ────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  let hashedPassword: string;

  beforeAll(async () => {
    const bcrypt = await import('bcrypt');
    hashedPassword = await bcrypt.default.hash('Secure1@pass', 10);
  });

  beforeEach(() => {
    mockUserFindUnique.mockImplementation(async () => ({
      id: 'user-uuid-1',
      email: 'test@example.com',
      password: hashedPassword,
      createdAt: new Date(),
    }));
    mockAuditCreate.mockImplementation(async () => null);
  });

  test('returns user and token with correct credentials', async () => {
    const result = await AuthService.login({
      email: 'test@example.com',
      password: 'Secure1@pass',
    });

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('token');
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  test('returned user has id and email', async () => {
    const result = await AuthService.login({ email: 'test@example.com', password: 'Secure1@pass' });
    expect(result.user.id).toBe('user-uuid-1');
    expect(result.user.email).toBe('test@example.com');
  });

  test('throws Invalid credentials when user does not exist', async () => {
    mockUserFindUnique.mockImplementation(async () => null);

    await expect(
      AuthService.login({ email: 'ghost@example.com', password: 'any' })
    ).rejects.toThrow('Invalid credentials');
  });

  test('throws Invalid credentials when password is wrong', async () => {
    await expect(
      AuthService.login({ email: 'test@example.com', password: 'WrongPassword1@' })
    ).rejects.toThrow('Invalid credentials');
  });
});
