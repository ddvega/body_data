export const HEIGHT_INCHES = 70;

export const metrics = [
  { id: 'weight', label: 'Weight', short: 'Weight', header: 'Weight (lb)', unit: 'lb', color: '#5266d5' },
  { id: 'waist', label: 'Waist at navel', short: 'Waist', header: 'Waist at navel (in)', unit: 'in', color: '#199c86' },
  { id: 'shoulders', label: 'Shoulders', short: 'Shoulders', header: 'Shoulders (in)', unit: 'in', color: '#a26ac4' },
  { id: 'arm', label: 'Right arm', short: 'Arm', header: 'Right arm (in)', unit: 'in', color: '#d28b36' },
  { id: 'forearm', label: 'Right forearm', short: 'Forearm', header: 'Right forearm (in)', unit: 'in', color: '#cb6284' },
  { id: 'quad', label: 'Right quad', short: 'Quad', header: 'Right quad (in)', unit: 'in', color: '#3a95bb' },
  { id: 'calf', label: 'Right calf', short: 'Calf', header: 'Right calf (in)', unit: 'in', color: '#8d9042' },
  { id: 'glutes', label: 'Glutes', short: 'Glutes', header: 'Glutes (in)', unit: 'in', color: '#b27b64' },
] as const;
export type MetricId = typeof metrics[number]['id'];
export type RatioId = Exclude<MetricId, 'weight'> | 'height';
export type Entry = { date: string; time: number } & Record<MetricId, number | null>;
export type Point = { time: number; date: string; value: number | null };
export const dimensions: { id: RatioId; label: string; short: string }[] = [
  ...metrics.filter(m => m.id !== 'weight'),
  { id: 'height', label: 'Height', short: 'Height' },
];
export const favorites: { a: RatioId; b: RatioId; name: string }[] = [
  { a: 'shoulders', b: 'waist', name: 'Shoulders / waist' },
  { a: 'shoulders', b: 'glutes', name: 'Shoulders / glutes' },
  { a: 'waist', b: 'glutes', name: 'Waist / glutes' },
  { a: 'quad', b: 'waist', name: 'Quad / waist' },
  { a: 'arm', b: 'waist', name: 'Arm / waist' },
  { a: 'waist', b: 'height', name: 'Waist / height' },
];
export function parseMeasurements(text: string): Entry[] {
  const records = parseDelimited(text);
  const fields = records.shift()?.map(h => h.trim()) ?? [];
  if (new Set(fields).size !== fields.length) throw new Error('CSV contains duplicate column names.');
  if (!fields.includes('Date') || !metrics.some(m => fields.includes(m.header))) {
    throw new Error('CSV needs a Date column and at least one recognized measurement column. Keep the original column names.');
  }
  const seen = new Set<string>();
  const entries = records.map((cells, i) => {
    if (cells.length !== fields.length) throw new Error(`Row ${i + 2}: expected ${fields.length} columns, found ${cells.length}. Keep a trailing comma for a blank last value.`);
    const raw = Object.fromEntries(fields.map((field, j) => [field, cells[j]]));
    const date = raw.Date?.trim() ?? '';
    const time = Date.parse(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) {
      throw new Error(`Row ${i + 2}: use a valid YYYY-MM-DD date.`);
    }
    if (seen.has(date)) throw new Error(`Row ${i + 2}: duplicate date ${date}. Use one check-in per date.`);
    seen.add(date);
    const entry = { date, time } as Entry;
    for (const m of metrics) {
      const value = raw[m.header]?.trim();
      if (!value) entry[m.id] = null;
      else {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) throw new Error(`Row ${i + 2}: ${m.header} must be a positive number or blank.`);
        entry[m.id] = n;
      }
    }
    if (metrics.every(m => entry[m.id] === null)) throw new Error(`Row ${i + 2}: add at least one measurement.`);
    return entry;
  });
  if (!entries.length) throw new Error('Add at least one measurement row to the CSV.');
  return entries.sort((a, b) => a.time - b.time);
}

// CSV/TSV reader with quoted fields, CRLF, escaped quotes, and UTF-8 BOM support.
function parseDelimited(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '').replace(/^[\r\n]+|[\r\n]+$/g, '');
  const delimiter = text.slice(0, text.indexOf('\n') < 0 ? undefined : text.indexOf('\n')).includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false, closedQuote = false;
  const finishField = () => { row.push(field); field = ''; closedQuote = false; };
  const finishRow = () => { finishField(); if (row.some(v => v.trim())) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closedQuote = true; }
      else field += c;
    } else if (c === delimiter) finishField();
    else if (c === '\n' || c === '\r') { finishRow(); if (c === '\r' && text[i + 1] === '\n') i++; }
    else if (c === '"' && field === '' && !closedQuote) quoted = true;
    else if (closedQuote && c.trim()) throw new Error('CSV contains text after a closing quote.');
    else if (c === '"') throw new Error('CSV contains an unexpected quote.');
    else if (!closedQuote) field += c;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  finishRow();
  return rows;
}
export function points(rows: Entry[], key: MetricId): Point[] {
  return rows.map(r => ({ time: r.time, date: r.date, value: r[key] }));
}
export function ratioPoints(rows: Entry[], a: RatioId, b: RatioId): Point[] {
  const get = (r: Entry, id: RatioId) => id === 'height' ? HEIGHT_INCHES : r[id];
  return rows.map(r => {
    const top = get(r, a), bottom = get(r, b);
    return { time: r.time, date: r.date, value: top !== null && bottom !== null && bottom > 0 ? top / bottom : null };
  });
}
export function summarize(series: Point[]) {
  const available = series.filter((p): p is Point & { value: number } => p.value !== null);
  if (!available.length) return null;
  const first = available[0], last = available[available.length - 1];
  const delta = last.value - first.value;
  const days = (last.time - first.time) / 86400000;
  return { first, last, delta, pct: delta / first.value * 100, weekly: days > 0 ? delta / days * 7 : null, count: available.length };
}
export function normalized(series: Point[]): Point[] {
  const first = series.find(p => p.value !== null)?.value;
  return series.map(p => ({ ...p, value: first != null && p.value !== null ? (p.value / first - 1) * 100 : null }));
}
export const fmt = (v: number | null | undefined, digits = 2) => v == null ? '—' : v.toLocaleString('en-US', { maximumFractionDigits: digits });
export const signed = (v: number | null | undefined, digits = 2) => v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v), digits)}`;
export const shortDate = (v: string | number) => new Date(typeof v === 'string' ? `${v}T00:00:00Z` : v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const longDate = (v: string) => new Date(`${v}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
