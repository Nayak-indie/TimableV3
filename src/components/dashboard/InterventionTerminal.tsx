'use client'

import { useState, useRef, useEffect } from 'react'
import { Terminal, Send, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'

interface LogEntry {
  id: string
  text: string
  type: 'user' | 'system' | 'error' | 'success'
}

export default function InterventionTerminal() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'init-1', text: 'Operational Intervention Engine [RUST/PY Core] initialized.', type: 'system' },
    { id: 'init-2', text: 'Awaiting natural language directives...', type: 'system' }
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isOpen])

  const addLog = (text: string, type: LogEntry['type'] = 'system') => {
    setLogs(prev => [...prev, { id: Math.random().toString(36).substring(7), text, type }])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    const command = input.trim()
    setInput('')
    addLog(`> ${command}`, 'user')
    setIsProcessing(true)

    try {
      // Simulate context for now (in real implementation, pass actual context)
      const context = { mode: 'ACTIVE' }
      
      const res = await fetch('/api/intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, context })
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to process command')

      // Stream logs from the backend
      data.result.logs.forEach((logStr: string) => {
        addLog(logStr, 'system')
      })

      if (data.result.strategy && data.result.strategy.status === 'ANALYZED') {
        addLog(`Strategy approved: ${data.result.strategy.action}. System is stable.`, 'success')
      }

    } catch (err: any) {
      addLog(`ERR: ${err.message}`, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-cyan-400 px-4 py-3 rounded-full shadow-2xl border border-cyan-500/30 hover:bg-slate-800 transition-all hover:scale-105 group"
        >
          <Terminal size={18} className="group-hover:animate-pulse" />
          <span className="text-xs font-bold tracking-widest uppercase">Intervention</span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-[450px] h-[500px] bg-slate-950 border border-cyan-900/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 font-mono">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-cyan-900/50">
        <div className="flex items-center gap-2 text-cyan-500">
          <Activity size={16} className="animate-pulse" />
          <span className="text-xs font-bold tracking-widest">LIVE OPERATIONAL TERMINAL</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 text-[11px] leading-relaxed">
        {logs.map((log) => (
          <div key={log.id} className={`
            ${log.type === 'user' ? 'text-white font-bold mb-3 mt-3' : ''}
            ${log.type === 'system' ? 'text-cyan-400/80' : ''}
            ${log.type === 'error' ? 'text-red-400' : ''}
            ${log.type === 'success' ? 'text-emerald-400' : ''}
          `}>
            {log.type === 'success' && <CheckCircle2 size={12} className="inline mr-1 -mt-0.5" />}
            {log.type === 'error' && <ShieldAlert size={12} className="inline mr-1 -mt-0.5" />}
            {log.text}
          </div>
        ))}
        {isProcessing && (
          <div className="text-cyan-600 animate-pulse flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-bounce delay-75" />
            <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-bounce delay-150" />
            <span className="ml-1">Processing via Core Engine...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-slate-900 border-t border-cyan-900/50 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Issue operational directive (e.g., 'Teacher A is absent...')"
          className="flex-1 bg-slate-950 border border-cyan-900/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className="bg-cyan-900/30 text-cyan-400 p-2 rounded-lg hover:bg-cyan-800/50 disabled:opacity-50 transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
