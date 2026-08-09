import { motion } from "framer-motion"
import {
  BookOpen,
  Brain,
  Calendar,
  Camera,
  CandlestickChart,
  Check,
  ClipboardList,
  Flag,
  Lightbulb,
  Sparkles,
} from "lucide-react"
import { FormattedJournalBody } from "@/features/trading/v2/components/ArticleRenderer"
import { AuthAttachmentThumb } from "@/features/trading/v2/components/AuthAttachmentThumb"
import { CollapsibleSection } from "@/features/trading/v2/components/CollapsibleSection"
import type {
  JournalProseBlock,
  JournalShot,
  JournalWorkspacePanel,
} from "@/features/trading/v2/journalWorkspace/types"
import { OpportunityAnalysisCard, OpportunityDaySummary } from "@/features/trading/v2/opportunityAnalysis/OpportunityAnalysisCard"
import { LearningCoachDashboard } from "@/features/trading/v2/learningCoach/LearningCoachDashboard"
import { cn } from "@/shared/lib/utils"
import "@/features/trading/v2/tradeDetail/tradeDetail.css"
import "@/features/trading/v2/journalWorkspace/journalWorkspace.css"
import "@/features/trading/v2/opportunityAnalysis/opportunityAnalysis.css"

function ProseBlock({
  block,
  defaultOpen = true,
}: {
  block: JournalProseBlock
  defaultOpen?: boolean
}) {
  const Icon =
    block.icon === "brain"
      ? Brain
      : block.icon === "plan"
        ? ClipboardList
        : block.icon === "flag"
          ? Flag
          : block.icon === "book"
            ? BookOpen
            : block.icon === "camera"
              ? Camera
              : block.icon === "spark"
                ? Sparkles
                : CandlestickChart

  return (
    <CollapsibleSection
      title={
        <>
          <Icon size={14} strokeWidth={1.75} />
          {block.title}
        </>
      }
      defaultOpen={defaultOpen}
      className={cn("jw-prose", block.tone && `jw-prose--${block.tone}`)}
    >
      <div className="td-prose-card">
        <FormattedJournalBody text={block.body} />
      </div>
    </CollapsibleSection>
  )
}

function ShotGrid({ shots }: { shots: JournalShot[] }) {
  if (!shots.length) return null
  return (
    <div className="td-shots">
      {shots.map((s) => (
        <div key={s.id} className="jw-shot-wrap">
          {s.scope ? <span className="jw-shot-scope">{s.scope}</span> : null}
          <AuthAttachmentThumb
            attachmentId={s.attachmentId}
            label={s.label}
            status={s.status}
            className="td-shot"
          />
        </div>
      ))}
    </div>
  )
}

function OverviewView({ panel }: { panel: Extract<JournalWorkspacePanel, { tab: "overview" }> }) {
  return (
    <>
      <header className="td-header">
        <div className="td-header__left">
          <div className="td-header__eyebrow">
            <span className="td-header__num">Overview</span>
            {panel.bias ? <span className="td-pill td-pill--slate">{panel.bias}</span> : null}
            {panel.result ? <span className="td-pill td-pill--slate">{panel.result}</span> : null}
            {panel.grade ? <span className="td-pill td-pill--amber">Grade {panel.grade}</span> : null}
          </div>
          <h2 className="td-header__instrument">{panel.title}</h2>
          <div className="td-header__meta">
            <span className="td-header__date">
              <Calendar size={13} strokeWidth={1.75} />
              {panel.dateLabel}
            </span>
          </div>
        </div>
        <div className="td-header__right">
          <p
            className={cn(
              "td-header__pnl",
              panel.pnl > 0 && "is-pos",
              panel.pnl < 0 && "is-neg",
            )}
          >
            {panel.pnlLabel}
          </p>
        </div>
      </header>

      <section className="td-section">
        <h3 className="td-section__title">Session Snapshot</h3>
        <div className="td-metrics">
          {panel.metrics.map((m) => (
            <div
              key={m.id}
              className={cn(
                "td-metric",
                m.tone === "positive" && "td-metric--pos",
                m.tone === "negative" && "td-metric--neg",
                m.tone === "accent" && "td-metric--accent",
              )}
            >
              <span className="td-metric__label">{m.label}</span>
              <strong className="td-metric__value">{m.value}</strong>
            </div>
          ))}
        </div>
      </section>

      {panel.tags.length ? (
        <section className="td-section">
          <h3 className="td-section__title">Tags</h3>
          <div className="td-chips">
            {panel.tags.map((t) => (
              <span key={t.id} className={cn("td-chip", `td-chip--${t.tone ?? "slate"}`)}>
                {t.label}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {panel.summary ? <ProseBlock block={panel.summary} defaultOpen /> : null}

      {panel.takeaway ? (
        <CollapsibleSection
          title={
            <>
              <Lightbulb size={14} strokeWidth={1.75} />
              Key Takeaway
            </>
          }
          defaultOpen
          className="td-section td-section--collapse"
        >
          <div className="td-lesson">
            <div className="td-lesson__icon" aria-hidden>
              <Lightbulb size={18} strokeWidth={1.75} />
            </div>
            <div className="td-lesson__body">
              <FormattedJournalBody text={panel.takeaway} />
            </div>
          </div>
        </CollapsibleSection>
      ) : null}

      {panel.shots.length ? (
        <CollapsibleSection
          title={
            <>
              <Camera size={14} strokeWidth={1.75} />
              Charts
            </>
          }
          subtitle={`${panel.shots.length} image${panel.shots.length === 1 ? "" : "s"}`}
          defaultOpen={false}
          className="td-section td-section--collapse"
        >
          <ShotGrid shots={panel.shots} />
        </CollapsibleSection>
      ) : null}
    </>
  )
}

function MarketView({ panel }: { panel: Extract<JournalWorkspacePanel, { tab: "market-analysis" }> }) {
  return (
    <>
      <header className="jw-simple-head">
        <span className="td-header__num">Market Analysis</span>
        <h2 className="td-header__instrument">{panel.title}</h2>
      </header>
      {panel.emptyHint ? <p className="jw-empty">{panel.emptyHint}</p> : null}
      <div className="jw-stack">
        {panel.blocks.map((b, i) => (
          <ProseBlock key={b.id} block={b} defaultOpen={i === 0} />
        ))}
      </div>
      {panel.shots.length ? (
        <CollapsibleSection
          title={
            <>
              <Camera size={14} strokeWidth={1.75} />
              Related Charts
            </>
          }
          subtitle={`${panel.shots.length} image${panel.shots.length === 1 ? "" : "s"}`}
          defaultOpen={false}
          className="td-section td-section--collapse"
        >
          <ShotGrid shots={panel.shots} />
        </CollapsibleSection>
      ) : null}
    </>
  )
}

function PsychologyView({
  panel,
}: {
  panel: Extract<JournalWorkspacePanel, { tab: "psychology" }>
}) {
  return (
    <>
      <header className="td-header">
        <div>
          <div className="td-header__eyebrow">
            <span className="td-header__num">Psychology</span>
            {panel.mood ? <span className="td-pill td-pill--slate">{panel.mood}</span> : null}
          </div>
          <h2 className="td-header__instrument">{panel.title}</h2>
        </div>
        {panel.overallScore != null ? (
          <div className="td-header__right">
            <span className="jw-score-label">Overall</span>
            <p className="td-header__pnl">{panel.overallScore.toFixed(1)}/10</p>
          </div>
        ) : null}
      </header>

      {panel.bars.length ? (
        <CollapsibleSection
          title={
            <>
              <Brain size={14} strokeWidth={1.75} />
              Session Psychology
            </>
          }
          defaultOpen
          className="td-section td-section--collapse"
        >
          <div className="td-psych__bars">
            {panel.bars.map((b) => {
              const pct = Math.max(0, Math.min(100, b.value * 10))
              return (
                <div key={b.id} className="td-psych__row">
                  <div className="td-psych__row-top">
                    <span>{b.label}</span>
                    <strong>{pct}%</strong>
                  </div>
                  <div className="td-psych__track" aria-hidden>
                    <div className="td-psych__fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      ) : null}

      <div className="jw-stack">
        {panel.dayNotes.map((b, i) => (
          <ProseBlock key={b.id} block={b} defaultOpen={i === 0 && !panel.bars.length} />
        ))}
        {panel.tradeNotes.map((b) => (
          <ProseBlock key={b.id} block={b} defaultOpen={false} />
        ))}
      </div>

      {panel.synthesized ? (
        <CollapsibleSection
          title={
            <>
              <Sparkles size={14} strokeWidth={1.75} />
              Auto summary
            </>
          }
          defaultOpen={false}
          className="td-section td-section--collapse"
        >
          <div className="td-ai">
            <p className="jw-synth">{panel.synthesized}</p>
          </div>
        </CollapsibleSection>
      ) : null}
    </>
  )
}

function ScreenshotsView({
  panel,
}: {
  panel: Extract<JournalWorkspacePanel, { tab: "screenshots" }>
}) {
  return (
    <>
      <header className="td-header">
        <div>
          <div className="td-header__eyebrow">
            <span className="td-header__num">Screenshots</span>
            <span className="td-pill td-pill--slate">
              {panel.readyCount} ready · {panel.totalCount} total
            </span>
          </div>
          <h2 className="td-header__instrument">{panel.title}</h2>
        </div>
      </header>

      {panel.emptyHint ? <p className="jw-empty">{panel.emptyHint}</p> : null}

      {panel.shots.length ? (
        <CollapsibleSection
          title={
            <>
              <Camera size={14} strokeWidth={1.75} />
              Gallery
            </>
          }
          subtitle={`${panel.readyCount} ready · ${panel.totalCount} total`}
          defaultOpen
          className="td-section td-section--collapse"
        >
          <ShotGrid shots={panel.shots} />
          <div className="jw-shot-legend">
            <span>
              <Check size={12} /> Click any thumbnail for fullscreen
            </span>
          </div>
        </CollapsibleSection>
      ) : null}
    </>
  )
}

function OpportunityView({
  panel,
}: {
  panel: Extract<JournalWorkspacePanel, { tab: "opportunity-analysis" }>
}) {
  if (!panel.analyses.length) {
    return <p className="oa-empty">{panel.emptyHint}</p>
  }
  return (
    <div className="oa-stack">
      <OpportunityDaySummary analyses={panel.analyses} title={panel.title} />
      {panel.analyses.map((model, i) => (
        <OpportunityAnalysisCard
          key={model.id}
          model={model}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  )
}

export function JournalPanelCard({ panel }: { panel: JournalWorkspacePanel }) {
  if (panel.tab === "opportunity-analysis") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <OpportunityView panel={panel} />
      </motion.div>
    )
  }

  if (panel.tab === "learning") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <LearningCoachDashboard model={panel.coach} />
      </motion.div>
    )
  }

  return (
    <motion.article
      className="td-card jw-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {panel.tab === "overview" ? <OverviewView panel={panel} /> : null}
      {panel.tab === "market-analysis" ? <MarketView panel={panel} /> : null}
      {panel.tab === "psychology" ? <PsychologyView panel={panel} /> : null}
      {panel.tab === "screenshots" ? <ScreenshotsView panel={panel} /> : null}
    </motion.article>
  )
}
