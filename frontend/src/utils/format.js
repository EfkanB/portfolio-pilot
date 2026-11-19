const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// TEFAS unit prices often have 6 decimals; show them instead of rounding to 2.
const priceFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

const quantityFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 4,
})

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export const formatCurrency = (value) => `₺${currencyFormatter.format(Number(value) || 0)}`
export const formatPrice = (value) => `₺${priceFormatter.format(Number(value) || 0)}`
export const formatQuantity = (value) => quantityFormatter.format(Number(value) || 0)
export const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : '-')

export function formatSignedCurrency(value) {
  const number = Number(value) || 0
  return `${number > 0 ? '+' : number < 0 ? '−' : ''}${formatCurrency(Math.abs(number))}`
}

export const profitClass = (value) => {
  const number = Number(value) || 0
  return number > 0 ? 'text-gain' : number < 0 ? 'text-loss' : 'text-muted'
}

const KEEP_UPPER = new Set(['BIST', 'TL', 'BYF', 'PYŞ', 'ABD', 'ETF', 'II', 'III', 'IV'])

/** TEFAS names arrive in ALL CAPS; Turkish-aware title case reads far better in a table. */
export function prettyFundName(name = '') {
  return name
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map((word) => {
      const upper = word.toLocaleUpperCase('tr-TR')
      if (KEEP_UPPER.has(upper.replace(/[()]/g, ''))) return upper
      const first = word.startsWith('(') ? 1 : 0
      return word.slice(0, first) + word.charAt(first).toLocaleUpperCase('tr-TR') + word.slice(first + 1)
    })
    .join(' ')
}
