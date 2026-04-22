export const fmtINR = (v) => {
  if (v === null || v === undefined || isNaN(Number(v))) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(2)}K Cr`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
};

export const fmtINRPlain = (v) => {
  if (v === null || v === undefined || isNaN(Number(v))) return '—';
  return `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
};

export const fmtPct = (v) => {
  if (v === null || v === undefined || isNaN(Number(v))) return '—';
  const n = Number(v);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
};

export const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
};

export const median = (arr) => {
  const a = [...arr].filter((x) => typeof x === 'number' && !isNaN(x)).sort((x, y) => x - y);
  if (!a.length) return 0;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 !== 0 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};

export const avg = (arr) => {
  const a = arr.filter((x) => typeof x === 'number' && !isNaN(x));
  if (!a.length) return 0;
  return a.reduce((s, v) => s + v, 0) / a.length;
};

export const sum = (arr) => arr.reduce((s, v) => s + (Number(v) || 0), 0);

export const countBy = (rows, key) => {
  const m = new Map();
  rows.forEach((r) => {
    const k = r[key] ?? '—';
    m.set(k, (m.get(k) || 0) + 1);
  });
  return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
};

export const sumBy = (rows, groupKey, valKey) => {
  const m = new Map();
  rows.forEach((r) => {
    const k = r[groupKey] ?? '—';
    m.set(k, (m.get(k) || 0) + (Number(r[valKey]) || 0));
  });
  return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
};

export const uniqueValues = (rows, key) =>
  Array.from(new Set(rows.map((r) => r[key]).filter((v) => v !== undefined && v !== null))).sort();
