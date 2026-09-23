import { isoToZonedInput, zonedInputToIso } from './timeZone';

describe('exam date-time timezone conversion', () => {
  test('round-trips a Lagos local time through UTC', () => {
    const iso = zonedInputToIso('2026-01-15T12:30', 'Africa/Lagos');
    expect(iso).toBe('2026-01-15T11:30:00.000Z');
    expect(isoToZonedInput(iso, 'Africa/Lagos')).toBe('2026-01-15T12:30');
  });

  test('rejects invalid and nonexistent local times', () => {
    expect(zonedInputToIso('bad', 'UTC')).toBeNull();
    expect(zonedInputToIso('2026-03-08T02:30', 'America/New_York')).toBeNull();
  });
});
