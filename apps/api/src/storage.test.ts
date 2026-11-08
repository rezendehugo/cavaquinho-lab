import { afterEach, describe, expect, test, vi } from 'vitest';
import { DevelopmentStorage } from './storage.js';

function tokenFromUrl(url: string): string {
  const token = url.split('/').at(-1);
  if (!token) throw new Error('expected a token in the local URL');
  return token;
}

describe('development download links', () => {
  afterEach(() => vi.useRealTimers());

  test('issues a fresh preview URL after the previous local token expires', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const storage = new DevelopmentStorage();
    const ticket = await storage.createUploadTicket('owner', 'pdf');
    const uploadToken = tokenFromUrl(ticket.uploadUrl);
    await storage.acceptDevelopmentUpload(uploadToken, Buffer.from('%PDF-test'));
    const firstUrl = await storage.createDownloadUrl(ticket.storageKey);
    const firstToken = tokenFromUrl(firstUrl);
    expect(await storage.readDevelopmentUpload(firstToken)).toEqual(Buffer.from('%PDF-test'));

    vi.advanceTimersByTime(5 * 60_000 + 1);
    const refreshedUrl = await storage.createDownloadUrl(ticket.storageKey);
    const refreshedToken = tokenFromUrl(refreshedUrl);
    expect(refreshedToken).not.toBe(firstToken);
    expect(await storage.readDevelopmentUpload(firstToken)).toBeNull();
    expect(await storage.readDevelopmentUpload(refreshedToken)).toEqual(Buffer.from('%PDF-test'));
  });
});
