/** Structured model for Opportunity Analysis (profit left on the table). */

export type OpportunityAnalysisModel = {
  id: string
  tradeIndex: number
  instrument: string
  direction: string | null
  /** False when highest/lowest after exit is missing — UI shows incomplete state. */
  hasData: boolean
  actualExitPrice: number | null
  extremumAfterExit: number | null
  extremumLabel: string
  missedPoints: number | null
  potentialExtraProfit: number | null
  actualProfit: number | null
  actualPoints: number | null
  potentialProfit: number | null
  potentialPoints: number | null
  exitEfficiencyPct: number | null
  observation: string
  suggestion: string
  aiAnalyzed: boolean
}
