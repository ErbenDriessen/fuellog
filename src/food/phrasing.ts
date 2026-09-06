import { MetricProgress } from './targets';

// The single source of Gentle-mode language. In Gentle mode the app never shows
// a calorie or gram figure — progress is spoken as fullness and words. Exact
// mode shows the real numbers. Thresholds are fixed by the design and covered by
// phrasing.test.ts; change them there, not by feel.

export type NumbersMode = 'gentle' | 'exact';

// The word in the ring's centre for how full the day is.
export function fullnessWord(pct: number): string {
  if (pct > 0.92) return 'Well fed';
  if (pct > 0.6) return 'Nearly full';
  return 'Room to eat';
}

// The reassuring sub-line under the fullness word.
export function fullnessSub(pct: number): string {
  return pct > 0.92 ? 'nothing more needed' : 'a little room left';
}

// The word for how well a single macro is covered.
export function macroWord(pct: number): string {
  if (pct >= 0.9) return 'plenty';
  if (pct >= 0.6) return 'enough';
  return 'a bit light';
}

// A metric row's trailing text: the exact "eaten / target unit" in Exact mode,
// or the softened word in Gentle mode.
export function metricText(mode: NumbersMode, metric: MetricProgress, unit = 'g'): string {
  if (mode === 'exact') return `${metric.eaten} / ${metric.target} ${unit}`;
  return macroWord(metric.pct);
}
