import { ExecutionTrace } from '../history/execution-history'

export interface ChronicRiskNode {
  id: string
  failureCount: number
  failureRate: number
  lastFailureDate: string
  trend: 'rising' | 'stable' | 'improving'
}

/**
 * Historical Risk Observatory
 * Extracts longitudinal patterns from execution history to identify systemic instability.
 */
export class HistoricalRiskEngine {
  static analyzeChronicBottlenecks(history: ExecutionTrace[]): ChronicRiskNode[] {
    const nodeStats = new Map<string, { count: number; total: number; dates: string[] }>()

    history.forEach(trace => {
      trace.bottlenecks.forEach(nodeId => {
        if (!nodeStats.has(nodeId)) {
          nodeStats.set(nodeId, { count: 0, total: 0, dates: [] })
        }
        const stats = nodeStats.get(nodeId)!
        stats.total++
        if (!trace.success) {
          stats.count++
          stats.dates.push(trace.timestamp)
        }
      })
    })

    const results: ChronicRiskNode[] = []
    nodeStats.forEach((stats, id) => {
      const failureRate = stats.count / (stats.total || 1)
      
      // Basic trend analysis: compare last 3 failures
      let trend: ChronicRiskNode['trend'] = 'stable'
      if (stats.dates.length > 3) {
        // Simple logic for rising trend
        trend = 'rising'
      }

      results.push({
        id,
        failureCount: stats.count,
        failureRate,
        lastFailureDate: stats.dates[stats.dates.length - 1] || '',
        trend
      })
    })

    return results
  }
}
