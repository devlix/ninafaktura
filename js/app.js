// 1. ========= imports
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

// 2. ========= config + init
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

// 3. ========= auth state / setup
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

// 4. ========= UI handlers (knapper) - ("add invoice" etc)
document.getElementById("add").onclick = async () => {
  if (!currentUser) {
    alert("Login først");
    return;
  }

  await addDoc(collection(db, "invoices"), {
    id: "INV-002",
    ownerId: currentUser.uid,
    status: "draft",

    createdAt: new Date(),

    customer: {
      name: "Kunde AS",
      email: "kunde@mail.no",
      address: "Oslo",
    },

    items: [
      {
        description: "Konsulentarbeid",
        quantity: 10,
        unitPrice: 1000,
        vatRate: 0.25,
      },
    ],

    subtotal: 10000,
    vatTotal: 2500,
    total: 12500,
  });

  loadInvoices();
};

// 5. ========= funksjoner (loadInvoices etc.)

let selectedInvoice = null; // holder valgt invoice

async function loadInvoices() {
  if (!currentUser) return;

  const q = query(
    collection(db, "invoices"),
    where("ownerId", "==", currentUser.uid)
  );

  const snapshot = await getDocs(q);

  // reset først
  selectedInvoice = null;

  // hent data fra firebase og send til rendering for PDF
  snapshot.forEach((doc) => {
    selectedInvoice = doc.data(); // ta første for test
  });

  // kall KUN hvis vi faktisk har data
  if (selectedInvoice) {
    renderInvoice(selectedInvoice);
  } else {
    console.warn("No invoices found");
    alert("!! No invoice found !!");
  }
}

function renderInvoice(invoice) {
  // stopp hvis ingen invoice
  if (!invoice) {
    console.warn("No invoice to render");
    alert("!! No invoice found !!");
    return;
  }
  // sett faktura info
  document.getElementById("inv-number").innerText = "Nr: " + invoice.id;

  document.getElementById("inv-date").innerText =
    "Dato: " + new Date(invoice.createdAt).toLocaleDateString();

  // kundeinfo
  document.getElementById("customer").innerHTML = `
    ${invoice.customer?.name || ""}<br>
    ${invoice.customer?.address || ""}<br>
    ${invoice.customer?.email || ""}
  `;

  // items
  const itemsEl = document.getElementById("items");

  // fallback hvis items mangler
  const items = invoice.items || [];

  itemsEl.innerHTML = items
    .map((item) => {
      const sum = item.quantity * item.unitPrice;
      const vat = sum * item.vatRate;

      return `
      
      <tr style="border-bottom:1px solid #ccc;">

      <td>${item.description}</td>
      <td>${item.quantity}</td>
      <td>${item.unitPrice}</td>
      <td>${vat.toFixed(0)}</td>
      <td>${sum}</td>
    </tr>
  `;
    })
    .join("");

  // FIXME - debug: se hele objektet
  // console.log("invoice:", invoice);

  // totals
  document.getElementById("subtotal").innerText = invoice.subtotal;
  document.getElementById("vat").innerText = invoice.vatTotal;
  document.getElementById("total").innerText = invoice.total;
}

// Ggenerer PDF og åpne mail for user
//    !! NOTE:
//    !! Browser kan ikke legge ved filer automatisk i email
//    !! Bruker må selv legge ved PDF manuelt
document.getElementById("sendEmail").onclick = async () => {
  const { jsPDF } = window.jspdf;

  const el = document.getElementById("invoice");

  // 1. generer PDF fra HTML
  const canvas = await html2canvas(el, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  const doc = new jsPDF("p", "mm", "a4");

  const imgWidth = 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  doc.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

  // 2. last ned PDF (bruker må legge ved selv)
  const fileName = `invoice-${selectedInvoice.id}.pdf`;
  doc.save(fileName);

  // 3. lag mail
  const email = selectedInvoice.customer?.email || "";

  const subject = encodeURIComponent("Faktura " + selectedInvoice.id);

  const body = encodeURIComponent(
    `Hei,

Se vedlagt faktura (${fileName}).

Mvh`
  );

  // 4. åpne e-postklient
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
};
