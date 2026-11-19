// Shared class strings so every surface uses the same radius, border and type scale.
export const panelClass = 'rounded-xl border border-line bg-surface p-5 sm:p-6'

export const panelTitleClass = 'flex items-center gap-2 text-base font-semibold text-ink'
export const panelHintClass = 'mt-1 text-sm text-muted'

export const inputClass =
  'block w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus/20 aria-[invalid=true]:border-loss'

export const labelClass = 'mb-1.5 block text-sm font-medium text-ink-soft'

const buttonBase =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

export const primaryButtonClass = `${buttonBase} bg-accent font-semibold text-on-accent hover:bg-accent-hover`
export const secondaryButtonClass = `${buttonBase} border border-line-strong bg-surface text-ink hover:bg-sunken`
export const ghostButtonClass = `${buttonBase} text-ink-soft hover:bg-sunken hover:text-ink`
export const buyButtonClass = `${buttonBase} bg-gain font-semibold text-[oklch(0.17_0.04_150)] hover:brightness-110`
export const sellButtonClass = `${buttonBase} bg-loss font-semibold text-[oklch(0.15_0.04_22)] hover:brightness-110`
export const dangerButtonClass = `${buttonBase} border border-loss/40 text-loss hover:bg-loss-soft`

export const tableHeadClass = 'border-b border-line text-left text-xs font-medium text-muted'
export const thClass = 'px-3 py-2.5 font-medium first:pl-0 last:pr-0'
export const tdClass = 'px-3 py-3 first:pl-0 last:pr-0'

// Categorical palette tuned for the dark surface: similar lightness, distinct hues.
export const CHART_COLORS = [
  'oklch(0.78 0.085 265)',
  'oklch(0.76 0.12 165)',
  'oklch(0.82 0.12 85)',
  'oklch(0.72 0.13 25)',
  'oklch(0.74 0.11 310)',
  'oklch(0.78 0.09 210)',
  'oklch(0.7 0.07 125)',
  'oklch(0.75 0.11 350)',
]
