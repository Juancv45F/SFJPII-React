// Equivalentes a los pipes de Angular (number, currency, date) usados en las plantillas.

export const money = (n: any) => `$${Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

export const discounted = (p: any) =>
  Number(p?.descuento) > 0 ? Number(p.precio) * (1 - Number(p.descuento) / 100) : Number(p?.precio || 0);

const pad = (n: number) => String(n).padStart(2, '0');

export function dateTime(value: any) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function mediumDate(value: any) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function medium(value: any) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${mediumDate(d)}, ${d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`;
}

export function shortTime(value: any) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
}

export function short(value: any) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}, ${shortTime(d)}`;
}
