'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, CheckCircle2, ChevronRight, Sparkles, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { readPreferences } from '@/lib/preferences'
import { OPEN_SETUP_HELPER_EVENT } from '@/lib/dev/onboarding'

const STORAGE_COMPLETE = 'timable_onboarding_complete'
const STORAGE_DISMISSED = 'timable_onboarding_dismissed'

const steps = [
  { title: 'Add your classes', href: '/setup/classes', description: 'Create class lists first.' },
  { title: 'Add your teachers', href: '/setup/teachers', description: 'Assign reusable classes and subjects.' },
  { title: 'Set period slots', href: '/setup/periods', description: 'Configure daily bell periods.' },
  { title: 'Generate timetable', href: '/timetable/generate', description: 'Build your first timetable.' },
]

export default function OnboardingGate() {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [show, setShow] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const prefs = readPreferences()
    const openHelper = () => {
      setIsComplete(false)
      setShow(true)
      setReady(true)
    }

    window.addEventListener(OPEN_SETUP_HELPER_EVENT, openHelper)

    const complete = localStorage.getItem(STORAGE_COMPLETE) === '1'
    const dismissed = localStorage.getItem(STORAGE_DISMISSED) === '1'

    setTimeout(() => {
      setIsComplete(complete)
      setShow(Boolean(prefs.onboardingTips) && !complete && !dismissed)
      setReady(true)
    }, 0)

    return () => window.removeEventListener(OPEN_SETUP_HELPER_EVENT, openHelper)
  }, [])

  const progress = useMemo(() => Math.round(((currentStep + 1) / steps.length) * 100), [currentStep])

  if (!ready) return null

  const completeOnboarding = () => {
    localStorage.setItem(STORAGE_COMPLETE, '1')
    localStorage.removeItem(STORAGE_DISMISSED)
    setIsComplete(true)
    setShow(false)
  }

  const dismissForNow = () => {
    localStorage.setItem(STORAGE_DISMISSED, '1')
    setShow(false)
  }

  const openCurrentStep = () => {
    setShow(false)
    router.push(steps[currentStep].href)
  }

  return (
    <>
      <AnimatePresence>
        {show ? (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-primary)] shadow-[var(--shadow-primary)]"
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-5 py-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-secondary)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <BookOpen size={12} />
                    Setup guide
                  </div>
                  <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">Welcome to Timable</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                    Finish the core setup once, then reopen this guide whenever you want to add or check data.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                    {progress}%
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-[var(--border-color)] p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
                    onClick={dismissForNow}
                    aria-label="Close setup guide"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="h-1.5 overflow-hidden bg-[var(--surface-secondary)]">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-[1.08fr_0.92fr]">
                <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-secondary)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Current step</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{steps[currentStep].title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{steps[currentStep].description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={openCurrentStep}>
                      Open this step
                      <ChevronRight size={14} />
                    </Button>
                    <Button variant="ghost" onClick={dismissForNow}>Close</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Setup flow</p>
                  <div className="space-y-2">
                    {steps.map((step, idx) => {
                      const isActive = idx === currentStep
                      const isDone = idx < currentStep
                      return (
                        <button
                          key={step.title}
                          type="button"
                          onClick={() => setCurrentStep(idx)}
                          className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                            isActive
                              ? 'border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[var(--surface-primary)] shadow-sm'
                              : 'border-[var(--border-color)] bg-[var(--surface-secondary)] hover:bg-[var(--surface-primary)]'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                              isDone
                                ? 'bg-emerald-500 text-white'
                                : isActive
                                  ? 'bg-[var(--accent)] text-white'
                                  : 'bg-[var(--surface-primary)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {isDone ? <CheckCircle2 size={12} /> : idx + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-[var(--text-primary)]">{step.title}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-[var(--text-secondary)]">{step.description}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--border-color)] px-5 py-4">
                <button
                  type="button"
                  onClick={dismissForNow}
                  className="text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                >
                  Remind me later
                </button>
                {currentStep < steps.length - 1 ? (
                  <Button onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}>Next step</Button>
                ) : (
                  <Button onClick={completeOnboarding}><CheckCircle2 size={16} />Finish</Button>
                )}
              </div>

              <div className="px-5 pb-5 text-center">
                <button
                  type="button"
                  onClick={completeOnboarding}
                  className="text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                >
                  Skip setup guide
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!show && !isComplete && !(pathname ?? '').startsWith('/setup') ? (
        <motion.button
          type="button"
          onClick={() => {
            localStorage.removeItem(STORAGE_DISMISSED)
            setShow(true)
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-primary)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-[var(--shadow-primary)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-secondary)]"
        >
          <Sparkles size={14} />
          Setup guide
        </motion.button>
      ) : null}
    </>
  )
}
