import { randomUUID } from 'node:crypto';

export interface UploadTicket {
  storageKey: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface PrivateStorage {
  createUploadTicket(ownerId: string, extension: string): Promise<UploadTicket>;
  deletePrefix(prefix: string): Promise<void>;
}

export class DevelopmentStorage implements PrivateStorage {
  async createUploadTicket(ownerId: string, extension: string): Promise<UploadTicket> {
    const storageKey = `private/${ownerId}/${randomUUID()}.${extension}`;
    return {
      storageKey,
      uploadUrl: `/v1/development-uploads/${encodeURIComponent(storageKey)}`,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString()
    };
  }
  async deletePrefix(): Promise<void> {}
}

export class SupabasePrivateStorage implements PrivateStorage {
  constructor(private readonly projectUrl: string, private readonly serviceRoleKey: string, private readonly bucket = 'score-imports') {}
  private headers(): Record<string, string> { return { authorization: `Bearer ${this.serviceRoleKey}`, apikey: this.serviceRoleKey, 'content-type': 'application/json' }; }
  async createUploadTicket(ownerId: string, extension: string): Promise<UploadTicket> {
    const storageKey = `${ownerId}/${randomUUID()}.${extension}`;
    const response = await fetch(`${this.projectUrl}/storage/v1/object/upload/sign/${this.bucket}/${storageKey}`, { method: 'POST', headers: this.headers(), body: '{}' });
    if (!response.ok) throw new Error('storage_signing_failed');
    const payload = await response.json() as { url?: string; token?: string };
    const signedPath = payload.url ?? `/storage/v1/object/upload/sign/${this.bucket}/${storageKey}?token=${encodeURIComponent(payload.token ?? '')}`;
    return { storageKey: `private/${storageKey}`, uploadUrl: new URL(signedPath, this.projectUrl).toString(), expiresAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString() };
  }
  async deletePrefix(storageKey: string): Promise<void> {
    const key = storageKey.replace(/^private\//, '');
    const response = await fetch(`${this.projectUrl}/storage/v1/object/${this.bucket}/${key}`, { method: 'DELETE', headers: this.headers() });
    if (!response.ok && response.status !== 404) throw new Error('storage_delete_failed');
  }
}
