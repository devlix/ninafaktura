/* =============  invoices.js  ===================
 * All logikk mot Firestore:
 * =============================================== */

import { db } from "./firebase.js";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

export async function createInvoice(data) {
  return await addDoc(collection(db, "invoices"), data);
}

export async function getInvoices(userId) {
  const q = query(collection(db, "invoices"), where("ownerId", "==", userId));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
