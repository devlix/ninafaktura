/* ====================== app.js =======================
 * Orchestrator — wires auth state, form logic,
 * view switching, and PDF/email export.
 * ===================================================== */

// ========= imports
import { auth, provider } from "./firebase.js";
import { currentUser, setCurrentUser } from "./state.js";
import {
  updateDataAndHtml,
  viewDetails,
  clearInvoiceList,
  clearPreview,
  updateLoginButtons,
  showView,
  addItemRow,
  getFormData,
} from "./ui.js";
import { subscribeToInvoices, saveInvoice } from "./invoices.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --------- state
let currentInvoices = [];
let selectedInvoice = null;
let unsubscribeInvoices = null;

// --------- helpers
const getEl = (id) => document.getElementById(id);

// ========= auth
getEl("login-btn").onclick = async () => {
  await showLoginUI();
};

getEl("logout-btn").onclick = () => {
  logOut(currentUser);
};

onAuthStateChanged(auth, async (user) => {
  cleanup();

  if (user) {
    console.log("Auth changed: ", user.displayName);
    setCurrentUser(user);
    try {
      startApp(user);
    } catch (error) {
      console.error("Klarte ikke hente data:", error);
    }
  } else {
    if (!navigator.onLine) {
      alert("Du er offline og må koble til nett for å logge inn første gang.");
    }
    showLoginUI();
  }
});

async function startApp(user) {
  console.log("Starting app for:", user.displayName);
  unsubscribeInvoices = subscribeToInvoices(user.uid, (invoices) => {
    currentInvoices = invoices ?? [];
    updateDataAndHtml(invoices);
  });
  updateLoginButtons(user);
}

async function showLoginUI() {
  const result = await signInWithPopup(auth, provider).catch((error) => {
    if (error.code === "auth/popup-blocked") {
      console.error("Auth Popup blocked");
    } else {
      console.error("Login failed: ", error);
    }
  });
  if (result) {
    updateLoginButtons(currentUser);
  }
}

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
    .catch(() => {
      alert(
        "Something went wrong 🕵️‍♀️!!\n\n !!! Try to login first then retry logout !!! "
      );
    });
}

// ========= form submit
document.getElementById("invoice-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return alert("Du må logge inn først ...");

  try {
    const data = getFormData(user);

    if (!data.customer.name) {
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

// ========= form buttons
getEl("show-form-btn").addEventListener("click", () => {
  getEl("form-items").innerHTML = "";
  addItemRow(currentUser);
  showView("view-form");
});

getEl("back").addEventListener("click", () => {
  showView("view-list");
});

getEl("add-item").addEventListener("click", () => addItemRow(currentUser));

// ========= remove item row (event delegation)
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove")) {
    const rows = document.querySelectorAll(".item-row");
    if (rows.length > 1) {
      e.target.parentElement.remove();
    } else {
      alert("Du må ha minst én linje!\n\nBruk tilbake knappen hvis du vil avbryte.");
    }
  }
});

// ========= invoice list — view details
getEl("invoice-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".view-btn");
  if (btn) {
    const id = btn.getAttribute("data-id");
    const invoice = currentInvoices.find((inv) => inv.id === id);
    if (invoice) {
      selectedInvoice = invoice;
      viewDetails(invoice);
    }
  }
});

// ========= detail view — back / PDF / email
getEl("back-detail").addEventListener("click", () => showView("view-list"));

getEl("download-pdf").onclick = async () => {
  if (!selectedInvoice) return;
  const { jsPDF } = window.jspdf;
  const el = getEl("invoicePreview");

  const canvas = await html2canvas(el, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  const pdfDoc = new jsPDF("p", "mm", "a4");
  const imgWidth = 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdfDoc.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

  pdfDoc.save(`faktura-${selectedInvoice.invoiceNumber}.pdf`);
};

getEl("send-email").onclick = () => {
  if (!selectedInvoice) return;
  const email = selectedInvoice.customer?.email || "";
  const subject = encodeURIComponent("Faktura " + selectedInvoice.invoiceNumber);
  const body = encodeURIComponent("Hei,\n\nSe vedlagt faktura.\n\nMvh");
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
};

// ========= cleanup on unload / logout
window.addEventListener("beforeunload", () => {
  cleanup();
});

function cleanup() {
  if (unsubscribeInvoices) {
    unsubscribeInvoices();
    unsubscribeInvoices = null;
  }
  setCurrentUser(null);
  currentInvoices = [];
  selectedInvoice = null;
  clearPreview();
  getEl("invoice-list").innerHTML = "Logg inn for å se dine fakturaer";
}

// ========= service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("Service Worker registrert!", reg))
      .catch((err) => console.log("Registrering feilet:", err));
  });
}
