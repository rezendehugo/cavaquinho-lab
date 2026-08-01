import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ScoreImportPage from './ScoreImportPage';
import {
  createScorePractice, getScoreSourceUrl, importMusicXml, updateScoreMeasure, uploadScore, validateScoreImport
} from '../services/scoreImports';

vi.mock('../components/ScorePreview', () => ({ default: () => <div aria-label="Prévia reconhecida" /> }));
vi.mock('../services/scoreImports', () => ({
  createScorePractice: vi.fn(),
  deleteScoreImport: vi.fn(),
  getScoreImport: vi.fn(),
  getScoreSourceUrl: vi.fn(),
  importMusicXml: vi.fn(),
  retryScoreImport: vi.fn(),
  updateScoreMeasure: vi.fn(),
  uploadScore: vi.fn(),
  validateScoreImport: vi.fn(),
  waitForScoreImport: vi.fn()
}));

const confidentMeasure = {
  number: 1, divisions: 1, expectedTicks: 4, issues: [],
  chords: [{ id: crypto.randomUUID(), offsetTicks: 0, symbol: 'C', confidence: 1, alternatives: [] }],
  events: [{ id: crypto.randomUUID(), offsetTicks: 0, durationTicks: 4, pitch: { step: 'C', alter: 0, octave: 4 }, rest: false, tie: null, confidence: 1, alternatives: [] }]
};
const uncertainMeasure = {
  ...confidentMeasure, number: 2,
  chords: [{ ...confidentMeasure.chords[0], id: crypto.randomUUID(), symbol: 'G7', confidence: .62 }],
  events: [{ ...confidentMeasure.events[0], id: crypto.randomUUID(), confidence: .7 }]
};
const imported = {
  item: { id: 'import-1', status: 'draft', sourceType: 'musicxml', pageCount: 0 },
  draft: {
    id: 'draft-1', importId: 'import-1', ownerId: 'owner', title: 'Estudo',
    composer: null, revision: 1, meter: { beats: 4, beatType: 4 }, tempo: 80,
    measures: [confidentMeasure, uncertainMeasure], sections: [], sourceMusicXml: '<score-partwise/>'
  }
};

describe('fluxo guiado de importação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  test('apresenta upload principal e valida o arquivo antes de enviar', async () => {
    render(<ScoreImportPage embedded />);
    expect(screen.getByText('Transforme uma partitura em prática')).toBeInTheDocument();
    expect(screen.getByLabelText('Progresso da importação')).toHaveTextContent('Enviar');
    expect(screen.getByLabelText('Progresso da importação')).toHaveTextContent('Praticar');
    const invalid = new File(['texto'], 'partitura.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Escolher PDF, MusicXML ou MXL'), { target: { files: [invalid] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha um arquivo PDF, MusicXML ou MXL');
  });

  test('prioriza medidas incertas e mantém as confiáveis recolhidas', async () => {
    importMusicXml.mockResolvedValue(imported);
    render(<ScoreImportPage embedded />);
    const file = new File(['<score-partwise/>'], 'estudo.musicxml', { type: 'application/vnd.recordare.musicxml+xml' });
    fireEvent.change(screen.getByLabelText('Escolher PDF, MusicXML ou MXL'), { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar partitura' }));
    expect(await screen.findByText('1 medidas precisam de revisão')).toBeInTheDocument();
    const confident = screen.getByRole('button', { name: /Medida 1/ });
    const uncertain = screen.getByRole('button', { name: /Medida 2/ });
    expect(confident).toHaveAttribute('aria-expanded', 'false');
    expect(uncertain).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Validar e criar prática' })).toBeEnabled();
  });

  test('mostra o resultado e abre diretamente a prática criada', async () => {
    importMusicXml.mockResolvedValue({ ...imported, draft: { ...imported.draft, measures: [confidentMeasure] } });
    validateScoreImport.mockResolvedValue({ ...imported.item, status: 'ready' });
    createScorePractice.mockResolvedValue({
      melody: { id: 'solo-importado', title: 'Estudo', ticksPerQuarter: 1, meter: imported.draft.meter, tempo: 80, events: [] }
    });
    updateScoreMeasure.mockResolvedValue(imported.draft);
    const openPractice = vi.fn();
    render(<ScoreImportPage embedded onOpenPractice={openPractice} />);
    const file = new File(['<score-partwise/>'], 'estudo.musicxml', { type: 'application/vnd.recordare.musicxml+xml' });
    fireEvent.change(screen.getByLabelText('Escolher PDF, MusicXML ou MXL'), { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar partitura' }));
    await screen.findByText('Todas as medidas estão confiáveis');
    const targets = screen.getByLabelText('Práticas a criar');
    fireEvent.click(within(targets).getByText('Sequência de acordes'));
    fireEvent.click(screen.getByRole('button', { name: 'Validar e criar prática' }));
    expect(await screen.findByText('Sua prática está pronta')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Praticar solo' }));
    await waitFor(() => expect(openPractice).toHaveBeenCalledWith('solo', 'solo-importado'));
  });

  test('diferencia indisponibilidade da API de uma falha musical do worker', async () => {
    uploadScore.mockRejectedValue(new Error('api_unavailable'));
    render(<ScoreImportPage embedded />);
    const file = new File(['%PDF-conteúdo'], 'nivaldo.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Escolher PDF, MusicXML ou MXL'), { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar partitura' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A API de importação está indisponível');
    expect(screen.getByRole('alert')).toHaveTextContent('Inicie o backend local');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para etapa Enviar' }));
    expect(await screen.findByText('Transforme uma partitura em prática')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escolher arquivo' })).toBeInTheDocument();
    expect(sessionStorage.getItem('cavaquinhoLabActiveScoreImport')).toBeNull();
  });

  test('explica quando o navegador bloqueia somente o transporte do upload', async () => {
    uploadScore.mockRejectedValue(new Error('upload_transport_blocked'));
    render(<ScoreImportPage embedded />);
    const file = new File(['%PDF-conteúdo'], 'nivaldo.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Escolher PDF, MusicXML ou MXL'), { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar partitura' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('O navegador bloqueou o envio do arquivo');
    expect(screen.getByRole('alert')).toHaveTextContent('configuração CORS da API');
  });

  test('mantém a revisão disponível quando somente a prévia privada expira', async () => {
    importMusicXml.mockResolvedValue({
      ...imported,
      item: { ...imported.item, sourceType: 'pdf', pageCount: 2 }
    });
    getScoreSourceUrl.mockRejectedValue(new Error('stored_file_not_found'));
    render(<ScoreImportPage embedded />);
    const file = new File(['<score-partwise/>'], 'nivaldo.musicxml', { type: 'application/vnd.recordare.musicxml+xml' });
    fireEvent.change(screen.getByLabelText('Escolher PDF, MusicXML ou MXL'), { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar partitura' }));
    expect(await screen.findByText('Estudo')).toBeInTheDocument();
    expect(screen.getByText(/prévia do PDF original não está disponível/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Validar e criar prática' })).toBeEnabled();
  });
});
