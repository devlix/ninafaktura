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
  fillForm,
  getFormData,
} from "./ui.js";
import { subscribeToInvoices, saveInvoice, updateInvoice, updateInvoiceStatus } from "./invoices.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --------- state
let currentInvoices = [];
let selectedInvoice = null;
let unsubscribeInvoices = null;
let editingInvoiceId = null;
let formReturnView = "view-list";

// --------- helpers
const getEl = (id) => document.getElementById(id);

// ========= auth
getEl("login-btn").onclick = async () => {
  await showLoginUI();
};

getEl("logout-btn").onclick = () => {
  logOut(currentUser);
};

getEl("user-avatar-btn").addEventListener("click", () => {
  if (!currentUser) {
    showLoginUI();
  } else {
    const menu = getEl("user-menu");
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  }
});

document.addEventListener("click", (e) => {
  if (!getEl("user-avatar-btn").contains(e.target)) {
    getEl("user-menu").style.display = "none";
  }
});

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
      alert("Du er nå logget ut!");
    })
    .catch(() => {
      alert("Noe gikk galt ved utlogging. Prøv å logge inn og prøv igjen.");
    });
}

// ========= form submit — handles both create and edit
document.getElementById("invoice-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return alert("Du må logge inn først ...");

  const data = getFormData(user);
  if (!data.customer.name) return alert("Kundenavn mangler");

  try {
    if (editingInvoiceId) {
      await updateInvoice(editingInvoiceId, data);
      editingInvoiceId = null;
      showView("view-list");
    } else {
      const number = await saveInvoice(data);
      alert(`Lagret med Faktura-nr: ${number}`);
      showView("view-list");
    }
  } catch (err) {
    console.error(err);
    alert("Noe gikk galt");
  }
});

// ========= form buttons
getEl("show-form-btn").addEventListener("click", () => {
  editingInvoiceId = null;
  formReturnView = "view-list";
  getEl("form-title").textContent = "Ny faktura";
  getEl("form-items").innerHTML = "";
  addItemRow(currentUser);
  showView("view-form");
});

getEl("back").addEventListener("click", () => showView(formReturnView));

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

// ========= detail view — back / edit / PDF / email
getEl("back-detail").addEventListener("click", () => showView("view-list"));

getEl("view-detail").addEventListener("click", async (e) => {
  const btn = e.target.closest(".status-action-btn");
  if (!btn || !selectedInvoice) return;
  const newStatus = btn.getAttribute("data-status");
  try {
    await updateInvoiceStatus(selectedInvoice.id, newStatus);
    selectedInvoice = { ...selectedInvoice, status: newStatus };
    viewDetails(selectedInvoice);
  } catch (err) {
    console.error(err);
    alert("Kunne ikke oppdatere status");
  }
});

getEl("edit-invoice").addEventListener("click", () => {
  editingInvoiceId = selectedInvoice.id;
  formReturnView = "view-detail";
  getEl("form-title").textContent = "Rediger faktura";
  fillForm(selectedInvoice, currentUser);
  showView("view-form");
});

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
  editingInvoiceId = null;
  formReturnView = "view-list";
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
