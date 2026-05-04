/* =============  invoices.js  ===================
 * Håndterer logikk og databasekall (henting/lagring av data)
 * =============================================== */

import { db } from "./firebase.js";
import { renderInvoices } from "./ui.js";
import {
  collection,
  addDoc,
  runTransaction,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ---- avoid race / collission use transaction to avoid race conditions
// ---- use counter/invoice document for Faktura-Nr
export async function createInvoice(data) {
  return await addDoc(collection(db, "invoices"), data);
}
async function saveInvoice_old(data) {
  const docRef = await addDoc(collection(db, "invoices"), data);
  return docRef.id;
}

export async function saveInvoice(invoice) {
  await runTransaction(db, async (transaction) => {
    // get and set faktura-nr
    const counterRef = doc(db, "counters", "invoice");
    const counterSnap = await transaction.get(counterRef);

    let current = 0;

    if (!counterSnap.exists()) {
      current = 0;
      transaction.set(counterRef, { currentNumber: 1 });
    } else {
      current = counterSnap.data().currentNumber;
      transaction.update(counterRef, {
        currentNumber: current + 1,
      });
    }

    const nextNumber = current + 1;
    const padded = String(nextNumber).padStart(6, "0");

    // create new invoice in firestore
    const invoiceRef = doc(collection(db, "invoices"));

    // write to new invoice
    transaction.set(invoiceRef, {
      invoiceNumber: padded, // 👈 formatted
      invoiceNumberRaw: nextNumber, // 👈 optional (super useful)
      createdAt: new Date(),
      status: "draft",
    });
  });
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
