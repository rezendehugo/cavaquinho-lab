import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface UploadTicket {
  storageKey: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface PrivateStorage {
  createUploadTicket(ownerId: string, extension: string): Promise<UploadTicket>;
  createDownloadUrl(storageKey: string): Promise<string>;
  acceptDevelopmentUpload?(token: string, content: Buffer): Promise<void>;
  readDevelopmentUpload?(token: string): Promise<Buffer | null>;
  deletePrefix(prefix: string): Promise<void>;
}

export class DevelopmentStorage implements PrivateStorage {
  private readonly uploads = new Map<string, { storageKey: string; content: Buffer | null; expiresAt: number }>();
  constructor(private readonly directory?: string) {}
  private filePath(storageKey: string): string {
    if (!this.directory || !storageKey.startsWith('private/')) throw new Error('invalid_storage_key');
    return resolve(this.directory, storageKey.replaceAll('/', '__'));
  }

  async createUploadTicket(ownerId: string, extension: string): Promise<UploadTicket> {
    const storageKey = `private/${ownerId}/${randomUUID()}.${extension}`;
    const token = randomUUID();
    const expiresAt = Date.now() + 5 * 60_000;
    this.uploads.set(token, { storageKey, content: null, expiresAt });
    return {
      storageKey,
      uploadUrl: `/v1/development-uploads/${token}`,
      expiresAt: new Date(expiresAt).toISOString()
    };
  }
  async acceptDevelopmentUpload(token: string, content: Buffer): Promise<void> {
    const upload = this.uploads.get(token);
    if (!upload || upload.expiresAt < Date.now()) throw new Error('upload_ticket_expired');
    upload.content = content;
    if (this.directory) {
      await mkdir(this.directory, { recursive: true });
      await writeFile(this.filePath(upload.storageKey), content);
    }
  }
  async readDevelopmentUpload(token: string): Promise<Buffer | null> {
    const upload = this.uploads.get(token);
    if (!upload || upload.expiresAt < Date.now()) return null;
    if (upload.content) return upload.content;
    if (!this.directory) return null;
    return readFile(this.filePath(upload.storageKey)).catch(() => null);
  }
  async createDownloadUrl(storageKey: string): Promise<string> {
    let entry = [...this.uploads.entries()].find(([, upload]) => upload.storageKey === storageKey && upload.content);
    if (!entry && this.directory) {
      const content = await readFile(this.filePath(storageKey)).catch(() => null);
      if (content) {
        const token = randomUUID();
        const upload = { storageKey, content, expiresAt: Date.now() + 5 * 60_000 };
        this.uploads.set(token, upload);
        entry = [token, upload];
      }
    }
    if (!entry) throw new Error('stored_file_not_found');
    return `/v1/development-downloads/${entry[0]}`;
  }
  async deletePrefix(storageKey: string): Promise<void> {
    [...this.uploads.entries()].filter(([, upload]) => upload.storageKey === storageKey)
      .forEach(([token]) => this.uploads.delete(token));
    if (this.directory) await rm(this.filePath(storageKey), { force: true });
  }
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
  async createDownloadUrl(storageKey: string): Promise<string> {
    const key = storageKey.replace(/^private\//, '');
    const response = await fetch(`${this.projectUrl}/storage/v1/object/sign/${this.bucket}/${key}`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify({ expiresIn: 300 })
    });
    if (!response.ok) throw new Error('storage_signing_failed');
    const payload = await response.json() as { signedURL?: string; signedUrl?: string };
    const signedPath = payload.signedURL ?? payload.signedUrl;
    if (!signedPath) throw new Error('storage_signing_failed');
    return new URL(signedPath, this.projectUrl).toString();
  }
  async deletePrefix(storageKey: string): Promise<void> {
    const key = storageKey.replace(/^private\//, '');
    const response = await fetch(`${this.projectUrl}/storage/v1/object/${this.bucket}/${key}`, { method: 'DELETE', headers: this.headers() });
    if (!response.ok && response.status !== 404) throw new Error('storage_delete_failed');
  }
}
