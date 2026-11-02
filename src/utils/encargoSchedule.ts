export const ENCARGO_TIME_ZONE = 'America/Mexico_City';

type LocalParts = { year: number; month: number; day: number; hour: number; weekday: string };

function localParts(value: Date | string): LocalParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ENCARGO_TIME_ZONE,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    weekday: 'short',
  });
  const parts: Record<string, string> = {};
  formatter.formatToParts(new Date(value)).forEach(part => {
    if (part.type !== 'literal') parts[part.type] = part.value;
  });
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour) % 24, weekday: parts.weekday,
  };
}

function dateKey(value: Date | string) {
  const p = localParts(value);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function canCreateEncargo(now = new Date()) {
  return localParts(now).hour < 22;
}

export function canCancelEncargo(createdAt: string, now = new Date()) {
  if (!createdAt || Number.isNaN(new Date(createdAt).getTime())) return false;
  return dateKey(createdAt) === dateKey(now) && localParts(now).hour < 21;
}

export function estimatedArrivalDate(now = new Date()) {
  const p = localParts(now);
  const days = p.weekday === 'Sat' ? 2 : 1;
  const result = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return [result.getUTCFullYear(), String(result.getUTCMonth() + 1).padStart(2, '0'), String(result.getUTCDate()).padStart(2, '0')].join('-');
}

export function formatEstimatedArrival(value: string) {
  return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${value}T12:00:00.000Z`));
}
