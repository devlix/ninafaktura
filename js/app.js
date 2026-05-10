// TODO: FORTSETTER på punkt 2 og 3 i siste chat-melding
// ==============
// TODO: Ikke sikker om "removew" knappen skal gjelde for alle rader (addEvent på document - skulle dette heller være en knapp for hver rad, selv om det er litt mer kode som trengs da??)
//==============

/* ====================== app.js =======================
 * All App-logikk ...
 *   "Når knappen i ui.js trykkes, kjør login i firebase.js,
 *   og hvis det går bra, vis resultatet i ui.js igjen."
 * ===================================================== */
// 1. ========= imports
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { auth, db, provider } from "./firebase.js";
import {
  renderInvoices,
  renderInvoicePreview,
  updateDataAndHtml,
  viewDetails,
  clearInvoiceList,
  clearPreview,
  updateLoginButtons,
} from "./ui.js";
import {
  subscribeToInvoices,
  saveInvoice,
  // loadInvoices,
  getLatestInvoice,
} from "./invoices.js";

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
  // onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --------- GLOBAL Variables
export let currentUser = null;
export const DEBUG = true;
let myInvoices = null;
let selectedInvoice = null; // holder valgt invoice
let unsubscribeInvoices = null; // will hold function to unsubscribe from firebase listener

// 1. ================ LOKALE Hjelpefunksjoner ============
const getEl = (id) => document.getElementById(id);

// 2. ========= config + init

// 3. ========= auth state / setup / login
getEl("login-btn").onclick = async () => {
  await showLoginUI(auth, provider);
};
getEl("logout-btn").onclick = () => {
  logOut(currentUser);
};

onAuthStateChanged(auth, async (user) => {
  cleanup(); // cleanuo previous sesions

  if (user) {
    console.log("Auth changed: ", user.displayName);
    currentUser = user;
    // console.log("currentUser.uid: ", currentUser.uid);
    try {
      startApp(currentUser);
    } catch (error) {
      console.error("Klarte ikke hente data:", error);
      // TODO: Vise en BEDRE feilmelding til brukeren i UI
    }
    /* } else {
      console.log("Ingen bruker funnet.");
      showLoginUI(); // Funksjon som kun viser en "Logg inn"-knapp
    */
  } else {
    // Ingen lagret bruker funnet - her må du være online for å logge inn
    if (!navigator.onLine) {
      alert("Du er offline og må koble til nett for å logge inn første gang.");
    }
    showLoginUI();
  }
});

async function startApp(user) {
  console.log("Starting app for:", user.displayName);
  unsubscribeInvoices = subscribeToInvoices(user.uid, updateDataAndHtml);
  updateLoginButtons(user);

  // Firestore will call renderInvoices function with fresh data:, but
  // If need extra context in updateDataAndHtml,
  // ** DON´t use updateDataAndHtml(data) ** !! You can wrap it:
  //  unsubscribeInvoices = subscribeToInvoices(user, (invoices) => {
  //  updateDataAndHtml(invoices, data); // pass extra stuff if needed
}

// TODO: bytt mellom signin og signout knapp!!
async function showLoginUI() {
  const result = await signInWithPopup(auth, provider).catch((error) => {
    if (error.code === "auth/popup-blocked") {
      // Hvis blokkert, prøv redirect i stedet - funker IKKE fra localhost!!
      // signInWithRedirect(auth, provider);
      console.error("Auth Popup blocked");
    } else {
      console.error("Login failed: ", error);
    }
  });
  if (result) {
    updateLoginButtons(currentUser);
  }
}

// TODO: bytt mellom signin og signout knapp!!
function logOut(user) {
  if (!auth || !user) {
    alert("You are not signed in!");
    return;
  }
  cleanup();
  signOut(auth)
    .then(() => {
      updateLoginButtons(currentUser);
      alert("You are now signed out!");
    })
    .catch((error) => {
      alert(
        "Something went wrong 🕵️‍♀️!!\n\n !!! Try to login first then retry logout !!! "
      );
    });
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
      if (!data.customer.name) {
        // minimum validering
        alert("Kundenavn mangler");
        return;
      }

      const currentInvoiceNumber = await saveInvoice(data);
      alert(`Lagret med Faktura-nr: ${currentInvoiceNumber}`);
    } catch (err) {
      console.error(err);
      alert("Noe gikk galt");
    }

    showView("view-list");
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
      name: getEl("customer-name").value,
      email: getEl("customer-email").value,
    },

    items,
    subtotal,
    vatTotal,
    total,
  };
}

// TODO - ny variant flyttet til ui.js  !!
/* function renderInvoices(invoices) {
  const container = getEl("invoice-list");
  container.innerHTML = "";

  invoices.forEach((inv) => {
    const div = document.createElement("div");
    div.textContent = inv.customer.name + " - " + inv.total;
    container.appendChild(div);
  });
} */

// enkel view switching
function showView(view) {
  getEl("view-list").style.display = "none";
  getEl("view-form").style.display = "none";

  getEl(view).style.display = "block";
}

// =========  knapper for form buttons ============
getEl("show-form-btn").addEventListener("click", () => {
  getEl("form-items").innerHTML = "";
  addItemRow(); // alltid én linje klar !!!
  showView("view-form");
});

getEl("back").addEventListener("click", () => {
  showView("view-list");
});

getEl("add-item").addEventListener("click", addItemRow);

// når form / skjema åpnes, legg til en rad
function addItemRow() {
  if (!currentUser) {
    alert("Du må logge inn først!");
    console.warn(
      "Unexpected event: User not logged in, but addItemRow() called."
    );
    return;
  }

  const container = getEl("form-items");

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

// ********* EVENT_HANDLER ***********
// ***********************************

// ----- Generisk Remove handler for alt mulig egentlig
//  så lenge buttom og buttontekxt og html struktur er lik !!!
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove")) {
    const rows = document.querySelectorAll(".item-row");

    // ikke slett siste red
    if (rows.length > 1) {
      e.target.parentElement.remove();
    } else {
      alert(
        "Du må ha minst én linje!/n/n Bruk tilbake knappen hvis du vil avbryte."
      );
    }
  }
});

// ----- viewDetail handler for knapper på invoice list
getEl("invoice-list").addEventListener("click", (e) => {
  // .closest() leter oppover i HTML-strukturen etter nærmeste element med denne klassen
  // Dette fungerer selv om brukeren klikker på et ikon inne i knappen!
  const btn = e.target.closest(".view-btn");

  if (btn) {
    const id = btn.getAttribute("data-id");
    viewDetails(id);
  }
});

// *********** FB-listener ************
// ***********************************

window.addEventListener("beforeunload", () => {
  cleanup();
});

// call cleannp !!! if the app has navigation or any form of reinit
//     Call it when:
//      * user logs out
//      * user switches account
//      * you re-init listeners
function cleanup() {
  if (unsubscribeInvoices) {
    // Cancel all subscriptions
    unsubscribeInvoices();
    unsubscribeInvoices = null;
  }
  currentUser = null;
  myInvoices = []; // Tømmer listen så ikke neste person ser dine data
  selectedInvoice = {};
  clearInvoiceList();
  clearPreview();
  getEl("invoice-list").innerHTML = "Please login to see your invoices";
}

// *********** PDF & MAIL ************
// ***********************************
// ========= Ggenerer PDF og åpne mail for user
//    !! NOTE:
//    !! Browser kan ikke legge ved filer automatisk i email
//    !! Bruker må selv legge ved PDF manuelt
getEl("sendEmail").onclick = async () => {
  const { jsPDF } = window.jspdf;

  const el = getEl("invoicePreview");

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

/* document.addEventListener("DOMContentLoaded", () => {
  const myBtn = getEl("show-form-btn");

  if (myBtn) {
    myBtn.addEventListener("click", () => {
      getEl("form-items").innerHTML = "";
      addItemRow(); // alltid én linje klar !!!
      showView("view-form");
    });
  } else {
    console.error("ID-en finnes i HTML, men JS finner den ikke!");
  }
});
 */

// =======================

// ======================== SERVICE WORKER =========================
// Legg dette nederst i din app.js (eller index.html)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("Service Worker registrert!", reg))
      .catch((err) => console.log("Registrering feilet:", err));
  });
}
