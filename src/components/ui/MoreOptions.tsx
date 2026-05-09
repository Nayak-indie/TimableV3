'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Edit2, Trash2, Settings, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface Option {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface MoreOptionsProps {
  options: Option[]
  className?: string
  align?: 'left' | 'right'
}

export default function MoreOptions({ options, className, align = 'right' }: MoreOptionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative inline-block', className)} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-full hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] transition-colors active:scale-95"
      >
        <MoreHorizontal size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute z-50 mt-2 min-w-[160px] p-1.5 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-color)] shadow-xl backdrop-blur-xl',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            <div className="space-y-0.5">
              {options.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    option.onClick()
                    setIsOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors text-left',
                    option.variant === 'danger'
                      ? 'text-red-500 hover:bg-red-50'
                      : 'text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
                  )}
                >
                  <span className="shrink-0">{option.icon}</span>
                  <span className="flex-1 truncate">{option.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
