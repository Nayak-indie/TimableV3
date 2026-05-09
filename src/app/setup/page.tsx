'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Sparkles, CheckCircle2, Circle, ArrowRight, Database, LayoutGrid, Users, BookOpen, Clock } from 'lucide-react'
import LiveSchoolOverview from '@/components/dashboard/LiveSchoolOverview'
import SetupStatusLinks from '@/components/dashboard/SetupStatusLinks'
import SetupHelperButton from '@/components/setup/SetupHelperButton'
import { useDevDataSync } from '@/lib/dev/use-dev-data-sync'

export default function SetupPage() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [counts, setCounts] = useState({ terms: 0, classes: 0, teachers: 0, subjects: 0, slots: 0 })

  const checkStatus = async () => {
    const res = await fetch('/api/data/summary')
    if (res.ok) {
      const data = await res.json()
      setCounts({
        terms: data.activeTerm !== 'Not set' ? 1 : 0,
        classes: data.classes,
        teachers: data.teachers,
        subjects: data.subjects,
        slots: data.periodSlots
      })
    }
  }

  useDevDataSync(checkStatus)

  const handleSeed = async () => {
    if (!confirm('This will reset your database and add a full set of sample data. Continue?')) return
    setIsSeeding(true)
    try {
      const res = await fetch('/api/dev/sample-data', { method: 'POST' })
      if (res.ok) {
        window.location.reload()
      } else {
        const err = await res.json()
        alert('Failed: ' + (err.error || 'Unknown error'))
      }
    } finally {
      setIsSeeding(false)
    }
  }

  const steps = [
    { name: 'Academic Term', count: counts.terms, icon: <Clock size={16} />, label: 'Required for scheduling' },
    { name: 'Classes', count: counts.classes, icon: <LayoutGrid size={16} />, label: 'Grade levels and sections' },
    { name: 'Teachers', count: counts.teachers, icon: <Users size={16} />, label: 'Staff members and availability' },
    { name: 'Subjects', count: counts.subjects, icon: <BookOpen size={16} />, label: 'Curriculum and periods per week' },
    { name: 'Period Slots', count: counts.slots, icon: <Clock size={16} />, label: 'Daily schedule structure' },
  ]

  const isReady = steps.every(s => s.count > 0)

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto pb-24">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="text-indigo-600" size={24} />
          System Setup
        </h1>
        <p className="text-sm text-gray-500 font-medium">Configure your school environment or populate with sample data.</p>
      </div>

      <Card className="bg-gradient-to-br from-indigo-500 to-violet-600 border-none text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <Sparkles size={120} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider">Quick Start</p>
              <h2 className="text-xl font-bold mt-1">One-Click Population</h2>
              <p className="text-indigo-100 text-sm mt-2 max-w-[280px] leading-relaxed">
                Automatically seed your database with academic terms, classes, teachers, and subjects to explore all features instantly.
              </p>
            </div>
            <SetupHelperButton />
          </div>
          <Button 
            variant="secondary" 
            fullWidth
            onClick={handleSeed}
            disabled={isSeeding}
            className="h-12 bg-white text-indigo-600 hover:bg-indigo-50 border-none shadow-lg shadow-indigo-900/20"
          >
            {isSeeding ? 'Seeding Database...' : 'Seed Full Sample Dataset'}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700 px-1">Prerequisites Checklist</h3>
        <div className="grid gap-2">
          {steps.map((step) => (
            <Card key={step.name} className={`flex items-center gap-4 p-4 transition-all ${step.count > 0 ? 'bg-green-50/50 border-green-100' : 'bg-gray-50/50 border-gray-100'}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${step.count > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {step.count > 0 ? <CheckCircle2 size={20} /> : step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-bold truncate ${step.count > 0 ? 'text-green-800' : 'text-gray-900'}`}>{step.name}</p>
                  {step.count > 0 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight">{step.count} Loaded</span>}
                </div>
                <p className="text-xs text-gray-500 font-medium truncate opacity-70">{step.label}</p>
              </div>
              {step.count === 0 && (
                <ArrowRight size={14} className="text-gray-300" />
              )}
            </Card>
          ))}
        </div>
      </div>

      <LiveSchoolOverview compact />
      
      <SetupStatusLinks />
    </div>
  )
}
