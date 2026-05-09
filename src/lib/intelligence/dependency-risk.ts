import { PrerequisiteEngine } from '../scheduling/prerequisites'

export interface DependencyRisk {
  id: string
  score: number
  dependentsCount: number
  chainDepth: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Curriculum Dependency Risk Analysis
 * Identifies bottlenecks in the prerequisite DAG.
 */
export function analyzeDependencyRisk(
  subjects: Array<{ id: string }>,
  prereqEngine: PrerequisiteEngine
): DependencyRisk[] {
  const risks: DependencyRisk[] = []

  // Build a reverse map (who depends on me?)
  const dependentMap: Map<string, string[]> = new Map()
  subjects.forEach(s => {
    const prereqs = prereqEngine.getPrerequisites(s.id)
    prereqs.forEach(pId => {
      if (!dependentMap.has(pId)) dependentMap.set(pId, [])
      dependentMap.get(pId)!.push(s.id)
    })
  })

  subjects.forEach(s => {
    const dependents = dependentMap.get(s.id) ?? []
    const count = dependents.length
    
    // Calculate chain depth (longest path starting from me)
    const getDepth = (id: string, visited: Set<string>): number => {
      if (visited.has(id)) return 0 // Prevent cycles
      visited.add(id)
      const children = dependentMap.get(id) ?? []
      if (children.length === 0) return 1
      return 1 + Math.max(...children.map(c => getDepth(c, new Set(visited))))
    }
    
    const depth = getDepth(s.id, new Set())
    
    // Score based on count and depth
    const score = Math.min((count * 0.2) + (depth * 0.1), 1.0)
    
    let riskLevel: DependencyRisk['riskLevel'] = 'low'
    if (score > 0.8) riskLevel = 'critical'
    else if (score > 0.6) riskLevel = 'high'
    else if (score > 0.4) riskLevel = 'medium'

    risks.push({
      id: s.id,
      score,
      dependentsCount: count,
      chainDepth: depth,
      riskLevel
    })
  })

  return risks
}
