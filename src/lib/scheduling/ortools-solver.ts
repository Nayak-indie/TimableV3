import { spawn } from 'child_process'
import path from 'path'
import type { Class, Teacher, Subject, TimetableEntry } from '@/types'

interface SolverInput {
  config: {
    days: string[]
    periods_per_day: number
  }
  teachers: Array<{
    id: string
    name: string
    max_periods_per_day: number
  }>
  classes: Array<{
    id: string
    subjects: Array<{
      subject: string
      weekly_periods: number
      teacher_id: string
    }>
  }>
  prerequisites?: Record<string, Record<string, string[]>>
  preferences?: Record<string, any>
}

export async function solveWithORTools(input: SolverInput): Promise<TimetableEntry[]> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(process.cwd(), 'src/solver/solver.py')])

    let outputData = ''
    let errorData = ''

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${errorData}`))
        return
      }

      try {
        const result = JSON.parse(outputData)
        if (result.status === 'SUCCESS') {
          // Convert solver output to TimetableEntry format
          const entries: TimetableEntry[] = result.timetable.map((t: any) => ({
            id: crypto.randomUUID(),
            class_id: t.class_id,
            subject_id: t.subject_id,
            teacher_id: t.teacher_id,
            day: t.day,
            period_number: t.period,
            created_at: new Date().toISOString(),
          }))
          resolve(entries)
        } else if (result.status === 'INFEASIBLE') {
          reject(new Error('Timetable generation is infeasible with the given constraints.'))
        } else {
          reject(new Error(result.error || 'Unknown solver error'))
        }
      } catch (e) {
        reject(new Error(`Failed to parse solver output: ${outputData}`))
      }
    })

    // Send input to Python
    pythonProcess.stdin.write(JSON.stringify(input))
    pythonProcess.stdin.end()
  })
}
