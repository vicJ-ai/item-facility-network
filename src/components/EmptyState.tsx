import type { ReactNode } from 'react'
import { FileText } from 'lucide-react'

export function EmptyState({ icon: Icon = FileText, title, body, children }: { icon?: typeof FileText; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{body}</p>
      {children}
    </div>
  )
}
