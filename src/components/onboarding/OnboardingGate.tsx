'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ChevronUp, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import { readPreferences } from '@/lib/preferences'

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
  const [ready, setReady] = useState(false)
  const [show, setShow] = useState(false)
  const [miniMode, setMiniMode] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const prefs = readPreferences()
    if (!prefs.onboardingTips) {
      setTimeout(() => {
        setReady(true)
        setShow(false)
        setMiniMode(false)
      }, 0)
      return
    }
    const complete = localStorage.getItem(STORAGE_COMPLETE) === '1'
    const dismissed = localStorage.getItem(STORAGE_DISMISSED) === '1'
    setTimeout(() => {
      setIsComplete(complete)
      setShow(!complete && !dismissed)
      setMiniMode(false)
      setReady(true)
    }, 0)
  }, [])

  const progress = useMemo(
    () => Math.round(((currentStep + 1) / steps.length) * 100),
    [currentStep]
  )

  if (!ready) return null

  const completeOnboarding = () => {
    localStorage.setItem(STORAGE_COMPLETE, '1')
    localStorage.removeItem(STORAGE_DISMISSED)
    setIsComplete(true)
    setShow(false)
    setMiniMode(false)
  }

  const dismissForNow = () => {
    localStorage.setItem(STORAGE_DISMISSED, '1')
    setShow(false)
    setMiniMode(false)
  }

  const openCurrentStep = () => {
    setMiniMode(true)
    setShow(false)
    router.push(steps[currentStep].href)
  }

  return (
    <>
      <AnimatePresence>
        {show ? (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm p-4 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md mx-auto rounded-3xl border border-indigo-100 bg-white p-4 shadow-2xl"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Welcome to Timable</p>
                <span className="text-xs font-semibold text-indigo-600">{progress}%</span>
              </div>
              <div className="h-2 mt-2 rounded-full bg-indigo-100 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-4 rounded-2xl bg-indigo-50 p-3">
                <p className="text-sm font-semibold text-gray-800">{steps[currentStep].title}</p>
                <p className="text-xs text-gray-600 mt-1">{steps[currentStep].description}</p>
                <button type="button" className="text-xs mt-2 inline-block text-indigo-600 font-semibold" onClick={openCurrentStep}>
                  Open this step
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {steps.map((step, idx) => (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    className={`w-full text-left rounded-xl px-3 py-2 text-sm border transition ${
                      idx === currentStep ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-white text-gray-500'
                    }`}
                  >
                    {idx < currentStep ? '✓ ' : ''}{step.title}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={dismissForNow}>Resume later</Button>
                {currentStep < steps.length - 1 ? (
                  <Button onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}>Next</Button>
                ) : (
                  <Button onClick={completeOnboarding}><CheckCircle2 size={16} />Finish</Button>
                )}
              </div>
              <button
                type="button"
                onClick={completeOnboarding}
                className="w-full mt-2 text-xs text-gray-500"
              >
                Skip onboarding
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {miniMode && !isComplete ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 right-4 z-50 w-64 rounded-2xl border border-indigo-100 bg-white/95 backdrop-blur p-3 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Setup helper ({progress}%)</p>
            <button
              type="button"
              className="text-xs text-indigo-600 font-semibold inline-flex items-center gap-1"
              onClick={() => {
                setShow(true)
                setMiniMode(false)
              }}
            >
              <ChevronUp size={12} /> Expand
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-600">{steps[currentStep].title}</p>
          <div className="mt-2 space-y-1 max-h-28 overflow-auto">
            {steps.map((step, idx) => (
              <button
                key={step.title}
                type="button"
                onClick={() => {
                  setCurrentStep(idx)
                  router.push(step.href)
                }}
                className={`w-full text-left rounded-lg px-2 py-1 text-xs ${
                  idx === currentStep ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500'
                }`}
              >
                {idx + 1}. {step.title}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1">
            <Button variant="ghost" className="!py-2 !px-2 !text-xs" onClick={dismissForNow}>Pause</Button>
            {currentStep < steps.length - 1 ? (
              <Button className="!py-2 !px-2 !text-xs" onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}>Next</Button>
            ) : (
              <Button className="!py-2 !px-2 !text-xs" onClick={completeOnboarding}>Finish</Button>
            )}
          </div>
        </motion.div>
      ) : null}

      {!show && !isComplete ? (
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(STORAGE_DISMISSED)
            setShow(true)
            setMiniMode(false)
          }}
          className="fixed bottom-24 right-4 z-50 rounded-full bg-indigo-600 text-white px-3 py-2 text-xs font-semibold shadow-lg inline-flex items-center gap-1"
        >
          <Sparkles size={14} /> Resume setup
        </button>
      ) : null}
    </>
  )
}
