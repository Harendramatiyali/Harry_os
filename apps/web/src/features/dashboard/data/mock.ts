import type { DashboardData } from "@/features/dashboard/types"

/** Demo dashboard payload — replace with API queries later. */
export const dashboardMock: DashboardData = {
  planner: [
    { id: "1", time: "07:30", title: "Morning review & plan", tag: "Focus", done: true },
    { id: "2", time: "09:00", title: "Deep work — product specs", tag: "Career", done: false },
    { id: "3", time: "12:30", title: "Market journal check-in", tag: "Trading", done: false },
    { id: "4", time: "16:00", title: "Reading block", tag: "Learning", done: false },
    { id: "5", time: "21:00", title: "End-of-day review", tag: "Reflect", done: false },
  ],
  tasks: [
    { id: "t1", title: "Ship Harry OS dashboard widgets", priority: "high", due: "Today", done: false },
    { id: "t2", title: "Review weekly trading mistakes", priority: "high", due: "Today", done: false },
    { id: "t3", title: "Update vocabulary deck", priority: "medium", due: "Today", done: true },
    { id: "t4", title: "Reconcile credit card", priority: "low", due: "Today", done: false },
  ],
  goals: [
    { id: "g1", title: "Consistent trading process", domain: "Trading", progress: 68 },
    { id: "g2", title: "Read 24 books this year", domain: "Learning", progress: 42 },
    { id: "g3", title: "Emergency fund runway", domain: "Finance", progress: 75 },
  ],
  trading: {
    dayPnl: 12450,
    weekPnl: -3200,
    winRate: 57.1,
    tradesToday: 3,
    openRisk: 1.2,
  },
  books: [
    { id: "b1", title: "Atomic Habits", author: "James Clear", progress: 72, pagesLeft: 68 },
    { id: "b2", title: "Thinking in Systems", author: "Donella Meadows", progress: 34, pagesLeft: 152 },
  ],
  finance: {
    cash: 186400,
    spentThisMonth: 42850,
    budget: 60000,
    investments: 1240000,
    currency: "INR",
  },
  notes: [
    { id: "n1", body: "Keep risk under 1R until process score stays above B.", updatedAt: "2h ago" },
    { id: "n2", body: "Dashboard should feel like iOS widgets — calm, dense, clear.", updatedAt: "Yesterday" },
    { id: "n3", body: "English: practice concise standup updates this week.", updatedAt: "Mon" },
  ],
  events: [
    { id: "e1", title: "Weekly trading review", when: "Tomorrow · 09:00", type: "review" },
    { id: "e2", title: "1:1 with manager", when: "Fri · 16:30", type: "meeting" },
    { id: "e3", title: "Nifty expiry watch", when: "Thu · 15:15", type: "market" },
    { id: "e4", title: "Gym + recovery", when: "Sat · 08:00", type: "personal" },
  ],
  journal: [
    {
      id: "j1",
      title: "Process over P&L",
      excerpt: "Cut a winner early after FOMO entry. Marked as leak — wait for confirmation next time.",
      date: "Today",
      mood: "Focused",
    },
    {
      id: "j2",
      title: "Deep work block",
      excerpt: "Two uninterrupted hours on architecture notes. Energy stayed high after sleep.",
      date: "Yesterday",
      mood: "Calm",
    },
  ],
  focusSeries: [
    { label: "Mon", value: 4.5 },
    { label: "Tue", value: 6.2 },
    { label: "Wed", value: 5.1 },
    { label: "Thu", value: 7.0 },
    { label: "Fri", value: 3.8 },
    { label: "Sat", value: 2.5 },
    { label: "Sun", value: 5.6 },
  ],
  pnlSeries: [
    { label: "Mon", value: 4200 },
    { label: "Tue", value: -1800 },
    { label: "Wed", value: 6100 },
    { label: "Thu", value: 900 },
    { label: "Fri", value: -2500 },
    { label: "Sat", value: 0 },
    { label: "Sun", value: 12450 },
  ],
}
