import { apiBaseUrl } from '../config';
import { SpanStatusCode, propagation, trace } from '@opentelemetry/api';

export class ApiError extends Error {
  constructor(code, status, requestId) { super(code); this.code = code; this.status = status; this.requestId = requestId; }
}

export function createApiClient(getToken) {
  return async function request(path, options = {}) {
    return trace.getTracer('cavaquinho-lab-web').startActiveSpan(`${options.method || 'GET'} ${path}`, async span => {
      try {
        const token = await getToken();
        const headers = { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers };
        propagation.inject({}, headers);
        const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
        span.setAttribute('http.response.status_code', response.status);
        if (response.status === 204) return null;
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new ApiError(body.error || 'request_failed', response.status, body.requestId);
        return body;
      } catch (error) { span.recordException(error); span.setStatus({ code: SpanStatusCode.ERROR }); throw error; }
      finally { span.end(); }
    });
  };
}
