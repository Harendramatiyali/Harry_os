import { useState, type FormEvent, type ReactNode } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  useAccounts,
  useExpenses,
  useFinanceCharts,
  useFinanceDashboard,
  useFinanceMutations,
  useHoldings,
  useIncomes,
  useLoans,
  useMonthlyReports,
} from "@/features/finance/hooks"
import type {
  AccountType,
  ExpenseCategory,
  HoldingType,
  IncomeKind,
  LoanStatus,
} from "@/features/finance/types"
import { EXPENSE_CATEGORIES } from "@/features/finance/types"
import { ModuleHomeShell } from "@/features/modules/ModuleHomeShell"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"

type Tab = "dashboard" | "income" | "expenses" | "investments" | "loans" | "reports"

const PIE_COLORS = [
  "rgba(110,231,183,0.85)",
  "rgba(125,211,252,0.85)",
  "rgba(253,186,116,0.85)",
  "rgba(196,181,253,0.85)",
  "rgba(251,113,133,0.85)",
  "rgba(252,211,77,0.85)",
]

function money(v: string | number | null | undefined, currency = "₹") {
  const n = Number(v ?? 0)
  const abs = Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })
  return `${n < 0 ? "-" : ""}${currency}${abs}`
}

function Panel({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-card/70 p-4 backdrop-blur-xl md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: number
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-card/70 p-3.5 backdrop-blur-xl">
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          tone == null
            ? ""
            : tone >= 0
              ? "text-emerald-300"
              : "text-rose-300"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

const selectClass = "h-9 rounded-md border border-input bg-transparent px-2 text-sm"
const tooltipStyle = {
  background: "rgba(20,24,32,0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function FinancePage() {
  const [tab, setTab] = useState<Tab>("dashboard")
  const dash = useFinanceDashboard()
  const charts = useFinanceCharts()
  const reports = useMonthlyReports(6)
  const accounts = useAccounts()
  const incomes = useIncomes()
  const expenses = useExpenses()
  const loans = useLoans()
  const holdings = useHoldings()
  const m = useFinanceMutations()

  // Account form
  const [accName, setAccName] = useState("")
  const [accType, setAccType] = useState<AccountType>("bank")
  const [accBal, setAccBal] = useState("")

  // Income form
  const [incKind, setIncKind] = useState<IncomeKind>("salary")
  const [incSource, setIncSource] = useState("")
  const [incAmount, setIncAmount] = useState("")
  const [incDate, setIncDate] = useState(todayISO())

  // Expense form
  const [expCat, setExpCat] = useState<ExpenseCategory>("food")
  const [expDesc, setExpDesc] = useState("")
  const [expAmount, setExpAmount] = useState("")
  const [expDate, setExpDate] = useState(todayISO())

  // Holding form
  const [holdType, setHoldType] = useState<HoldingType>("stock")
  const [holdName, setHoldName] = useState("")
  const [holdSymbol, setHoldSymbol] = useState("")
  const [holdUnits, setHoldUnits] = useState("")
  const [holdAvg, setHoldAvg] = useState("")
  const [holdPrice, setHoldPrice] = useState("")

  // Loan form
  const [loanName, setLoanName] = useState("")
  const [loanLender, setLoanLender] = useState("")
  const [loanPrincipal, setLoanPrincipal] = useState("")
  const [loanOutstanding, setLoanOutstanding] = useState("")
  const [loanRate, setLoanRate] = useState("")
  const [loanEmi, setLoanEmi] = useState("")
  const [loanStatus, setLoanStatus] = useState<LoanStatus>("active")

  function onAddAccount(e: FormEvent) {
    e.preventDefault()
    if (!accName.trim()) return
    m.createAccount.mutate(
      { name: accName.trim(), account_type: accType, balance: Number(accBal || 0) },
      {
        onSuccess: () => {
          setAccName("")
          setAccBal("")
        },
      },
    )
  }

  function onAddIncome(e: FormEvent) {
    e.preventDefault()
    if (!incSource.trim() || !incAmount) return
    m.createIncome.mutate(
      {
        kind: incKind,
        source: incSource.trim(),
        amount: Number(incAmount),
        received_on: incDate,
      },
      {
        onSuccess: () => {
          setIncSource("")
          setIncAmount("")
        },
      },
    )
  }

  function onAddExpense(e: FormEvent) {
    e.preventDefault()
    if (!expDesc.trim() || !expAmount) return
    m.createExpense.mutate(
      {
        category: expCat,
        description: expDesc.trim(),
        amount: Number(expAmount),
        spent_on: expDate,
      },
      {
        onSuccess: () => {
          setExpDesc("")
          setExpAmount("")
        },
      },
    )
  }

  function onAddHolding(e: FormEvent) {
    e.preventDefault()
    if (!holdName.trim()) return
    m.createHolding.mutate(
      {
        holding_type: holdType,
        name: holdName.trim(),
        symbol: holdSymbol || null,
        units: Number(holdUnits || 0),
        avg_cost: Number(holdAvg || 0),
        current_price: Number(holdPrice || 0),
      },
      {
        onSuccess: () => {
          setHoldName("")
          setHoldSymbol("")
          setHoldUnits("")
          setHoldAvg("")
          setHoldPrice("")
        },
      },
    )
  }

  function onAddLoan(e: FormEvent) {
    e.preventDefault()
    if (!loanName.trim() || !loanPrincipal) return
    const principal = Number(loanPrincipal)
    m.createLoan.mutate(
      {
        name: loanName.trim(),
        lender: loanLender || null,
        principal,
        outstanding: Number(loanOutstanding || principal),
        interest_rate: loanRate ? Number(loanRate) : null,
        emi: loanEmi ? Number(loanEmi) : null,
        status: loanStatus,
      },
      {
        onSuccess: () => {
          setLoanName("")
          setLoanLender("")
          setLoanPrincipal("")
          setLoanOutstanding("")
          setLoanRate("")
          setLoanEmi("")
        },
      },
    )
  }

  const cashflowData = (charts.data?.monthly_cashflow ?? []).map((r) => ({
    month: r.month.slice(5),
    income: Number(r.income),
    expenses: Number(r.expenses),
    savings: Number(r.savings),
  }))

  const expensePie = (charts.data?.expense_by_category ?? []).map((c) => ({
    name: c.category,
    value: Number(c.amount),
  }))

  const allocationPie = (charts.data?.allocation ?? []).map((c) => ({
    name: c.category.replace("_", " "),
    value: Number(c.amount),
  }))

  const stocks = (holdings.data ?? []).filter((h) => h.holding_type === "stock")
  const mfs = (holdings.data ?? []).filter((h) => h.holding_type === "mutual_fund")
  const otherInv = (holdings.data ?? []).filter((h) => h.holding_type === "other")

  return (
    <ModuleHomeShell moduleId="finance">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["dashboard", "Dashboard"],
            ["income", "Salary & Income"],
            ["expenses", "Expenses"],
            ["investments", "Investments"],
            ["loans", "Loans"],
            ["reports", "Reports"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={tab === id ? "default" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-4">
          {dash.isLoading || !dash.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Stat label="Net worth" value={money(dash.data.net_worth)} tone={Number(dash.data.net_worth)} />
                <Stat label="Cash" value={money(dash.data.cash_total)} />
                <Stat label="Investments" value={money(dash.data.investments_total)} />
                <Stat label="Stocks" value={money(dash.data.stocks_total)} />
                <Stat label="Mutual funds" value={money(dash.data.mutual_funds_total)} />
                <Stat label="Loans" value={money(dash.data.loans_outstanding)} tone={-1} />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Income (mo)" value={money(dash.data.income_this_month)} tone={1} />
                <Stat label="Salary (mo)" value={money(dash.data.salary_this_month)} />
                <Stat label="Expenses (mo)" value={money(dash.data.expenses_this_month)} tone={-1} />
                <Stat
                  label="Savings (mo)"
                  value={money(dash.data.savings_this_month)}
                  tone={Number(dash.data.savings_this_month)}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Cashflow (6 mo)">
                  <div className="h-56">
                    {cashflowData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Add income and expenses to see charts.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cashflowData}>
                          <defs>
                            <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgba(110,231,183,0.45)" />
                              <stop offset="100%" stopColor="rgba(110,231,183,0)" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                          <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} width={48} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Area
                            type="monotone"
                            dataKey="income"
                            stroke="rgba(110,231,183,0.95)"
                            fill="url(#inc)"
                          />
                          <Area
                            type="monotone"
                            dataKey="expenses"
                            stroke="rgba(251,113,133,0.9)"
                            fill="transparent"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Panel>

                <Panel title="Allocation">
                  <div className="h-56">
                    {allocationPie.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Add accounts or holdings for allocation.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={allocationPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80}>
                            {allocationPie.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Panel>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Recent Expenses">
                  {(dash.data.recent_expenses ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No expenses yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {dash.data.recent_expenses.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/[0.03] px-3 py-2 text-sm"
                        >
                          <span>
                            <span className="text-muted-foreground">{e.category}</span> · {e.description}
                          </span>
                          <span className="tabular-nums text-rose-300">{money(e.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                <Panel title="Top Holdings">
                  {(dash.data.top_holdings ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No investments yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {dash.data.top_holdings.map((h) => (
                        <li
                          key={h.id}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/[0.03] px-3 py-2 text-sm"
                        >
                          <span>
                            {h.name}
                            {h.symbol ? ` · ${h.symbol}` : ""}
                          </span>
                          <span className="tabular-nums">{money(h.current_value)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "income" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-4">
            <Panel title="Add Income / Salary">
              <form className="grid gap-2" onSubmit={onAddIncome}>
                <select
                  className={selectClass}
                  value={incKind}
                  onChange={(e) => setIncKind(e.target.value as IncomeKind)}
                >
                  <option value="salary">Salary</option>
                  <option value="bonus">Bonus</option>
                  <option value="freelance">Freelance</option>
                  <option value="other">Other</option>
                </select>
                <Input
                  placeholder="Source / employer"
                  value={incSource}
                  onChange={(e) => setIncSource(e.target.value)}
                  required
                />
                <Input
                  placeholder="Amount"
                  type="number"
                  value={incAmount}
                  onChange={(e) => setIncAmount(e.target.value)}
                  required
                />
                <Input type="date" value={incDate} onChange={(e) => setIncDate(e.target.value)} />
                <Button type="submit">Add income</Button>
              </form>
            </Panel>

            <Panel title="Cash Accounts">
              <form className="mb-3 grid gap-2" onSubmit={onAddAccount}>
                <Input placeholder="Account name" value={accName} onChange={(e) => setAccName(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={selectClass}
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as AccountType)}
                  >
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                    <option value="wallet">Wallet</option>
                    <option value="credit">Credit</option>
                  </select>
                  <Input
                    placeholder="Balance"
                    type="number"
                    value={accBal}
                    onChange={(e) => setAccBal(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline">
                  Add account
                </Button>
              </form>
              {accounts.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (accounts.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No cash accounts.</p>
              ) : (
                <ul className="space-y-2">
                  {(accounts.data ?? []).map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-2xl bg-foreground/[0.03] px-3 py-2 text-sm"
                    >
                      <span>
                        {a.name} · <span className="text-muted-foreground">{a.account_type}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums">{money(a.balance)}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => m.deleteAccount.mutate(a.id)}
                        >
                          ×
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="xl:col-span-8">
            <Panel title="Income History">
              {incomes.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (incomes.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No income recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {(incomes.data ?? []).map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/[0.03] px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {i.source}{" "}
                          <span className="text-muted-foreground font-normal">· {i.kind}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{i.received_on}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-emerald-300">{money(i.amount)}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => m.deleteIncome.mutate(i.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "expenses" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <Panel title="Add Expense">
              <form className="grid gap-2" onSubmit={onAddExpense}>
                <select
                  className={selectClass}
                  value={expCat}
                  onChange={(e) => setExpCat(e.target.value as ExpenseCategory)}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Description"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  required
                />
                <Input
                  placeholder="Amount"
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  required
                />
                <Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                <Button type="submit">Add expense</Button>
              </form>
            </Panel>
          </div>
          <div className="xl:col-span-8">
            <Panel title="Expenses">
              {expenses.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (expenses.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(expenses.data ?? []).map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/[0.03] px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {e.description}{" "}
                          <span className="text-muted-foreground font-normal">· {e.category}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{e.spent_on}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-rose-300">{money(e.amount)}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => m.deleteExpense.mutate(e.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "investments" && (
        <div className="space-y-4">
          <Panel title="Add Holding">
            <form className="grid gap-2 md:grid-cols-6" onSubmit={onAddHolding}>
              <select
                className={selectClass}
                value={holdType}
                onChange={(e) => setHoldType(e.target.value as HoldingType)}
              >
                <option value="stock">Stock</option>
                <option value="mutual_fund">Mutual fund</option>
                <option value="other">Other</option>
              </select>
              <Input placeholder="Name" value={holdName} onChange={(e) => setHoldName(e.target.value)} required />
              <Input placeholder="Symbol" value={holdSymbol} onChange={(e) => setHoldSymbol(e.target.value)} />
              <Input placeholder="Units" type="number" value={holdUnits} onChange={(e) => setHoldUnits(e.target.value)} />
              <Input placeholder="Avg cost" type="number" value={holdAvg} onChange={(e) => setHoldAvg(e.target.value)} />
              <Input
                placeholder="Current price"
                type="number"
                value={holdPrice}
                onChange={(e) => setHoldPrice(e.target.value)}
              />
              <div className="md:col-span-6">
                <Button type="submit">Add holding</Button>
              </div>
            </form>
          </Panel>

          {(
            [
              ["Stocks", stocks],
              ["Mutual Funds", mfs],
              ["Other Investments", otherInv],
            ] as const
          ).map(([title, rows]) => (
            <Panel key={title} title={title}>
              {holdings.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet.</p>
              ) : (
                <ul className="space-y-2">
                  {rows.map((h) => (
                    <li
                      key={h.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-foreground/[0.03] px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {h.name}
                          {h.symbol ? ` · ${h.symbol}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Number(h.units)} units · avg {money(h.avg_cost)} · LTP {money(h.current_price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="tabular-nums font-medium">{money(h.current_value)}</p>
                          <p
                            className={`text-xs tabular-nums ${
                              Number(h.unrealized_pnl) >= 0 ? "text-emerald-300" : "text-rose-300"
                            }`}
                          >
                            {money(h.unrealized_pnl)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => m.deleteHolding.mutate(h.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ))}
        </div>
      )}

      {tab === "loans" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <Panel title="Add Loan">
              <form className="grid gap-2" onSubmit={onAddLoan}>
                <Input
                  placeholder="Loan name"
                  value={loanName}
                  onChange={(e) => setLoanName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Lender"
                  value={loanLender}
                  onChange={(e) => setLoanLender(e.target.value)}
                />
                <Input
                  placeholder="Principal"
                  type="number"
                  value={loanPrincipal}
                  onChange={(e) => setLoanPrincipal(e.target.value)}
                  required
                />
                <Input
                  placeholder="Outstanding"
                  type="number"
                  value={loanOutstanding}
                  onChange={(e) => setLoanOutstanding(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Interest %"
                    type="number"
                    value={loanRate}
                    onChange={(e) => setLoanRate(e.target.value)}
                  />
                  <Input
                    placeholder="EMI"
                    type="number"
                    value={loanEmi}
                    onChange={(e) => setLoanEmi(e.target.value)}
                  />
                </div>
                <select
                  className={selectClass}
                  value={loanStatus}
                  onChange={(e) => setLoanStatus(e.target.value as LoanStatus)}
                >
                  <option value="active">Active</option>
                  <option value="paid_off">Paid off</option>
                  <option value="defaulted">Defaulted</option>
                </select>
                <Button type="submit">Add loan</Button>
              </form>
            </Panel>
          </div>
          <div className="xl:col-span-8">
            <Panel title="Loans">
              {loans.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (loans.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No loans.</p>
              ) : (
                <ul className="space-y-2">
                  {(loans.data ?? []).map((l) => (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-foreground/[0.03] px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {l.name}
                          {l.lender ? ` · ${l.lender}` : ""}{" "}
                          <span className="text-muted-foreground font-normal">· {l.status}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Principal {money(l.principal)}
                          {l.emi != null ? ` · EMI ${money(l.emi)}` : ""}
                          {l.interest_rate != null ? ` · ${l.interest_rate}%` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-rose-300">{money(l.outstanding)}</span>
                        {l.status === "active" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              m.updateLoan.mutate({ id: l.id, body: { status: "paid_off", outstanding: 0 } })
                            }
                          >
                            Mark paid
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => m.deleteLoan.mutate(l.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Monthly Cashflow">
              <div className="h-64">
                {cashflowData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashflowData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} width={48} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="income" fill="rgba(110,231,183,0.75)" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="expenses" fill="rgba(251,113,133,0.7)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>

            <Panel title="Expenses by Category (this month)">
              <div className="h-64">
                {expensePie.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expenses this month.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expensePie} dataKey="value" nameKey="name" outerRadius={90}>
                        {expensePie.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>
          </div>

          <Panel title="Monthly Reports">
            {reports.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (reports.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Month</th>
                      <th className="pb-2 font-medium">Salary</th>
                      <th className="pb-2 font-medium">Income</th>
                      <th className="pb-2 font-medium">Expenses</th>
                      <th className="pb-2 font-medium">Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reports.data ?? []).map((r) => (
                      <tr key={r.month} className="border-t border-white/5">
                        <td className="py-2.5">{r.month}</td>
                        <td className="py-2.5 tabular-nums">{money(r.salary)}</td>
                        <td className="py-2.5 tabular-nums text-emerald-300">{money(r.income)}</td>
                        <td className="py-2.5 tabular-nums text-rose-300">{money(r.expenses)}</td>
                        <td
                          className={`py-2.5 tabular-nums ${
                            Number(r.savings) >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {money(r.savings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {charts.data?.net_worth ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Stat label="Cash" value={money(charts.data.net_worth.cash)} />
              <Stat label="Stocks" value={money(charts.data.net_worth.stocks)} />
              <Stat label="Mutual funds" value={money(charts.data.net_worth.mutual_funds)} />
              <Stat label="Other" value={money(charts.data.net_worth.other_investments)} />
              <Stat label="Loans" value={money(charts.data.net_worth.loans)} tone={-1} />
              <Stat
                label="Net worth"
                value={money(charts.data.net_worth.net_worth)}
                tone={Number(charts.data.net_worth.net_worth)}
              />
            </div>
          ) : null}
        </div>
      )}
    </ModuleHomeShell>
  )
}
