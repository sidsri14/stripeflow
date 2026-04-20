import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock Resend before importing the service
const mockSend = mock(() => Promise.resolve({ data: { id: 'abc' }, error: null }));
mock.module('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

// Must import AFTER mock
const { sendEmail } = await import('../resend.service.js');

describe('sendEmail', () => {
  beforeEach(() => mockSend.mockClear());

  it('calls Resend with correct params when API key set', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    await sendEmail({ to: 'a@b.com', subject: 'Hello', html: '<p>hi</p>' });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0] as any[];
    expect(call[0].to).toBe('a@b.com');
    expect(call[0].subject).toBe('Hello');
  });

  it('does not call Resend when no API key, logs to console instead', async () => {
    delete process.env.RESEND_API_KEY;
    const spy = mock(() => {});
    const orig = console.log;
    console.log = spy;
    await sendEmail({ to: 'a@b.com', subject: 'Test', html: '<p>x</p>' });
    console.log = orig;
    expect(mockSend).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it('throws when Resend returns an error', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockSend.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: { message: 'Invalid address' } }) as any
    );
    await expect(sendEmail({ to: 'bad', subject: 'x', html: 'x' })).rejects.toThrow('Invalid address');
  });
});
