/* ==================  ui.js  =======================
 * Alt som rører DOM / HTML - Tegner knapper, lister
 *  og feilmeldinger i nettleseren.
 * =============================================== */

import { currentUser, DEBUG } from "./state.js";

// ================ Hjelpefunksjoner ============
const getEl = (id) => document.getElementById(id);
const fmtNOK = (n) =>
  Number(n).toLocaleString("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function statusBadgeClasses(status) {
  return (
    {
      draft: "bg-yellow-100 text-yellow-800",
      sent: "bg-purple-100 text-purple-800",
      paid: "bg-green-100 text-green-800",
      cancelled: "bg-gray-200 text-gray-600",
    }[status] || "bg-gray-100 text-gray-600"
  );
}

// ---- Login / logout button state
export function updateLoginButtons(user) {
  const loginBtn    = getEl("login-btn");
  const showFormBtn = getEl("show-form-btn");
  const avatarBtn   = getEl("user-avatar-btn");
  const userMenu    = getEl("user-menu");

  if (user) {
    loginBtn.style.display    = "none";
    showFormBtn.style.display = "block";
    const initial = (user.displayName || user.email || "?")[0].toUpperCase();
    getEl("user-initial").textContent      = initial;
    getEl("user-menu-name").textContent    = user.displayName || user.email || "";
    avatarBtn.title = user.displayName || user.email || "";
    avatarBtn.classList.remove("bg-gray-300");
    avatarBtn.classList.add("bg-blue-600");
  } else {
    loginBtn.style.display    = "block";
    showFormBtn.style.display = "none";
    getEl("user-initial").textContent = "?";
    avatarBtn.title = "";
    avatarBtn.classList.remove("bg-blue-600");
    avatarBtn.classList.add("bg-gray-300");
    userMenu.style.display = "none";
  }
}

// ---- Show/hide top-level views
export function showView(view) {
  getEl("view-list").style.display = "none";
  getEl("view-form").style.display = "none";
  getEl("view-detail").style.display = "none";
  getEl(view).style.display = "block";
}

// ---- Render invoice list
export function renderInvoices(invoices) {
  const container = getEl("invoice-list");
  container.innerHTML = "";

  if (!invoices || invoices.length === 0) {
    if (DEBUG) console.log("current user <", currentUser, "> has no invoices");
    container.innerHTML = currentUser
      ? `<p class="text-gray-500 text-sm">Ingen fakturaer funnet for din bruker.</p>`
      : `<p class="text-gray-500 text-sm">Du må logge på for å se dine fakturaer.</p>`;
    return;
  }

  container.innerHTML = invoices
    .map(
      (invoice) => `
    <div class="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center" data-id="${invoice.id}">
      <span class="font-semibold text-gray-800 flex-1 min-w-[140px]">
        ${invoice.customer.name || "Mangler kundenavn"}
      </span>
      <span class="text-gray-500 text-sm">
        #${invoice.invoiceNumber || "—"}
        ${invoice.erFraCache ? "🕒" : "🟢"}
      </span>
      <span class="font-medium text-gray-700">${invoice.total} kr</span>
      <span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClasses(invoice.status)}">
        ${invoice.status}
      </span>
      <button class="view-btn ml-auto bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
        data-id="${invoice.id}">Se detaljer</button>
    </div>
  `,
    )
    .join("");
}

// ---- Status transition tables (module-level, shared by renderStatusSection)
const NEXT_STATUSES = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "draft", "cancelled"],
  paid: ["sent"],
  cancelled: ["draft"],
};
const STATUS_LABELS = {
  draft: "Utkast",
  sent: "Sendt",
  paid: "Betalt",
  cancelled: "Avbrutt",
};
const ACTION_LABELS = {
  sent: "Merk som sendt",
  paid: "Merk som betalt",
  draft: "Tilbake til utkast",
  cancelled: "Kanseller faktura",
};
const BACKWARD = new Set(["draft"]);
const DESTRUCTIVE = new Set(["cancelled"]);

function renderStatusSection(invoice) {
  const nextStates = NEXT_STATUSES[invoice.status] || [];
  const labelOverrides =
    invoice.status === "paid" ? { sent: "Angre betaling" } : {};

  const buttons = nextStates
    .map((s) => {
      const label = labelOverrides[s] || ACTION_LABELS[s];
      let cls = "bg-blue-600 text-white hover:bg-blue-700 border-transparent";
      if (DESTRUCTIVE.has(s))
        cls = "border-red-300 text-red-600 hover:bg-red-50";
      if (BACKWARD.has(s))
        cls = "border-gray-300 text-gray-600 hover:bg-gray-50";
      if (invoice.status === "paid" && s === "sent")
        cls = "border-gray-300 text-gray-600 hover:bg-gray-50";
      return `<button class="status-action-btn text-sm px-3 py-1.5 rounded border ${cls}" data-status="${s}">${label}</button>`;
    })
    .join("");

  getEl("status-section").innerHTML = `
    <span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClasses(invoice.status)}">
      ${STATUS_LABELS[invoice.status] || invoice.status}
    </span>
    ${buttons}
  `;
}

// ---- Show invoice detail view
export function viewDetails(invoice) {
  renderInvoicePreview(invoice);
  getEl("edit-invoice").style.display =
    invoice.status === "draft" ? "inline-block" : "none";
  renderStatusSection(invoice);
  showView("view-detail");
}

// ---- Called by Firestore subscription on every snapshot
export function updateDataAndHtml(invoices) {
  if (!invoices) {
    clearInvoiceList();
    clearPreview();
  } else {
    if (DEBUG) {
      console.log(
        `Hentet ${invoices.length} fakturaer. Er de fra cache?`,
        invoices[0]?.erFraCache,
      );
    }
    renderInvoices(invoices);
  }
}

// ---- Render invoice preview panel
export function renderInvoicePreview(invoice) {
  if (DEBUG) console.log("renderInvoicePreview:", invoice);
  if (!invoice) {
    console.warn("No invoice to render in preview");
    return;
  }

  getEl("inv-number").innerText = invoice.invoiceNumber || "";

  const invoiceDate = new Date(
    invoice.createdAt.seconds * 1000 +
      Math.floor(invoice.createdAt.nanoseconds / 1000000),
  );
  getEl("inv-date").innerText = invoiceDate.toLocaleDateString("nb-NO");

  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 14);
  getEl("inv-duedate").innerText = dueDate.toLocaleDateString("nb-NO");

  getEl("customer").innerHTML = [
    invoice.customer?.name    ? `<div class="inv-customer-name">${invoice.customer.name}</div>`   : "",
    invoice.customer?.orgnr   ? `<div>Org.nr: ${invoice.customer.orgnr}</div>`                    : "",
    invoice.customer?.address ? `<div>${invoice.customer.address}</div>`                           : "",
    invoice.customer?.city    ? `<div>${invoice.customer.city}</div>`                              : "",
    invoice.customer?.email   ? `<div class="inv-customer-email">${invoice.customer.email}</div>` : "",
  ].join("");

  const itemsEl = getEl("items");
  const items = invoice.items || [];

  itemsEl.innerHTML = items
    .map((item) => {
      const sum = item.quantity * item.unitPrice;
      const vat = (sum * item.vatRate) / 100;
      const totalItem = sum + vat;
      return `
      <tr class="inv-item-row">
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>${fmtNOK(item.unitPrice)}</td>
        <td>${item.vatRate.toFixed(0)} %</td>
        <td>${fmtNOK(totalItem)}</td>
      </tr>`;
    })
    .join("");

  const deresRef = invoice.deresRef || "";
  const vaarRef = invoice.vaarRef || "";
  getEl("inv-deres-ref").innerText = deresRef;
  getEl("inv-vaar-ref").innerText = vaarRef;
  getEl("inv-deres-ref-row").style.display = deresRef ? "" : "none";
  getEl("inv-vaar-ref-row").style.display = vaarRef ? "" : "none";

  getEl("subtotal").innerText = fmtNOK(invoice.subtotal);
  getEl("vat").innerText = fmtNOK(invoice.vatTotal);
  getEl("total").innerText = fmtNOK(invoice.total);
}

// ---- Clear preview panel
export function clearPreview() {
  getEl("items").innerHTML = "";
  getEl("subtotal").innerText = "";
  getEl("vat").innerText = "";
  getEl("total").innerText = "";
  getEl("inv-number").innerText = "";
  getEl("inv-date").innerText = "";
  getEl("inv-duedate").innerText = "";
  getEl("inv-deres-ref").innerText = "";
  getEl("inv-vaar-ref").innerText = "";
  getEl("inv-deres-ref-row").style.display = "none";
  getEl("inv-vaar-ref-row").style.display = "none";
  getEl("customer").innerHTML = "";
  if (DEBUG) console.log("Faktura Preview tømt");
}

// ---- Clear invoice list
export function clearInvoiceList() {
  getEl("invoice-list").innerHTML = "";
}

// ---- Add one item row to the invoice form (item param pre-fills for edit mode)
export function addItemRow(user, item = null) {
  if (!user) {
    alert("Du må logge inn først!");
    console.warn(
      "Unexpected event: User not logged in, but addItemRow() called.",
    );
    return;
  }

  const div = document.createElement("div");
  div.className = "item-row flex gap-2 items-center";
  div.innerHTML = `
    <input class="desc flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
      placeholder="Beskrivelse" value="${item?.description || ""}" />
    <input class="qty w-16 border border-gray-300 rounded px-2 py-1 text-sm text-right"
      type="number" value="${item?.quantity ?? 1}" />
    <input class="price w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
      type="number" placeholder="Pris" value="${item?.unitPrice || ""}" />
    <input class="vat w-16 border border-gray-300 rounded px-2 py-1 text-sm text-right"
      type="number" value="${item?.vatRate ?? 25}" />
    <button type="button" class="remove text-red-500 hover:text-red-700 font-bold px-2">✕</button>
  `;
  getEl("form-items").appendChild(div);
}

// ---- Pre-fill form with existing invoice data (edit mode)
export function fillForm(invoice, user) {
  getEl("customer-name").value = invoice.customer?.name || "";
  getEl("customer-orgnr").value = invoice.customer?.orgnr || "";
  getEl("customer-address").value = invoice.customer?.address || "";
  getEl("customer-city").value = invoice.customer?.city || "";
  getEl("customer-email").value = invoice.customer?.email || "";
  getEl("deres-ref").value = invoice.deresRef || "";
  getEl("vaar-ref").value = invoice.vaarRef || "";
  getEl("form-items").innerHTML = "";
  (invoice.items || []).forEach((item) => addItemRow(user, item));
}

// ---- Read form values and compute invoice totals
export function getFormData(user) {
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
    0,
  );

  const vatTotal = items.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * item.vatRate) / 100,
    0,
  );

  const total = subtotal + vatTotal;

  return {
    ownerId: user.uid,
    status: "draft",
    createdAt: new Date(),
    customer: {
      name: getEl("customer-name").value,
      orgnr: getEl("customer-orgnr").value,
      address: getEl("customer-address").value,
      city: getEl("customer-city").value,
      email: getEl("customer-email").value,
    },
    deresRef: getEl("deres-ref").value,
    vaarRef: getEl("vaar-ref").value,
    items,
    subtotal,
    vatTotal,
    total,
  };
}
