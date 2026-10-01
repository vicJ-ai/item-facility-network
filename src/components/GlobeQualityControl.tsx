import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Gauge } from 'lucide-react'
import { QUALITY_LABELS, type QualityChoice, type QualityTier } from '../lib/globe-quality'

const CHOICES: QualityChoice[] = ['auto', 'high', 'balanced', 'performance']

type GlobeQualityControlProps = {
  choice: QualityChoice
  /** The tier actually in use; for Automatic, what it has settled on. */
  effectiveTier: QualityTier
  onChange: (choice: QualityChoice) => void
}

/** The globe quality menu: Automatic by default, or a tier chosen by hand. */
export function GlobeQualityControl({ choice, effectiveTier, onChange }: GlobeQualityControlProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const current = QUALITY_LABELS[effectiveTier].label

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Up and down move between options, as in a native radio group.
  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const options = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
    const index = options.indexOf(document.activeElement as HTMLButtonElement)
    const next = options[(index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length]
    next?.focus()
  }

  return (
    <div ref={rootRef} className="quality-control">
      <button
        ref={toggleRef}
        type="button"
        className={`quality-toggle${open ? ' is-open' : ''}`}
        aria-label={`Globe quality: ${choice === 'auto' ? `Automatic, currently ${current}` : QUALITY_LABELS[choice].label}`}
        aria-expanded={open}
        aria-controls="globe-quality-options"
        title="Globe quality"
        onClick={() => setOpen((value) => !value)}
      >
        <Gauge size={18} aria-hidden="true" />
      </button>
      {open && (
        <div id="globe-quality-options" className="quality-popover" role="radiogroup" aria-label="Globe quality" onKeyDown={moveFocus}>
          <header>
            <span className="eyebrow">Globe</span>
            <strong>Quality</strong>
          </header>
          {CHOICES.map((option) => {
            const selected = choice === option
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`quality-option${selected ? ' is-selected' : ''}`}
                data-quality-option={option}
                onClick={() => onChange(option)}
              >
                <span>
                  <strong>{QUALITY_LABELS[option].label}</strong>
                  {option === 'auto' && <em>Currently {current}</em>}
                  <small>{QUALITY_LABELS[option].description}</small>
                </span>
                {selected && <Check size={16} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
