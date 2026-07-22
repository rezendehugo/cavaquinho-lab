import { createContext, useContext } from 'react';
import { useMetronome } from './useMetronome';

const MetronomeContext = createContext(null);

export function MetronomeProvider({ children }) {
  const metronome = useMetronome();
  return <MetronomeContext.Provider value={metronome}>{children}</MetronomeContext.Provider>;
}

export function useSharedMetronome() {
  const metronome = useContext(MetronomeContext);
  if (!metronome) throw new Error('useSharedMetronome precisa de MetronomeProvider.');
  return metronome;
}
