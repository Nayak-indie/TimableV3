import { type ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
  preview?: ReactNode
}

export default function EmptyState({ title, description, action, preview }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-indigo-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
      {preview ? <div className="mt-3">{preview}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

