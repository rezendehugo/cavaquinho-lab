import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import useSequenceStudy, { loadSequenceStudy } from './useSequenceStudy';

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
it('keeps drafts separate per sequence and records a snapshot that survives reload', () => {
  const { result, rerender } = renderHook(({ id }) => useSequenceStudy(id), { initialProps: { id: 'a' } });
  act(() => result.current.update('intention', 'Trocar no pulso'));
  act(() => result.current.update('observation', 'A troca ficou limpa'));
  act(() => result.current.record(72));
  rerender({ id: 'b' });
  expect(result.current.study.intention).toBe('');
  act(() => result.current.update('intention', 'Ouvir a terça'));
  rerender({ id: 'a' });
  expect(result.current.study.intention).toBe('Trocar no pulso');
  expect(loadSequenceStudy('a').sessions[0]).toMatchObject({ bpm: 72, observation: 'A troca ficou limpa' });
});
it('reports storage failure while retaining notes for export', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const { result } = renderHook(() => useSequenceStudy('a'));
  act(() => result.current.update('intention', 'Não perder esta anotação'));
  expect(result.current.study.intention).toBe('Não perder esta anotação');
  expect(result.current.status).toContain('Não foi possível salvar');
});
