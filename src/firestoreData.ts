import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebaseConfig'

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
