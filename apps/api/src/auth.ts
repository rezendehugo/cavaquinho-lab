import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createHash } from 'node:crypto';

export interface AuthenticatedUser { id: string }
export type Authenticate = (authorization: string | undefined) => Promise<AuthenticatedUser>;

export function createSupabaseAuthenticator(projectUrl: string): Authenticate {
  const issuer = `${projectUrl.replace(/\/$/, '')}/auth/v1`;
  const keys = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  return async function authenticate(authorization) {
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new Error('unauthorized');
    const { payload } = await jwtVerify(token, keys, { issuer });
    if (!payload.sub) throw new Error('unauthorized');
    return { id: payload.sub };
  };
}

export function createDevelopmentAuthenticator(): Authenticate {
  return async function authenticate(authorization) {
    const alias = authorization?.match(/^Bearer\s+dev:([a-zA-Z0-9_-]+)$/)?.[1];
    if (!alias) throw new Error('unauthorized');
    const bytes = createHash('sha256').update(`cavaquinho-lab-development:${alias}`).digest().subarray(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return { id: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` };
  };
}
