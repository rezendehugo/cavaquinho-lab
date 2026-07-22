export type ScalePathRegion = 'low' | 'middle' | 'high' | 'compact' | 'custom';
export type ScalePathDirection = 'up' | 'down' | 'upDown';

export interface ScalePathPosition {
  stringIndex: number;
  fret: number;
  midi: number;
  pitchClass: number;
  note: string;
  octave: number;
  degree: number;
}

export interface ScalePath {
  id: string;
  name: string;
  root: string;
  scaleId: string;
  region: ScalePathRegion;
  start: ScalePathPosition;
  end: ScalePathPosition;
  positions: ScalePathPosition[];
  custom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
