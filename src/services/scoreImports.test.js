import { afterEach, describe, expect, test, vi } from 'vitest';
import { uploadScore } from './scoreImports';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function pdfFile() {
  const content = new TextEncoder().encode('%PDF-test');
  return {
    name: 'partitura.pdf',
    type: 'application/pdf',
    size: content.byteLength,
    arrayBuffer: async () => content.buffer
  };
}

describe('diagnóstico do transporte de partituras', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('reports a browser-blocked upload when API health remains reachable', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        storageKey: 'private/local/file.pdf',
        uploadUrl: '/v1/development-uploads/ticket'
      }, 201))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(uploadScore(pdfFile())).rejects.toThrow('upload_transport_blocked');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://127.0.0.1:8080/api/health',
      { cache: 'no-store' }
    );
  });

  test('reports an unavailable API when upload and health both fail', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        storageKey: 'private/local/file.pdf',
        uploadUrl: '/v1/development-uploads/ticket'
      }, 201))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch')));

    await expect(uploadScore(pdfFile())).rejects.toThrow('api_unavailable');
  });

  test('preserves the HTTP status when upload returns an error response', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        storageKey: 'private/local/file.pdf',
        uploadUrl: '/v1/development-uploads/ticket'
      }, 201))
      .mockResolvedValueOnce(jsonResponse({}, 413)));

    await expect(uploadScore(pdfFile())).rejects.toThrow('upload_http_413');
  });
});
