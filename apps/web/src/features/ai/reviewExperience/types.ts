import type { ComponentType, ReactNode } from "react"

export type ReviewModuleId =
  | "trading"
  | "books"
  | "finance"
  | "career"
  | "health"
  | "knowledge"

export type ReviewSectionItem = {
  id: string
  label: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

export type ReviewNotebookPage = {
  id: string
  label: string
  /** Image URL when available; otherwise solid placeholder tone is used */
  src?: string
  tone?: string
}

export type ReviewSectionCardModel = {
  id: string
  title: string
  summary: string
  confidence: number
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  accepted?: boolean
}

export type ReviewExperienceHeaderModel = {
  moduleId: ReviewModuleId
  moduleName: string
  moduleIcon: ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  dateLabel: string
  confidence: number
  destinationLabel: string
}

export type ReviewExperienceChildren = {
  header?: ReactNode
  sidebar?: ReactNode
  center?: ReactNode
  notebook?: ReactNode
  bottomBar?: ReactNode
}
