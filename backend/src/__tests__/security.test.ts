// No module mocks here — security.ts uses ipaddr.js (pure) + dns for resolution.
// We test isPrivateIP as a pure function and validateUrlForSSRF for the
// path that doesn't need DNS (literal IPs in URL and invalid inputs).
import { describe, test, expect } from 'bun:test';
import { isPrivateIP, validateUrlForSSRF } from '../utils/security.js';

// ─── isPrivateIP ────────────────────────────────────────────────────────────

describe('isPrivateIP', () => {
  test('identifies loopback IPv4 (127.0.0.1)', () => {
    expect(isPrivateIP('127.0.0.1')).toBe(true);
  });

  test('identifies loopback IPv4 range (127.x.x.x)', () => {
    expect(isPrivateIP('127.10.20.30')).toBe(true);
  });

  test('identifies private class-A range (10.x.x.x)', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true);
    expect(isPrivateIP('10.255.255.255')).toBe(true);
  });

  test('identifies private class-B range (172.16-31.x.x)', () => {
    expect(isPrivateIP('172.16.0.1')).toBe(true);
    expect(isPrivateIP('172.31.255.255')).toBe(true);
  });

  test('identifies private class-C range (192.168.x.x)', () => {
    expect(isPrivateIP('192.168.1.1')).toBe(true);
    expect(isPrivateIP('192.168.0.0')).toBe(true);
  });

  test('identifies link-local (169.254.x.x)', () => {
    expect(isPrivateIP('169.254.0.1')).toBe(true);
  });

  test('identifies loopback IPv6 (::1)', () => {
    expect(isPrivateIP('::1')).toBe(true);
  });

  test('identifies IPv4-mapped IPv6 private addresses', () => {
    expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIP('::ffff:192.168.1.1')).toBe(true);
  });

  test('allows known public IPv4 addresses', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false);
    expect(isPrivateIP('93.184.216.34')).toBe(false);
    expect(isPrivateIP('142.250.80.46')).toBe(false);
    expect(isPrivateIP('1.1.1.1')).toBe(false);
  });

  test('returns true for unparseable input (treat as unsafe)', () => {
    expect(isPrivateIP('not-an-ip')).toBe(true);
    expect(isPrivateIP('')).toBe(true);
  });
});

// ─── validateUrlForSSRF — protocol and URL validity (no DNS needed) ──────────

describe('validateUrlForSSRF (non-DNS paths)', () => {
  test('rejects ftp:// protocol', async () => {
    expect(await validateUrlForSSRF('ftp://example.com')).toBe(false);
  });

  test('rejects file:// protocol', async () => {
    expect(await validateUrlForSSRF('file:///etc/passwd')).toBe(false);
  });

  test('rejects a plain string with no URL structure', async () => {
    expect(await validateUrlForSSRF('not-a-url')).toBe(false);
  });

  test('rejects an empty string', async () => {
    expect(await validateUrlForSSRF('')).toBe(false);
  });

  test('rejects literal loopback IP in URL', async () => {
    expect(await validateUrlForSSRF('http://127.0.0.1/')).toBe(false);
  });

  test('rejects literal private class-A IP in URL', async () => {
    expect(await validateUrlForSSRF('http://10.0.0.1/api')).toBe(false);
  });

  test('rejects literal private class-C IP in URL', async () => {
    expect(await validateUrlForSSRF('http://192.168.1.100/secret')).toBe(false);
  });

  test('rejects literal private class-B IP in URL', async () => {
    expect(await validateUrlForSSRF('https://172.16.0.1/admin')).toBe(false);
  });

  // DNS-dependent: these call resolve4/resolve6 on a real hostname.
  // example.com resolves to a public IP (93.184.216.34), so this should pass.
  test('allows https://example.com (public DNS, may be slow)', async () => {
    const result = await validateUrlForSSRF('https://example.com/api');
    expect(result).toBe(true);
  });

  test('allows http:// as well as https://', async () => {
    const result = await validateUrlForSSRF('http://example.com/');
    expect(result).toBe(true);
  });
});
