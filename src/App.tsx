import { useEffect, useState } from 'react'
import {
  FloatLine,
  Transaction,
  SavingsEntry,
  SavingsGoal,
  addFloatLine,
  getFloatLines,
  deleteFloatLine,
  updateFloatLineBalances,
  addTransaction,
  getTransactions,
  addSavingsEntry,
  getSavingsEntries,
  deleteSavingsEntry,
  getSavingsGoal,
  setSavingsGoal,
} from './firestoreData'

type Tab = 'float' | 'transactions' | 'savings' | 'goal' | 'summaries'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('float')

  const [floatLines, setFloatLines] = useState<FloatLine[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [savingsEntries, setSavingsEntries] = useState<SavingsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Savings form
  const [savingsDate, setSavingsDate] = useState('')
  const [allowance, setAllowance] = useState('10000')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [expenseCategory, setExpenseCategory] = useState<
    'transport' | 'food' | 'airtime' | 'other'
  >('transport')

  // Savings goal
  const [savingsGoal, setSavingsGoalState] = useState<SavingsGoal | null>(null)
  const [goalAmount, setGoalAmount] = useState('')
  const [goalDate, setGoalDate] = useState('')

  // Float line form
  const [provider, setProvider] = useState<'mtn_momo' | 'airtel_money'>('mtn_momo')
  const [lineName, setLineName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [floatBalance, setFloatBalance] = useState('')
  const [cashBalance, setCashBalance] = useState('')

  // Transaction form
  const [selectedLineId, setSelectedLineId] = useState('')
  const [transactionType, setTransactionType] = useState<
    'cash_in' | 'cash_out' | 'airtime' | 'bill_payment'
  >('cash_in')
  const [amount, setAmount] = useState('')
  const [commission, setCommission] = useState('')
  const [customerName, setCustomerName] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const [lines, txns, savings, goal] = await Promise.all([
        getFloatLines(),
        getTransactions(),
        getSavingsEntries(),
        getSavingsGoal(),
      ])
      setFloatLines(lines)
      setTransactions(txns)
      setSavingsEntries(savings)
      setSavingsGoalState(goal)
      if (lines.length > 0 && !selectedLineId) {
        setSelectedLineId(lines[0].id!)
      }
    } catch (err) {
      setError('Failed to load data. Check your Firestore setup.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAddFloatLine(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!lineName || !phoneNumber || !floatBalance || !cashBalance) {
      setError('Please fill in all float line fields.')
      return
    }
    try {
      await addFloatLine({
        provider,
        lineName,
        phoneNumber,
        floatBalance: parseFloat(floatBalance),
        cashBalance: parseFloat(cashBalance),
      })
      setLineName('')
      setPhoneNumber('')
      setFloatBalance('')
      setCashBalance('')
      loadData()
    } catch (err) {
      setError('Failed to add float line.')
    }
  }

  async function handleDeleteFloatLine(id: string | undefined) {
    if (!id) return
    try {
      await deleteFloatLine(id)
      loadData()
    } catch (err) {
      setError('Failed to delete float line.')
    }
  }

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!selectedLineId || !amount) {
      setError('Please select a float line and enter an amount.')
      return
    }

    const line = floatLines.find((l) => l.id === selectedLineId)
    if (!line) {
      setError('Selected float line not found.')
      return
    }

    const amt = parseFloat(amount)
    const comm = parseFloat(commission || '0')

    let newFloat = line.floatBalance
    let newCash = line.cashBalance

    if (transactionType === 'cash_in') {
      newFloat -= amt
      newCash += amt
    } else if (transactionType === 'cash_out') {
      newFloat += amt
      newCash -= amt
    }
    if (transactionType === 'airtime' || transactionType === 'bill_payment') {
      newFloat -= amt
    }

    try {
      await addTransaction({
        floatLineId: selectedLineId,
        transactionType,
        amount: amt,
        commissionEarned: comm,
        customerName: customerName || undefined,
      })
      await updateFloatLineBalances(selectedLineId, newFloat, newCash)
      setAmount('')
      setCommission('')
      setCustomerName('')
      loadData()
    } catch (err) {
      setError('Failed to record transaction.')
    }
  }

  async function handleAddSavingsEntry(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!savingsDate || !allowance || !expenseAmount) {
      setError('Please fill in date, allowance, and expense amount.')
      return
    }

    try {
      await addSavingsEntry({
        date: savingsDate,
        allowance: parseFloat(allowance),
        expenseAmount: parseFloat(expenseAmount),
        expenseNote: expenseNote || undefined,
        expenseCategory,
      })
      setSavingsDate('')
      setExpenseAmount('')
      setExpenseNote('')
      loadData()
    } catch (err) {
      setError('Failed to add savings entry.')
    }
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!goalAmount || !goalDate) {
      setError('Please enter both a target amount and target date for your goal.')
      return
    }
    try {
      await setSavingsGoal({
        targetAmount: parseFloat(goalAmount),
        targetDate: goalDate,
      })
      loadData()
    } catch (err) {
      setError('Failed to save goal.')
    }
  }

  async function handleDeleteSavingsEntry(id: string | undefined) {
    if (!id) return
    try {
      await deleteSavingsEntry(id)
      loadData()
    } catch (err) {
      setError('Failed to delete savings entry.')
    }
  }

  const totalSaved = savingsEntries.reduce((sum, e) => sum + e.savedAmount, 0)
  const totalAllowance = savingsEntries.reduce((sum, e) => sum + e.allowance, 0)
  const totalSpent = savingsEntries.reduce((sum, e) => sum + e.expenseAmount, 0)

  let runningBalance = 0
  const savingsWithBalance = savingsEntries.map((e) => {
    runningBalance += e.savedAmount
    return { ...e, runningBalance }
  })

  function getWeekKey(dateStr: string) {
    const d = new Date(dateStr)
    const janFirst = new Date(d.getFullYear(), 0, 1)
    const days = Math.floor((d.getTime() - janFirst.getTime()) / 86400000)
    const week = Math.ceil((days + janFirst.getDay() + 1) / 7)
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
  }

  const weeklySummary: Record<string, number> = {}
  const monthlySummary: Record<string, number> = {}
  savingsEntries.forEach((e) => {
    const weekKey = getWeekKey(e.date)
    const monthKey = e.date.slice(0, 7)
    weeklySummary[weekKey] = (weeklySummary[weekKey] || 0) + e.savedAmount
    monthlySummary[monthKey] = (monthlySummary[monthKey] || 0) + e.savedAmount
  })

  const categoryBreakdown: Record<string, number> = {}
  savingsEntries.forEach((e) => {
    categoryBreakdown[e.expenseCategory] =
      (categoryBreakdown[e.expenseCategory] || 0) + e.expenseAmount
  })

  const goalProgress = savingsGoal
    ? Math.min((totalSaved / savingsGoal.targetAmount) * 100, 100)
    : 0

  const tabs: { key: Tab; label: string }[] = [
    { key: 'float', label: 'Float Lines' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'savings', label: 'Savings' },
    { key: 'goal', label: 'Goal' },
    { key: 'summaries', label: 'Summaries' },
  ]

  return (
    <div className="shell">
      <header className="shell-header">
        <h1 className="shell-title">FloatMaster Uganda</h1>
        <p className="shell-subtitle">Mobile Money Agent Ledger</p>
        <div className="stripe" />
      </header>

      <nav className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="ledger-wrap">
        <div className="ledger">
          {error && <div className="error-banner">{error}</div>}

          {activeTab === 'float' && (
            <>
              <h2>Float Lines</h2>
              <p className="ledger-intro">
                Your MTN MoMo and Airtel Money lines — float (e-money) and physical cash on hand.
              </p>

              <form onSubmit={handleAddFloatLine} className="field-row">
                <select value={provider} onChange={(e) => setProvider(e.target.value as any)}>
                  <option value="mtn_momo">MTN MoMo</option>
                  <option value="airtel_money">Airtel Money</option>
                </select>
                <input
                  type="text"
                  placeholder="Line name"
                  value={lineName}
                  onChange={(e) => setLineName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Float balance"
                  value={floatBalance}
                  onChange={(e) => setFloatBalance(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Cash balance"
                  value={cashBalance}
                  onChange={(e) => setCashBalance(e.target.value)}
                />
                <button type="submit">Add Line</button>
              </form>

              {loading ? (
                <p className="empty-note">Loading...</p>
              ) : floatLines.length === 0 ? (
                <p className="empty-note">No float lines yet. Add one above to get started.</p>
              ) : (
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Line</th>
                      <th>Phone</th>
                      <th>Float</th>
                      <th>Cash</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {floatLines.map((l) => (
                      <tr key={l.id}>
                        <td>{l.provider === 'mtn_momo' ? 'MTN MoMo' : 'Airtel Money'}</td>
                        <td>{l.lineName}</td>
                        <td>{l.phoneNumber}</td>
                        <td>{l.floatBalance.toLocaleString()}</td>
                        <td>{l.cashBalance.toLocaleString()}</td>
                        <td>
                          <button className="btn-danger" onClick={() => handleDeleteFloatLine(l.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeTab === 'transactions' && (
            <>
              <h2>Record Transaction</h2>
              <p className="ledger-intro">
                Every cash-in, cash-out, airtime sale, or bill payment updates the float line automatically.
              </p>

              <form onSubmit={handleAddTransaction} className="field-row">
                <select value={selectedLineId} onChange={(e) => setSelectedLineId(e.target.value)}>
                  <option value="">Select float line</option>
                  {floatLines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lineName} ({l.provider === 'mtn_momo' ? 'MTN' : 'Airtel'})
                    </option>
                  ))}
                </select>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as any)}
                >
                  <option value="cash_in">Cash In (Deposit)</option>
                  <option value="cash_out">Cash Out (Withdraw)</option>
                  <option value="airtime">Airtime</option>
                  <option value="bill_payment">Bill Payment</option>
                </select>
                <input
                  type="text"
                  placeholder="Customer name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Commission earned"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                />
                <button type="submit">Record</button>
              </form>

              {transactions.length === 0 ? (
                <p className="empty-note">No transactions recorded yet.</p>
              ) : (
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td>{t.transactionType.replace('_', ' ')}</td>
                        <td>{t.customerName || '—'}</td>
                        <td>{t.amount.toLocaleString()}</td>
                        <td>{t.commissionEarned.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeTab === 'savings' && (
            <>
              <h2>Daily Savings Tracker</h2>
              <p className="ledger-intro">
                Log your daily allowance and expenses — the ledger works out what you saved.
              </p>

              <div className="summary-strip">
                <div className="summary-pill">
                  Allowance<strong>{totalAllowance.toLocaleString()}</strong>
                </div>
                <div className="summary-pill">
                  Spent<strong>{totalSpent.toLocaleString()}</strong>
                </div>
                <div className="summary-pill positive">
                  Saved<strong>{totalSaved.toLocaleString()}</strong>
                </div>
              </div>

              <form onSubmit={handleAddSavingsEntry} className="field-row">
                <input
                  type="date"
                  value={savingsDate}
                  onChange={(e) => setSavingsDate(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Daily allowance"
                  value={allowance}
                  onChange={(e) => setAllowance(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Expense amount"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Expense note"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                />
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                >
                  <option value="transport">Transport</option>
                  <option value="food">Food</option>
                  <option value="airtime">Airtime</option>
                  <option value="other">Other</option>
                </select>
                <button type="submit">Add Entry</button>
              </form>

              {savingsWithBalance.length === 0 ? (
                <p className="empty-note">No savings entries yet. Add yesterday's entry above.</p>
              ) : (
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Allowance</th>
                      <th>Expense</th>
                      <th>Category</th>
                      <th>Note</th>
                      <th>Saved</th>
                      <th>Balance</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsWithBalance.map((s) => (
                      <tr key={s.id}>
                        <td>{s.date}</td>
                        <td>{s.allowance.toLocaleString()}</td>
                        <td>{s.expenseAmount.toLocaleString()}</td>
                        <td>{s.expenseCategory}</td>
                        <td>{s.expenseNote || '—'}</td>
                        <td>{s.savedAmount.toLocaleString()}</td>
                        <td>{s.runningBalance.toLocaleString()}</td>
                        <td>
                          <button
                            className="btn-danger"
                            onClick={() => handleDeleteSavingsEntry(s.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeTab === 'goal' && (
            <>
              <h2>Savings Goal</h2>
              <p className="ledger-intro">Set a target and watch the progress fill in as you save.</p>

              {savingsGoal && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', margin: 0 }}>
                    Target: {savingsGoal.targetAmount.toLocaleString()} by {savingsGoal.targetDate}
                  </p>
                  <div className="goal-progress-track">
                    <div
                      className={`goal-progress-fill ${goalProgress >= 100 ? 'complete' : ''}`}
                      style={{ width: `${goalProgress}%` }}
                    />
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', margin: 0 }}>
                    {totalSaved.toLocaleString()} saved ({goalProgress.toFixed(1)}% of goal)
                  </p>
                </div>
              )}

              <form onSubmit={handleSaveGoal} className="field-row">
                <input
                  type="number"
                  placeholder="Target amount"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                />
                <input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
                <button type="submit">{savingsGoal ? 'Update Goal' : 'Set Goal'}</button>
              </form>
            </>
          )}

          {activeTab === 'summaries' && (
            <>
              <h2>Summaries</h2>
              <p className="ledger-intro">Savings grouped by week and month, plus spending by category.</p>

              <div className="summary-grid">
                <div>
                  <h3>Weekly Savings</h3>
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>Week</th>
                        <th>Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(weeklySummary).map(([week, total]) => (
                        <tr key={week}>
                          <td>{week}</td>
                          <td>{total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3>Monthly Savings</h3>
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(monthlySummary).map(([month, total]) => (
                        <tr key={month}>
                          <td>{month}</td>
                          <td>{total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3>Spending by Category</h3>
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(categoryBreakdown).map(([cat, total]) => (
                        <tr key={cat}>
                          <td>{cat}</td>
                          <td>{total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
