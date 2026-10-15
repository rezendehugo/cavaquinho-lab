import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePullRequest } from './validate-pr-evidence.mjs';

const completeBody = `## Issue vinculada
Fecha #70

## Tipo de mudança
bug

## Plano de execução
1. Reproduzir.

## Resultado esperado
O erro não se repete.

## Evidências de teste e validação
Teste de regressão e edge case passaram.`;

test('aceita correção com issue, plano, resultado e teste no diff', () => {
  assert.deepEqual(validatePullRequest({ body: completeBody, baseRef: 'hml', changedFiles: ['src/domain/chords.js', 'src/domain/chords.test.js'] }), []);
});

test('reprova mudança de produto sem teste relacionado', () => {
  assert.match(validatePullRequest({ body: completeBody, baseRef: 'hml', changedFiles: ['src/domain/chords.js'] }).join('\n'), /sem teste relacionado/);
});

test('exige evidência de HML ao promover para main', () => {
  assert.match(validatePullRequest({ body: completeBody, baseRef: 'main', changedFiles: ['src/domain/chords.js', 'src/domain/chords.test.js'] }).join('\n'), /Evidências de HML/);
});
