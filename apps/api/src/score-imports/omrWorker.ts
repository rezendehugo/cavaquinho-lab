export interface OmrResult {
  musicXml: string;
  pageCount: number;
  engine: string;
  engineVersion: string;
  textReport: {
    title: string | null;
    composer: string | null;
    chordCandidates: Array<{ text: string; page: number; x: number; y: number; confidence: number }>;
  };
  preprocessing?: {
    geometryNormalized: boolean;
    blankPagesRemoved: number[];
    repaired: boolean;
    grayscaleFallback?: boolean;
    pages: Array<{
      page: number;
      widthPoints: number;
      heightPoints: number;
      estimatedPixels: number;
      normalized: boolean;
      blank: boolean;
    }>;
  };
}

export interface OmrWorker {
  process(input: { importId: string; sourceUrl: string; originalName: string }): Promise<OmrResult>;
}

export class HttpOmrWorker implements OmrWorker {
  constructor(private readonly workerUrl: string, private readonly timeoutMs = 600_000) {}

  async process(input: { importId: string; sourceUrl: string; originalName: string }): Promise<OmrResult> {
    let response: Response;
    try {
      response = await fetch(`${this.workerUrl.replace(/\/$/, '')}/process`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch {
      throw new Error('omr_worker_unavailable');
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error ?? `omr_worker_${response.status}`);
    }
    return response.json() as Promise<OmrResult>;
  }
}
