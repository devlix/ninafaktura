/* =============  firebase.js  ===================
 * ONLY setup related stuff - Henter rådata fra Google.
 * =============================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

// --- AUTHENTICATION
import {
  getAuth,
  // signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- FIRESTORE - DB STUFF
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager, // lagrer på disk
  // memoryLocalCache ,  // sletter alt når fanen lukkes).
  /*   
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    setDoc,
    deleteDoc,
   */
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- INITALIZE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAzxjkVdltn8y2xYV9xMjQye9p2XDJ_VkQ",
  authDomain: "ninafaktura.firebaseapp.com",
  projectId: "ninafaktura",
  storageBucket: "ninafaktura.firebasestorage.app",
  messagingSenderId: "569938023030",
  appId: "1:569938023030:web:242c3d9e1c79d4e8544557",
};

const app = initializeApp(firebaseConfig);

// EXPORT FUNCTIONS AND VALUES
// OLD SKOOL: export const db = getFirestore(app);
// Modern way: includes configuration settings (here: PERSISTENCE)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// force user to choose and accout next time they log in
provider.setCustomParameters({
  prompt: "select_account",
});

/* 
// Enabe Persistence
======= Firebase Persistence
*Ansvar*:
    Lagrer selve dataene (fakturaene dine, brukerinfo osv.) i en lokal 
    database i nettleseren (IndexedDB).
*Nivå*:
    Applikasjons/Data-nivå. Det er en del av Firebase-biblioteket
    du kjører i din app.js.
*Mål*:
    Sørge for at db.collection('invoices').get() returnerer data
    umiddelbart fra disk hvis nettet er nede.
----------------------------
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  console.error("Persistence feilet:", err.code);
  if (err.code == "failed-precondition") {
    // Flere faner åpne samtidig?
    alert("Please don´t have more than ONE (1) instance running!! ");
  } else if (err.code == "unimplemented") {
    // Nettleseren støtter det ikke
    alert(
      "Din nettleser (konfigurasjon) støtter ikke lagring i lokal indexDB!\n\n" +
        "   --> Sørg for å være online!!" +
        "   --> Full funksjonalitet sålenge du er på nett"
    );
  }
});
 */
