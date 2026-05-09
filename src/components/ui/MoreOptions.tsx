'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'
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
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY,
        left: align === 'right' ? rect.right + window.scrollX : rect.left + window.scrollX
      })
    }
  }, [isOpen, align])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: coords.top + 8,
            left: align === 'right' ? coords.left - 160 : coords.left,
            zIndex: 9999,
          }}
          className={cn(
            'min-w-[160px] p-1.5 rounded-2xl bg-white border border-gray-100 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl'
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
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <span className="shrink-0 opacity-70">{option.icon}</span>
                <span className="flex-1 truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors active:scale-95"
      >
        <MoreHorizontal size={18} />
      </button>

      {mounted && createPortal(menuContent, document.body)}
    </div>
  )
}
