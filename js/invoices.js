/* =============  invoices.js  ===================
 * Håndterer logikk og databasekall (henting/lagring av data)
 * =============================================== */

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  limit,
  runTransaction,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// import { renderInvoicePreview, renderInvoices } from "./ui.js";

// ---- avoid race / collission use transaction to avoid race conditions
// ---- use counter/invoice document for Faktura-Nr
// TODO: name not ideal - rename to createInvoice??
export async function saveInvoice(invoice) {
  return await runTransaction(db, async (transaction) => {
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
      ...invoice, // flatten invoice !!
      //  ownerId: user.uid, // NEEDE, used in firebase rules!!
      invoiceNumber: padded, // 👈 formatted
      invoiceNumberRaw: nextNumber, // 👈 optional (super useful)
    });

    console.log("invoice number new invoice: ", padded);
    return padded; // this needs the runTransaction be called with "return"!!
  });
}

/* ------ not needed anymore - replaced by onSnapshot listener!!
export async function loadInvoices(userId) {
  if (!userId) return;
  const q = query(collection(db, "invoices"), where("ownerId", "==", userId));

  const snapshot = await getDocs(q);
  // transform (map) the firebase object now to make rest of code
  // independent of firebase format, i.e. easy to use aneother DB
  // later if wnated without having to change app.js ui,js, ...
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
*/

/* parameer allInv is an array - loadInvoices() / onSnapShot() returns an array!!
 */
export function getLatestInvoice(allInv) {
  if (!allInv || allInv.length === 0) {
    console.log("no invoices for current user");
    return null;
  }
  // Sorterer basert på et dato-felt og tar den siste
  return allInv.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)[0];
}

// ======= Listners ==========
// ===========================

// ===== Firebase listener - subsribt to anything
// returns an unsubscribe fundtion !!
/*
 TODO: Her bør vi ha mulighet for sortering av dato først
     dette spesielt fi ha "bare" *50000* dokumenter per dag fri og da kan
     det hende at vi må hente 1000 dok føre vi finner aktuell kunde ...
 */
export function subscribeToInvoices(userId, onChange) {
  const q = query(
    collection(db, "invoices"),
    where("ownerId", "==", userId),
    orderBy("customer.name", "asc"),
    orderBy("invoiceNumberRaw", "desc"),
    limit(50)
  );
  console.log("now in subscribeToInvoices --> userId: ", userId);
  return onSnapshot(q, (snapshot) => {
    // alert("Updating data ...");

    const invoices = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Kommer data fra cache eller nett - nice to have NOT essential!?
      erFraCache: doc.metadata.fromCache,
    }));

    onChange(invoices);
  });
}
