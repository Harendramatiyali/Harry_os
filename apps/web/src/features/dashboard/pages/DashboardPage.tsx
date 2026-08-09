import { BookProgressWidget } from "@/features/dashboard/components/BookProgressWidget"
import { FocusChartWidget, PnlChartWidget } from "@/features/dashboard/components/ChartsWidgets"
import { DashboardHero } from "@/features/dashboard/components/DashboardHero"
import { FinanceSummaryWidget } from "@/features/dashboard/components/FinanceSummaryWidget"
import { QuickNotesWidget } from "@/features/dashboard/components/QuickNotesWidget"
import { RecentJournalWidget } from "@/features/dashboard/components/RecentJournalWidget"
import { TodayGoalsWidget } from "@/features/dashboard/components/TodayGoalsWidget"
import { TodayPlannerWidget } from "@/features/dashboard/components/TodayPlannerWidget"
import { TodayTasksWidget } from "@/features/dashboard/components/TodayTasksWidget"
import { TradingSummaryWidget } from "@/features/dashboard/components/TradingSummaryWidget"
import { UpcomingEventsWidget } from "@/features/dashboard/components/UpcomingEventsWidget"
import { dashboardMock } from "@/features/dashboard/data/mock"

export function DashboardPage() {
  const data = dashboardMock

  return (
    <div className="space-y-5 md:space-y-6">
      <DashboardHero />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-5">
        <div className="md:col-span-1 xl:col-span-1">
          <TodayPlannerWidget items={data.planner} />
        </div>
        <div className="md:col-span-1">
          <TodayTasksWidget items={data.tasks} />
        </div>
        <div className="md:col-span-2 xl:col-span-1">
          <TodayGoalsWidget items={data.goals} />
        </div>

        <TradingSummaryWidget data={data.trading} />
        <BookProgressWidget items={data.books} />
        <FinanceSummaryWidget data={data.finance} />

        <div className="md:col-span-2 xl:col-span-2">
          <FocusChartWidget data={data.focusSeries} />
        </div>
        <div className="md:col-span-2 xl:col-span-1">
          <PnlChartWidget data={data.pnlSeries} />
        </div>

        <QuickNotesWidget items={data.notes} />
        <UpcomingEventsWidget items={data.events} />
        <RecentJournalWidget items={data.journal} />
      </div>
    </div>
  )
}
