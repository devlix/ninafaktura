/* =============  invoices.js  ===================
 * Håndterer logikk og databasekall (henting/lagring av data)
 * =============================================== */

import { db } from "./firebase.js";
import { renderInvoices } from "./ui.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function createInvoice(data) {
  return await addDoc(collection(db, "invoices"), data);
}

export async function loadInvoices(userId) {
  if (!userId) return;
  const q = query(collection(db, "invoices"), where("ownerId", "==", userId));

  const snapshot = await getDocs(q);
  // transform (map) the firebase object now to make rest of code
  // independent of firebase format, i.e. easy to use aneother DB
  // later if wnated without having to change app.js ui,js, ...
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/* parameer allInv is an array (loadInvoices() returns an array!!9
 */
export function getLatestInvoice(allInv) {
  if (allInv.length === 0) {
    console.log("no invoices for current user");
    return null;
  }
  // Sorterer basert på et dato-felt og tar den siste
  return allInv.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)[0];
}
