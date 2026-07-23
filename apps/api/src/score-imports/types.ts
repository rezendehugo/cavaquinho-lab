export type ImportSourceType = 'musicxml' | 'pdf';
export type ImportStatus = 'uploaded' | 'queued' | 'processing' | 'draft' | 'needs_correction' | 'ready' | 'failed';
export type IssueSeverity = 'warning' | 'critical';

export interface ScoreIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  eventId?: string;
}

export interface Pitch {
  step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  alter: -2 | -1 | 0 | 1 | 2;
  octave: number;
}

export interface ScoreEvent {
  id: string;
  offsetTicks: number;
  durationTicks: number;
  pitch: Pitch | null;
  rest: boolean;
  tie: 'start' | 'stop' | null;
  confidence: number;
  alternatives: Pitch[];
}

export interface ChordEvent {
  id: string;
  offsetTicks: number;
  symbol: string;
  confidence: number;
  alternatives: string[];
}

export interface ScoreMeasure {
  number: number;
  divisions: number;
  expectedTicks: number;
  events: ScoreEvent[];
  chords: ChordEvent[];
  issues: ScoreIssue[];
}

export interface ScoreDraft {
  id: string;
  importId: string;
  ownerId: string;
  title: string;
  composer: string | null;
  tempo: number;
  meter: { beats: number; beatType: number };
  revision: number;
  measures: ScoreMeasure[];
  createdAt: string;
  updatedAt: string;
}

export interface ScoreImport {
  id: string;
  ownerId: string;
  sourceType: ImportSourceType;
  status: ImportStatus;
  originalName: string;
  storageKey: string;
  sha256: string;
  pageCount: number | null;
  pipelineVersion: string;
  attemptCount: number;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportJob {
  id: string;
  importId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  availableAt: string;
  lockedAt: string | null;
  attemptCount: number;
  createdAt: string;
}

export interface MelodyExercise {
  id: string;
  ownerId: string;
  sourceImportId: string;
  title: string;
  ticksPerQuarter: number;
  meter: { beats: number; beatType: number };
  tempo: number;
  events: Array<ScoreEvent & {
    measure: number;
    suggestedPosition: { stringIndex: number; fret: number; midi: number } | null;
    selectedPosition: { stringIndex: number; fret: number; midi: number } | null;
  }>;
  createdAt: string;
}

export interface PracticeArtifacts {
  sequence?: {
    id: string;
    title: string;
    sourceImportId: string;
    steps: Array<{ id: string; symbol: string; measure: number; offsetTicks: number }>;
  };
  melody?: MelodyExercise;
}
