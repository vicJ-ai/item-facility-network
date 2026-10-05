import { X } from 'lucide-react'
import { ModalBackdrop } from '../components/ModalBackdrop'

export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalBackdrop centered onClose={onClose}>
      <section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <div className="modal-head"><div><span className="eyebrow">About this experience</span><h2 id="about-title">Reference prototype</h2></div><button className="icon-button" aria-label="Close about" onClick={onClose}><X /></button></div>
        <p>This screenshot-based prototype uses exactly 27 user-provided facility addresses. It is not connected to WMS, YMS, inventory, facility, or operational APIs.</p>
        <p>Sixteen facilities have supplied site plans, four of them from official facility sheets, and thirteen have separate user-provided photo galleries. Twelve facilities have official listing media, fifteen have user-provided photos with documented association limits, and Garden City uses its official facility sheet photo. 27 records are Active; Garden City and University Park are Unassigned because no status, type, or operating hours have been supplied for them. A changed Local status is saved only in this browser. All 29 facilities have address-based map coordinates.</p>
        <button className="primary-button" onClick={onClose}>Understood</button>
      </section>
    </ModalBackdrop>
  )
}
