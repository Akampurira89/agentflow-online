import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCv8vz_hcFvqw-PO7HXFk5R2XBWKvPncow",
  authDomain: "agentflow-online.firebaseapp.com",
  projectId: "agentflow-online",
  storageBucket: "agentflow-online.firebasestorage.app",
  messagingSenderId: "112874706748",
  appId: "1:112874706748:web:90c9cb06747fdff6bdb039",
  measurementId: "G-4D529CHP03"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
