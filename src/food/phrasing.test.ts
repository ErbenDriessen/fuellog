import { fullnessWord, fullnessSub, macroWord, metricText } from './phrasing';
import { MetricProgress } from './targets';

function m(eaten: number, target: number): MetricProgress {
  const pct = target > 0 ? Math.min(Math.max(eaten / target, 0), 1) : 0;
  return { eaten, target, remaining: target - eaten, pct };
}

describe('fullnessWord', () => {
  it('reads "Well fed" only above 0.92', () => {
    expect(fullnessWord(0.93)).toBe('Well fed');
    expect(fullnessWord(1)).toBe('Well fed');
    expect(fullnessWord(0.92)).toBe('Nearly full');
  });
  it('reads "Nearly full" above 0.6 up to 0.92', () => {
    expect(fullnessWord(0.61)).toBe('Nearly full');
    expect(fullnessWord(0.6)).toBe('Room to eat');
  });
  it('reads "Room to eat" at or below 0.6', () => {
    expect(fullnessWord(0.3)).toBe('Room to eat');
    expect(fullnessWord(0)).toBe('Room to eat');
  });
});

describe('fullnessSub', () => {
  it('says nothing more is needed once well fed', () => {
    expect(fullnessSub(0.93)).toBe('nothing more needed');
  });
  it('otherwise notes a little room left', () => {
    expect(fullnessSub(0.92)).toBe('a little room left');
    expect(fullnessSub(0)).toBe('a little room left');
  });
});

describe('macroWord', () => {
  it('is "plenty" at or above 0.9', () => {
    expect(macroWord(0.9)).toBe('plenty');
    expect(macroWord(1)).toBe('plenty');
  });
  it('is "enough" from 0.6 up to 0.9', () => {
    expect(macroWord(0.89)).toBe('enough');
    expect(macroWord(0.6)).toBe('enough');
  });
  it('is "a bit light" below 0.6', () => {
    expect(macroWord(0.59)).toBe('a bit light');
    expect(macroWord(0)).toBe('a bit light');
  });
});

describe('metricText', () => {
  it('shows the exact eaten / target with a unit in Exact mode', () => {
    expect(metricText('exact', m(96, 120))).toBe('96 / 120 g');
    expect(metricText('exact', m(96, 120), 'g')).toBe('96 / 120 g');
  });
  it('shows a word in Gentle mode', () => {
    expect(metricText('gentle', m(110, 120))).toBe('plenty');
    expect(metricText('gentle', m(72, 120))).toBe('enough');
    expect(metricText('gentle', m(20, 120))).toBe('a bit light');
  });
});
