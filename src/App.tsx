import { useEffect, useState } from 'react'
import {
  FloatLine,
  Transaction,
  addFloatLine,
  getFloatLines,
  deleteFloatLine,
  updateFloatLineBalances,
  addTransaction,
  getTransactions,
} from './firestoreData'

function App() {
  const [floatLines, setFloatLines] = useState<FloatLine[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      const [lines, txns] = await Promise.all([getFloatLines(), getTransactions()])
      setFloatLines(lines)
      setTransactions(txns)
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

    // cash_in: customer deposits cash, agent sends float -> float decreases, cash increases
    // cash_out: customer withdraws cash, agent takes float -> float increases, cash decreases
    let newFloat = line.floatBalance
    let newCash = line.cashBalance

    if (transactionType === 'cash_in') {
      newFloat -= amt
      newCash += amt
    } else if (transactionType === 'cash_out') {
      newFloat += amt
      newCash -= amt
    }
    // airtime / bill_payment: float decreases, no cash change (paid via float directly)
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

  return (
    <div className="app-container">
      <h1>FloatMaster Uganda</h1>
      <p>Mobile Money Agent Management</p>

      {error && <p className="error-text">{error}</p>}

      <section>
        <h2>Float Lines</h2>
        <form onSubmit={handleAddFloatLine} className="product-form">
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
          <button type="submit">Add Float Line</button>
        </form>

        {loading ? (
          <p>Loading...</p>
        ) : floatLines.length === 0 ? (
          <p>No float lines yet. Add one above.</p>
        ) : (
          <table className="product-table">
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
                    <button onClick={() => handleDeleteFloatLine(l.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Record Transaction</h2>
        <form onSubmit={handleAddTransaction} className="product-form">
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
          <button type="submit">Record Transaction</button>
        </form>

        {transactions.length === 0 ? (
          <p>No transactions yet.</p>
        ) : (
          <table className="product-table">
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
                  <td>{t.customerName || '-'}</td>
                  <td>{t.amount.toLocaleString()}</td>
                  <td>{t.commissionEarned.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default App
