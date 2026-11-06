import { describe, expect, test } from 'vitest';
import { getAllowedOrigins } from './runtimeConfig.js';

describe('runtime API configuration', () => {
  test('allows both supported local frontend ports by default', () => {
    expect(getAllowedOrigins(undefined)).toEqual([
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:4180',
      'http://localhost:4180'
    ]);
  });

  test('uses an explicit, normalized origin allowlist when configured', () => {
    expect(getAllowedOrigins(' https://app.example.test , https://staging.example.test ')).toEqual([
      'https://app.example.test',
      'https://staging.example.test'
    ]);
  });
});
