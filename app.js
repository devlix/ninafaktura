// 1. imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
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

// 2. config + init
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAzxjkVdltn8y2xYV9xMjQye9p2XDJ_VkQ",
  authDomain: "ninafaktura.firebaseapp.com",
  projectId: "ninafaktura",
  storageBucket: "ninafaktura.firebasestorage.app",
  messagingSenderId: "569938023030",
  appId: "1:569938023030:web:242c3d9e1c79d4e8544557",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 3. auth state / setup
let currentUser = null;

document.getElementById("login").onclick = async () => {
  await signInWithPopup(auth, provider);
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadInvoices();
  } else {
    currentUser = null;
  }
});

// 4. UI handlers (knapper) - ("add invoice" etc)
document.getElementById("add").onclick = async () => {
  if (!currentUser) {
    alert("Login først");
    return;
  }

  await addDoc(collection(db, "invoices"), {
    id: "INV-001",
    ownerId: currentUser.uid,
    total: 1000,
    status: "draft",
    createdAt: new Date(),
  });

  loadInvoices();
};

// 5. funksjoner (loadInvoices etc.)
async function loadInvoices() {
  if (!currentUser) return;

  const q = query(
    collection(db, "invoices"),
    where("ownerId", "==", currentUser.uid)
  );

  const snapshot = await getDocs(q);

  let data = [];
  snapshot.forEach((doc) => data.push(doc.data()));

  document.getElementById("output").textContent = JSON.stringify(data, null, 2);
}
