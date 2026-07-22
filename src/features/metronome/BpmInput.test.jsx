import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BpmInput from './BpmInput';

function renderInput(value = 80) {
  const onChange = vi.fn();
  const ref = createRef();
  const view = render(<BpmInput ref={ref} value={value} onChange={onChange} ariaLabel="BPM do teste" />);
  return { ...view, input: screen.getByRole('spinbutton', { name: 'BPM do teste' }), onChange, ref };
}

describe('BpmInput', () => {
  test('seleciona no foco, digita e confirma com Enter ou blur', () => {
    const { input, onChange } = renderInput();
    fireEvent.focus(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(2);
    fireEvent.change(input, { target: { value: '112' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(112);

    fireEvent.change(input, { target: { value: '96' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(96);
  });

  test('setas aplicam imediatamente e respeitam os limites', () => {
    const { input, onChange, rerender } = renderInput(80);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(81);
    rerender(<BpmInput value={220} onChange={onChange} ariaLabel="BPM do teste" />);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(220);
  });

  test('normaliza limites e restaura valor vazio ou cancelado', () => {
    const { input, onChange } = renderInput(80);
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(220);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('80');
    fireEvent.change(input, { target: { value: '120' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('80');
  });

  test('inicia uma nova entrada numérica pela referência', () => {
    const { input, ref } = renderInput();
    act(() => ref.current.startDigitEntry('9'));
    expect(input).toHaveFocus();
    expect(input).toHaveValue('9');
  });
});
