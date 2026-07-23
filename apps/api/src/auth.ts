import { createRemoteJWKSet, jwtVerify } from 'jose';

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
    const userId = authorization?.match(/^Bearer\s+dev:([a-zA-Z0-9_-]+)$/)?.[1];
    if (!userId) throw new Error('unauthorized');
    return { id: userId };
  };
}
