import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App.jsx';

const renderAt = (hash = '#/cavaquinho/sequences') => {
  window.localStorage.clear();
  window.location.hash = hash;
  return render(<App />);
};

describe('Cavaquinho Lab', () => {
  test('abre a rota de sequências com texto em português', () => {
    renderAt();
    expect(screen.getByRole('link', { name: 'Sequências' })).toHaveClass('active');
    expect(screen.getByText('Construtor de Sequência')).toBeInTheDocument();
    expect(screen.getByText('Otimizador de Formas')).toBeInTheDocument();
    expect(screen.getByText('Painel de Teoria')).toBeInTheDocument();
    expect(screen.getByText('Painel de Exercícios')).toBeInTheDocument();
    expect(screen.getByText('Painel de Harmonia em Cores')).toBeInTheDocument();
  });

  test('reordena acordes usando apenas setas visíveis', () => {
    renderAt();
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('Ebmaj7→D7→Gm');
    fireEvent.click(screen.getByLabelText('Mover acorde 2 para cima'));
    expect(screen.getByLabelText('Sequência atual')).toHaveTextContent('D7→Ebmaj7→Gm');
    expect(screen.getByLabelText('Acordes da sequência')).toHaveTextContent('D7');
    expect(screen.getByLabelText('Mover acorde 1 para cima')).toBeDisabled();
  });

  test('navega formas manualmente e volta para Automático', () => {
    renderAt();
    const firstCard = screen.getAllByText(/Automático · Posição/)[0].closest('article');
    fireEvent.click(within(firstCard).getByLabelText('Próxima forma do acorde 1'));
    expect(firstCard).toHaveTextContent('Manual · Posição');
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequence'))[0].positionIndex).not.toBe(null);
    fireEvent.click(within(firstCard).getByRole('button', { name: 'Automático' }));
    expect(JSON.parse(window.localStorage.getItem('cavaquinhoLabSequence'))[0].positionIndex).toBe(null);
  });

  test('mostra formas e linha de cores', () => {
    renderAt('#/cavaquinho/shapes');
    expect(screen.getByText('Formas de acorde')).toBeInTheDocument();
    window.location.hash = '#/cavaquinho/sequences';
    fireEvent(window, new HashChangeEvent('hashchange'));
    expect(screen.getByLabelText('Modo de cor')).toHaveValue('graus');
    expect(screen.getByLabelText('Linha de cores da sequência')).toHaveTextContent('Ebmaj7');
  });

  test('inclui rótulos acessíveis em português', () => {
    renderAt();
    expect(screen.getByLabelText('Acordes da sequência')).toBeInTheDocument();
    expect(screen.getByLabelText('Mover acorde 1 para baixo')).toBeInTheDocument();
    expect(screen.getByLabelText('Raiz do acorde 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Qualidade do acorde 1')).toBeInTheDocument();
    expect(screen.queryByText('Baixo')).not.toBeInTheDocument();
  });
});