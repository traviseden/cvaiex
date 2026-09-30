export function createTourState(count) {
  if (!Number.isInteger(count) || count < 1) throw new Error('A tour needs at least one stop');
  const state = { index: -1, phase: 'idle' };
  return {
    state,
    get active() { return state.phase !== 'idle'; },
    get canEnter() { return state.phase === 'stop'; },
    go(index) { if (!Number.isInteger(index) || index < 0 || index >= count) throw new Error('Tour stop is out of range'); state.index = index; state.phase = 'flying'; },
    arrive() { if (state.phase === 'flying') state.phase = 'stop'; },
    pause() { if (state.phase === 'flying') state.phase = 'held'; },
    resume() { if (state.phase === 'held') state.phase = 'flying'; },
    end() { state.index = -1; state.phase = 'idle'; },
  };
}
