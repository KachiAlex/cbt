import { formatResultDate, getResultDate } from './resultDate';

describe('result date formatting', () => {
  test('falls back from an invalid completedAt to submittedAt', () => {
    const result = {
      completedAt: 'not a date',
      submittedAt: '2026-09-22T12:00:00.000Z'
    };

    expect(getResultDate(result)?.toISOString()).toBe('2026-09-22T12:00:00.000Z');
    expect(formatResultDate(result)).not.toBe('—');
  });

  test('supports serialized second-based timestamps', () => {
    expect(getResultDate({ timestamp: { _seconds: 1000, _nanoseconds: 0 } })?.getTime()).toBe(1000000);
    expect(getResultDate({ submittedAt: 1000 })?.getTime()).toBe(1000000);
  });

  test('shows a placeholder when no valid date exists', () => {
    expect(formatResultDate({ completedAt: 'invalid', submittedAt: null })).toBe('—');
  });
});
