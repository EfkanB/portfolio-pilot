// Literal class strings (Tailwind only generates classes it can see in source).
export const TONES = {
  violet: { text: 'text-violet', soft: 'bg-violet-soft', dot: 'bg-violet', ring: 'ring-violet/40', border: 'border-violet/40' },
  cyan: { text: 'text-cyan', soft: 'bg-cyan-soft', dot: 'bg-cyan', ring: 'ring-cyan/40', border: 'border-cyan/40' },
  amber: { text: 'text-amber', soft: 'bg-amber-soft', dot: 'bg-amber', ring: 'ring-amber/40', border: 'border-amber/40' },
  pink: { text: 'text-pink', soft: 'bg-pink-soft', dot: 'bg-pink', ring: 'ring-pink/40', border: 'border-pink/40' },
}

export const MARKET_CATEGORIES = [
  { id: 'equity', label: 'Hisse senedi', tone: 'violet', codes: ['MAC', 'TTE', 'IIH', 'TI2', 'DZE', 'TAU', 'OPI', 'ST1'] },
  { id: 'global', label: 'Yabancı & teknoloji', tone: 'cyan', codes: ['AFT', 'YAY', 'IJC', 'AES', 'TGE'] },
  { id: 'gold', label: 'Altın & emtia', tone: 'amber', codes: ['KZL', 'GTA', 'YZG'] },
  { id: 'debt', label: 'Borçlanma & para piyasası', tone: 'pink', codes: ['PPN', 'NJR', 'IPV', 'ZPF'] },
]

export const ALL_MARKET_CODES = MARKET_CATEGORIES.flatMap((category) => category.codes)

const CATEGORY_BY_CODE = new Map(MARKET_CATEGORIES.flatMap((category) => category.codes.map((code) => [code, category])))

export function categoryOf(code) {
  return CATEGORY_BY_CODE.get(code)
}
