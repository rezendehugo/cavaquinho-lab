import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import SequencePdfExport from './SequencePdfExport';
import { createSequencePdf } from '../domain/sequencePdf';

vi.mock('../domain/sequencePdf', () => ({ createSequencePdf: vi.fn(), sequencePdfFileName: () => 'meu-mapa.pdf' }));
const sequence = { title: 'Meu mapa', practiceBpm: 60, steps: [{ key: 'C', suffix: 'major' }] };
beforeEach(() => vi.clearAllMocks());
it('disables export until there is a chord', () => {
  render(<SequencePdfExport sequence={{ ...sequence, steps: [] }} />);
  expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeDisabled();
});
it('downloads the selected content with the current practice tempo and journal', async () => {
  const save = vi.fn(); createSequencePdf.mockResolvedValue({ save });
  const study = { intention: 'Ouvir a terça' };
  render(<SequencePdfExport sequence={sequence} study={study} bpm={72} />);
  fireEvent.change(screen.getByLabelText('Conteúdo do PDF'), { target: { value: 'map' } });
  fireEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('meu-mapa.pdf'));
  expect(createSequencePdf).toHaveBeenCalledWith({ ...sequence, practiceBpm: 72 }, { kind: 'map', study, resolvedSteps: undefined });
  expect(screen.getByRole('status')).toHaveTextContent('PDF pronto');
});
it('offers retry after a generation failure', async () => {
  createSequencePdf.mockRejectedValue(new Error('failed'));
  render(<SequencePdfExport sequence={sequence} />);
  fireEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Não foi possível gerar'));
  expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeEnabled();
});
