import { todayISO } from './date';

describe('todayISO', () => {
  it('formats a fixed local date as YYYY-MM-DD, zero-padding single digits', () => {
    expect(todayISO(new Date(2026, 6, 6, 23, 30))).toBe('2026-07-06');
  });

  it('zero-pads a single-digit month and day', () => {
    expect(todayISO(new Date(2026, 0, 4, 0, 0))).toBe('2026-01-04');
  });
});
