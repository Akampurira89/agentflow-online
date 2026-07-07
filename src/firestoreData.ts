import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebaseConfig'

// ============================================
// FLOAT LINES (MTN MoMo / Airtel Money accounts)
// ============================================
export interface FloatLine {
  id?: string
  provider: 'mtn_momo' | 'airtel_money'
  lineName: string
  phoneNumber: string
  floatBalance: number
  cashBalance: number
}

const floatLinesCollection = collection(db, 'floatLines')

export async function addFloatLine(line: Omit<FloatLine, 'id'>) {
  return addDoc(floatLinesCollection, {
    ...line,
    createdAt: serverTimestamp(),
  })
}

export async function getFloatLines(): Promise<FloatLine[]> {
  const snapshot = await getDocs(floatLinesCollection)
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<FloatLine, 'id'>),
  }))
}

export async function deleteFloatLine(id: string) {
  return deleteDoc(doc(db, 'floatLines', id))
}

export async function updateFloatLineBalances(
  id: string,
  floatBalance: number,
  cashBalance: number
) {
  return updateDoc(doc(db, 'floatLines', id), { floatBalance, cashBalance })
}

// ============================================
// TRANSACTIONS
// ============================================
export interface Transaction {
  id?: string
  floatLineId: string
  transactionType: 'cash_in' | 'cash_out' | 'airtime' | 'bill_payment'
  amount: number
  commissionEarned: number
  customerName?: string
  createdAt?: any
}

const transactionsCollection = collection(db, 'transactions')

export async function addTransaction(transaction: Omit<Transaction, 'id'>) {
  return addDoc(transactionsCollection, {
    ...transaction,
    createdAt: serverTimestamp(),
  })
}

export async function getTransactions(): Promise<Transaction[]> {
  const snapshot = await getDocs(transactionsCollection)
  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Transaction, 'id'>),
    }))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

// ============================================
// DAILY SAVINGS
// ============================================
export interface SavingsEntry {
  id?: string
  date: string // YYYY-MM-DD
  allowance: number
  expenseAmount: number
  expenseNote?: string
  expenseCategory: 'transport' | 'food' | 'airtime' | 'other'
  savedAmount: number
}

const savingsCollection = collection(db, 'savingsEntries')

export async function addSavingsEntry(entry: Omit<SavingsEntry, 'id' | 'savedAmount'>) {
  const savedAmount = entry.allowance - entry.expenseAmount
  return addDoc(savingsCollection, {
    ...entry,
    savedAmount,
    createdAt: serverTimestamp(),
  })
}

export async function getSavingsEntries(): Promise<SavingsEntry[]> {
  const snapshot = await getDocs(savingsCollection)
  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<SavingsEntry, 'id'>),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function deleteSavingsEntry(id: string) {
  return deleteDoc(doc(db, 'savingsEntries', id))
}

// ============================================
// SAVINGS GOAL (single document)
// ============================================
export interface SavingsGoal {
  targetAmount: number
  targetDate: string
}

const savingsGoalDocRef = doc(db, 'settings', 'savingsGoal')

export async function getSavingsGoal(): Promise<SavingsGoal | null> {
  const snap = await getDoc(savingsGoalDocRef)
  if (!snap.exists()) return null
  return snap.data() as SavingsGoal
}

export async function setSavingsGoal(goal: SavingsGoal) {
  return setDoc(savingsGoalDocRef, goal)
}
