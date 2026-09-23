const partsAt = (date, timeZone) => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).map(part => [part.type, part.value])
);

export const zonedInputToIso = (value, timeZone = 'UTC') => {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let utc = target;
  for (let i = 0; i < 3; i++) {
    const parts = partsAt(new Date(utc), timeZone);
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const correction = target - represented;
    utc += correction;
    if (!correction) break;
  }
  const result = new Date(utc);
  if (!Number.isFinite(result.getTime())) return null;
  const check = partsAt(result, timeZone);
  if (Number(check.year) !== year || Number(check.month) !== month || Number(check.day) !== day || Number(check.hour) !== hour || Number(check.minute) !== minute) return null;
  return result.toISOString();
};

export const isoToZonedInput = (value, timeZone = 'UTC') => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = partsAt(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
