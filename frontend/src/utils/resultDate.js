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

export const formatResultDate = (result, includeTime = false) => {
  const date = getResultDate(result);
  if (!date) return '—';
  return date.toLocaleString(undefined, includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' });
};
