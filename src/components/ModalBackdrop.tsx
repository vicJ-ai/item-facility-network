import type { ReactNode } from 'react'

/** The dimmed layer behind a dialog; pressing on the backdrop itself, not the dialog, closes it. */
export function ModalBackdrop({ centered = false, onClose, children }: { centered?: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <div className={centered ? 'modal-backdrop centered' : 'modal-backdrop'} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      {children}
    </div>
  )
}
