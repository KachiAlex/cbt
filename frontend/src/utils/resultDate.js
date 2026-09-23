const RESULT_DATE_FIELDS = ['completedAt', 'submittedAt', 'createdAt', 'date', 'timestamp', 'endedAt'];

const parseDate = (value) => {
  if (value == null || value === '') return null;

  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value < 1e11 ? value * 1000 : value);
  } else if (typeof value === 'string') {
    date = /^\d{9,13}$/.test(value)
      ? new Date(Number(value) < 1e11 ? Number(value) * 1000 : Number(value))
      : new Date(value);
  } else if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      try {
        date = value.toDate();
      } catch (_) {
        return null;
      }
    } else {
      const seconds = Number(value.seconds ?? value._seconds);
      const nanoseconds = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
      if (!Number.isFinite(seconds)) return null;
      date = new Date(seconds * 1000 + nanoseconds / 1e6);
    }
  }

  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
};

export const getResultDate = (result) => {
  for (const field of RESULT_DATE_FIELDS) {
    const date = parseDate(result?.[field]);
    if (date) return date;
  }
  return null;
};

export const formatResultDate = (result, includeTime = false, preferences = {}) => {
  const date = getResultDate(result);
  if (!date) return '—';
  const timeZone = preferences.timezone || undefined;
  const dateFormat = preferences.dateFormat || 'DD/MM/YYYY';
  const timeFormat = preferences.timeFormat || '24h';
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date).map(part => [part.type, part.value]));
    const formattedDate = dateFormat === 'YYYY-MM-DD'
      ? `${parts.year}-${parts.month}-${parts.day}`
      : dateFormat === 'MM/DD/YYYY'
        ? `${parts.month}/${parts.day}/${parts.year}`
        : `${parts.day}/${parts.month}/${parts.year}`;
    if (!includeTime) return formattedDate;
    const formattedTime = new Intl.DateTimeFormat('en', {
      timeZone, hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h'
    }).format(date);
    return `${formattedDate} ${formattedTime}`;
  } catch (_) {
    return includeTime ? date.toLocaleString() : date.toLocaleDateString();
  }
};
