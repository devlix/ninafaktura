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

let selectedInvoice = null; // holder valgt invoice

async function loadInvoices() {
  if (!currentUser) return;

  const q = query(
    collection(db, "invoices"),
    where("ownerId", "==", currentUser.uid)
  );

  const snapshot = await getDocs(q);

  // hent data fra firebase og send til rendering for PDF
  snapshot.forEach((doc) => {
    selectedInvoice = doc.data(); // ta første for test
  });

  renderInvoice(selectedInvoice); // fyll HTML før PDF
}

function renderInvoice(invoice) {
  const el = document.getElementById("invoice-content");

  el.innerHTML = `
    <!-- Kundeinfo -->
    <p><strong>Kunde:</strong> ${invoice.customer?.name || ""}</p>

    <!-- Tabell -->
    <table style="width:100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align:left; border-bottom:1px solid #ccc;">Beskrivelse</th>
          <th>Antall</th>
          <th>Pris</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items
          ?.map(
            (item) => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${item.unitPrice} kr</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <!-- Total -->
    <h2 style="text-align:right;">Total: ${invoice.total} kr</h2>
  `;
}

// GENERER PDF
document.getElementById("downloadPdf").onclick = async () => {
  const { jsPDF } = window.jspdf;
  const invoiceElement = document.getElementById("invoice");

  // gjør HTML om til canvas (bilde)
  const canvas = await html2canvas(invoiceElement);
  const imgData = canvas.toDataURL("image/png");
  const doc = new jsPDF("p", "mm", "a4");

  // legg bilde inn i PDF (skalert til A4)
  doc.addImage(imgData, "PNG", 10, 10, 190, 0);
  doc.save("invoice.pdf");
};
