import { secondaryButtonClass } from './ui'

export default function PortfolioTabs({ portfolios, selectedId, onSelect, onCreateClick }) {
  return (
    <div className="flex items-end gap-4 border-b border-line">
      <div role="tablist" aria-label="Portföyler" className="scroll-x -mb-px flex flex-1 gap-1">
        {portfolios.map((portfolio) => {
          const active = portfolio.id === selectedId
          return (
            <button
              key={portfolio.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(portfolio.id)}
              className={`shrink-0 border-b-2 px-3 pb-3 pt-1 text-sm transition-colors ${
                active ? 'border-violet font-medium text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {portfolio.name}
            </button>
          )
        })}
      </div>
      <button type="button" onClick={onCreateClick} className={`${secondaryButtonClass} mb-2 shrink-0`}>
        Yeni portföy
      </button>
    </div>
  )
}
