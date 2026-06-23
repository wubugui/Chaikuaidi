const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** 大数格式化：1234 -> 1.23K，1e9 -> 1.00B */
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return Number.isInteger(n) ? String(n) : n.toFixed(1);
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < UNITS.length) {
    const scaled = n / Math.pow(1000, tier);
    return scaled.toFixed(2) + UNITS[tier];
  }
  return n.toExponential(2);
}

/** 钱：带 ¥ */
export function money(n: number): string {
  return '¥' + fmt(n);
}

export function fmtInt(n: number): string {
  return Math.floor(n).toLocaleString('en-US');
}
