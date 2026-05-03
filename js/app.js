// TODO: FORTSETTER på punkt 2 og 3 i siste chat-melding
// ==============
// TODO: Ikke sikker om "removew" knappen skal gjelde for alle rader (addEvent på document - skulle dette heller være en knapp for hver rad, selv om det er litt mer kode som trengs da??)
//==============

// 1. ========= imports
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { auth, db, provider } from "./firebase.js";
import { renderInvoices, renderInvoice, viewDetails } from "./ui.js";
import { createInvoice, loadInvoices, getLatestInvoice } from "./invoices.js";

import {
  //  getFirestore,
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
  //  getAuth,
  signInWithPopup,
  //  GoogleAuthProvider,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/* 
const firebaseConfig = {
  apiKey: "AIzaSyAzxjkVdltn8y2xYV9xMjQye9p2XDJ_VkQ",
  authDomain: "ninafaktura.firebaseapp.com",
  projectId: "ninafaktura",
  storageBucket: "ninafaktura.firebasestorage.app",
  messagingSenderId: "569938023030",
  appId: "1:569938023030:web:242c3d9e1c79d4e8544557",
};
*/
/* 
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
*/

// 3. ========= auth state / setup
let currentUser = null;
let myInvoices = null;
let selectedInvoice = null; // holder valgt invoice

document.getElementById("login").onclick = async () => {
  await signInWithPopup(auth, provider);
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // console.log("currentUser.uid: ", currentUser.uid);
    try {
      myInvoices = await loadInvoices(currentUser.uid);
      renderInvoices(myInvoices);
      selectedInvoice = getLatestInvoice(myInvoices);

      console.log("selectedInvoice", selectedInvoice);

      renderInvoice(selectedInvoice);
    } catch (error) {
      console.error("Klarte ikke hente data:", error);
      // TODO: Vise en feilmelding til brukeren i UI
    }
  } else {
    currentUser = null;
    myInvoices = []; // Tømmer listen så ikke neste person ser dine data
    selectedInvoice = null;
    renderInvoices([]); // Tømmer listen i UI når brukeren logger ut
    // oppdaterGrensesnitt(); // TODO: må lages (liste.innerHTML = '')!!
  }
});

// 4. ========= UI handlers (knapper) - ("add invoice" etc)
/* document.getElementById("add").onclick = async () => {
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
}; */

// 5. ========= funksjoner (loadInvoices etc.)
/* 
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
 */
// lagre til firebase/firestore
async function saveInvoice(data) {
  const docRef = await addDoc(collection(db, "invoices"), data);
  return docRef.id;
}

document
  .getElementById("invoice-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return alert("Du må logge inn først ...");

    try {
      const data = getFormData(user);

      // TODO: ha mere robust validering!?
      // minimum validering
      if (!data.customer.name) {
        alert("Kundenavn mangler");
        return;
      }

      const id = await saveInvoice(data);
      // console.log("Lagret med ID:", id);

      // refresh UI
      updatePreview(data);
      alert("Faktura lagret!");
    } catch (err) {
      console.error(err);
      alert("Noe gikk galt");
    }
    showView("view-list");
    // TODO: sjekk disse ??
    // invoices.unshift({ id, ...data });
    renderInvoices(data); // oppdater html listen
  });

function getFormData(user) {
  const items = [];

  document.querySelectorAll(".item-row").forEach((row) => {
    const quantity = Number(row.querySelector(".qty").value);
    const unitPrice = Number(row.querySelector(".price").value);
    const vatRate = Number(row.querySelector(".vat").value);

    items.push({
      description: row.querySelector(".desc").value,
      quantity,
      unitPrice,
      vatRate,
    });
  });

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const vatTotal = items.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * item.vatRate) / 100,
    0
  );

  const total = subtotal + vatTotal;

  return {
    ownerId: user.uid,
    status: "draft",
    createdAt: new Date(),

    customer: {
      name: document.getElementById("customer-name").value,
      email: document.getElementById("customer-email").value,
    },

    items,
    subtotal,
    vatTotal,
    total,
  };
}

// TODO - ny variant flyttet til ui.js  !!
/* function renderInvoices(invoices) {
  const container = document.getElementById("invoice-list");
  container.innerHTML = "";

  invoices.forEach((inv) => {
    const div = document.createElement("div");
    div.textContent = inv.customer.name + " - " + inv.total;
    container.appendChild(div);
  });
} */

// enkel view switching
function showView(view) {
  document.getElementById("view-list").style.display = "none";
  document.getElementById("view-form").style.display = "none";

  document.getElementById(view).style.display = "block";
}

// knapper for form buttons
document.getElementById("show-form").addEventListener("click", () => {
  showView("view-form");
});

document.getElementById("back").addEventListener("click", () => {
  showView("view-list");
});

document.getElementById("add-item").addEventListener("click", addItemRow);

// når form / skjema åpnes, legg til en rad
function addItemRow() {
  const container = document.getElementById("form-items");

  const div = document.createElement("div");
  div.className = "item-row";

  div.innerHTML = `
    <input class="desc" placeholder="Beskrivelse" />
    <input class="qty" type="number" value="1" />
    <input class="price" type="number" placeholder="Pris" />
    <input class="vat" type="number" value="25" />
    <button type="button" class="remove">X</button>
  `;

  container.appendChild(div);
}

// TODO kanskje vi må heller ha en egen "remove" knapp per linje?
// Remove button for rad salgselement
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove")) {
    const rows = document.querySelectorAll(".item-row");

    // ikke slett siste red
    if (rows.length > 1) {
      e.target.parentElement.remove();
    } else {
      alert("Du må ha minst én linje");
    }
  }
});

// når bruker klikker "add invoice" - legg til en linje
document.getElementById("show-form").addEventListener("click", () => {
  document.getElementById("form-items").innerHTML = "";
  addItemRow(); // alltid én linje klar
  showView("view-form");
});

// når invoice lagres - opdater Preview automatisk
function updatePreview(data) {
  const el = document.getElementById("invoice-list");

  // console.log("data", data);

  el.innerHTML = "";
  el.innerHTML = `
    <b>${data.customer.name}</b>
    <p>${data.customer.email}</p>

    <ul>
      ${data.items
        .map(
          (i) => `
        <li>${i.description} - ${i.quantity} x ${i.unitPrice}</li>
      `
        )
        .join("")}
    </ul>

    <strong>Total: ${data.total}</strong>
  `;
}

// ========= Ggenerer PDF og åpne mail for user
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
