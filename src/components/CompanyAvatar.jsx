import React from 'react';

// Per-company colour treatment, drawn from the existing Tailwind palette so
// the monograms don't clash with the dashboard's teal/pharma identity.
// When an unmapped company appears, deriveFallbackColor() picks one
// deterministically from its name so the same company always gets the
// same colour across renders + sessions.
const COMPANY_COLORS = {
  'Sun Pharma':         { bg: 'bg-teal-600',     text: 'text-white' },
  'Mankind Pharma':     { bg: 'bg-pharma-600',   text: 'text-white' },
  'Cipla':              { bg: 'bg-amber-500',    text: 'text-white' },
  'Eris Lifesciences':  { bg: 'bg-orange-500',   text: 'text-white' },
  'Alkem':              { bg: 'bg-slate-600',    text: 'text-white' },
  'Corona Remedies':    { bg: 'bg-rose-500',     text: 'text-white' },
  'Torrent Pharma':     { bg: 'bg-emerald-600',  text: 'text-white' },
  'Lupin':              { bg: 'bg-violet-500',   text: 'text-white' },
  'Aurobindo':          { bg: 'bg-indigo-500',   text: 'text-white' },
  "Dr. Reddy's":        { bg: 'bg-red-600',      text: 'text-white' },
  Intas:                { bg: 'bg-cyan-600',     text: 'text-white' },
  'Abbott India':       { bg: 'bg-blue-600',     text: 'text-white' },
  Glenmark:             { bg: 'bg-fuchsia-500',  text: 'text-white' },
  Zydus:                { bg: 'bg-sky-600',      text: 'text-white' },
};

const FALLBACK_PALETTE = [
  { bg: 'bg-teal-600',    text: 'text-white' },
  { bg: 'bg-pharma-600',  text: 'text-white' },
  { bg: 'bg-amber-500',   text: 'text-white' },
  { bg: 'bg-orange-500',  text: 'text-white' },
  { bg: 'bg-slate-600',   text: 'text-white' },
  { bg: 'bg-rose-500',    text: 'text-white' },
  { bg: 'bg-emerald-600', text: 'text-white' },
  { bg: 'bg-violet-500',  text: 'text-white' },
  { bg: 'bg-indigo-500',  text: 'text-white' },
  { bg: 'bg-cyan-600',    text: 'text-white' },
];

function deriveFallbackColor(name) {
  if (!name) return FALLBACK_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

function monogramFor(name) {
  if (!name) return '?';
  // Single uppercase letter — the colour disambiguates between companies
  // that start with the same letter (Cipla teal vs Corona rose) and the
  // full name sits right next to the avatar in every callsite.
  return name.trim().charAt(0).toUpperCase();
}

const SIZE_CLASSES = {
  xs: 'w-4 h-4 text-[9px]',
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-6 h-6 text-[11px]',
  lg: 'w-8 h-8 text-[13px]',
  xl: 'w-10 h-10 text-base',
};

// Stand-alone monogram avatar. Use directly when you want just the
// circle (e.g. inside a tight cell), or use <CompanyTag> for the
// avatar + name combo.
export function CompanyAvatar({ name, size = 'sm', className = '' }) {
  const palette = COMPANY_COLORS[name] || deriveFallbackColor(name || '');
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;
  return (
    <span
      aria-hidden="true"
      title={name}
      className={`inline-flex items-center justify-center rounded-full font-bold tracking-tight ${palette.bg} ${palette.text} ${sizeClass} shrink-0 ring-1 ring-black/5 ${className}`}
    >
      {monogramFor(name)}
    </span>
  );
}

// Compound: avatar + name in one inline-flex unit. The name truncates so
// this can drop into tight table cells without breaking layout.
export function CompanyTag({ name, size = 'sm', className = '', textClass = '' }) {
  if (!name) return <span className="text-ink-300">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <CompanyAvatar name={name} size={size} />
      <span className={`truncate ${textClass}`}>{name}</span>
    </span>
  );
}

export default CompanyAvatar;
