import { useEffect, useRef, useState } from 'react'
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from './ui'

/** Form used both inline (empty state) and inside the dialog. */
export function CreatePortfolioForm({ onSubmit, submitting, onCancel }) {
  const [form, setForm] = useState({ name: '', description: '' })

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const created = await onSubmit({ name: form.name.trim(), description: form.description.trim() })
    if (created) setForm({ name: '', description: '' })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className={labelClass} htmlFor="portfolio-name">Portföy adı</label>
        <input id="portfolio-name" name="name" value={form.name} onChange={handleChange} placeholder="Örn. Emeklilik" maxLength={150} className={inputClass} required autoFocus />
      </div>
      <div>
        <label className={labelClass} htmlFor="portfolio-desc">
          Açıklama <span className="font-normal text-muted">(isteğe bağlı)</span>
        </label>
        <input id="portfolio-desc" name="description" value={form.description} onChange={handleChange} maxLength={1000} className={inputClass} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>Vazgeç</button>
        )}
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? 'Oluşturuluyor...' : 'Portföyü oluştur'}
        </button>
      </div>
    </form>
  )
}

export default function CreatePortfolioModal({ open, onClose, onSubmit, submitting }) {
  const dialogRef = useRef(null)

  // Native <dialog>: focus trapping, Escape and the top layer come for free.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const handleSubmit = async (values) => {
    const created = await onSubmit(values)
    if (created) onClose()
    return created
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && onClose()}
      aria-labelledby="create-portfolio-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-[2px]"
    >
      {open && (
        <div className="animate-enter p-6">
          <h2 id="create-portfolio-title" className="text-lg font-semibold">Yeni portföy</h2>
          <p className="mt-1 mb-5 text-sm text-muted">Fonlarını amacına göre ayrı portföylerde tutabilirsin.</p>
          <CreatePortfolioForm onSubmit={handleSubmit} submitting={submitting} onCancel={onClose} />
        </div>
      )}
    </dialog>
  )
}
