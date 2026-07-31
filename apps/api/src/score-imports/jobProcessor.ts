import type { PrivateStorage } from '../storage.js';
import type { ScoreImportRepository } from './repository.js';
import type { OmrWorker } from './omrWorker.js';
import { ScoreImportService } from './service.js';

const STALE_JOB_MS = 12 * 60_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 5_000;
const NON_RETRYABLE_ERRORS = new Set([
  'encrypted_pdf', 'invalid_pdf_signature', 'pdf_page_limit', 'pdf_size_limit',
  'no_musical_content', 'no_musical_systems', 'musicxml_empty', 'musicxml_invalid',
  'unsupported_polyphonic_score', 'score_measure_limit', 'audiveris_export_failed',
  'image_too_large', 'mxl_member_limit', 'mxl_size_limit', 'encrypted_mxl', 'invalid_mxl_path'
]);

export class ScoreImportJobProcessor {
  private timer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    private readonly repository: ScoreImportRepository,
    private readonly storage: PrivateStorage,
    private readonly worker: OmrWorker,
    private readonly service: ScoreImportService,
    private readonly publicApiUrl: string
  ) {}

  start(intervalMs = 2_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
    void this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<boolean> {
    if (this.processing) return false;
    this.processing = true;
    try {
      const timestamp = new Date();
      const staleBefore = new Date(timestamp.getTime() - STALE_JOB_MS).toISOString();
      const job = await this.repository.claimNextJob(timestamp.toISOString(), staleBefore);
      if (!job) return false;
      const item = await this.repository.getImport(job.importId);
      if (!item) {
        await this.repository.finishJob(job.id, 'failed', 'score_import_not_found');
        return true;
      }
      try {
        await this.service.markProcessing(item.id);
        const storedUrl = await this.storage.createDownloadUrl(item.storageKey);
        const sourceUrl = new URL(storedUrl, this.publicApiUrl).toString();
        const result = await this.worker.process({ importId: item.id, sourceUrl, originalName: item.originalName });
        await this.service.completeOmr(item.id, result);
        await this.repository.finishJob(job.id, 'completed');
      } catch (error) {
        const code = error instanceof Error ? error.message.slice(0, 120) : 'omr_failure';
        if (job.attemptCount < MAX_ATTEMPTS && !NON_RETRYABLE_ERRORS.has(code)) {
          const retryAt = new Date(Date.now() + RETRY_BASE_MS * (2 ** (job.attemptCount - 1))).toISOString();
          await this.service.requeueImport(item.id, code);
          await this.repository.rescheduleJob(job.id, retryAt, code);
        } else {
          await this.service.failImport(item.id, code);
          await this.repository.finishJob(job.id, 'failed', code);
        }
      }
      return true;
    } finally {
      this.processing = false;
    }
  }
}
