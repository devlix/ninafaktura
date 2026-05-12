/* ==================  ui.js  =======================
 * Alt som rører DOM / HTML - Tegner knapper, lister
 *  og feilmeldinger i nettleseren.
 * =============================================== */

import { getLatestInvoice } from "./invoices.js";
import { currentUser, DEBUG } from "./state.js";

// ================ Hjelpefunksjoner ============
const getEl = (id) => document.getElementById(id);

// ---- Login / logout button state
export const updateLoginButtons = (user) => {
  const loginBtn = getEl("login-btn");
  const logoutBtn = getEl("logout-btn");
  const showFormBtn = getEl("show-form-btn");

  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    showFormBtn.style.display = "block";
  } else {
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
    showFormBtn.style.display = "none";
  }
};

// ---- Show/hide top-level views
export const showView = (view) => {
  getEl("view-list").style.display = "none";
  getEl("view-form").style.display = "none";
  getEl(view).style.display = "block";
};

// ---- Render invoice list
export const renderInvoices = (invoices) => {
  const container = getEl("invoice-list");
  container.innerHTML = "";

  if (!invoices || invoices.length === 0) {
    if (DEBUG) console.log("current user <", currentUser, "> has no invoices");
    container.innerHTML = currentUser
      ? "<p>Ingen fakturaer funnet for din bruker.</p>"
      : "<p>Du må logge på for å se dine faktura.</p>";
    return;
  }

  container.innerHTML = invoices
    .map(
      (invoice) => `
    <div class="invoice-card" data-id="${invoice.id}">
      <div class="cell customer" data-label="Kunde">KUNDE ${
        invoice.customer.name || "Mangler Kundenavn"
      }</div>
      <div class="cell faktura-nummer" data-label="Faktura Nr.">Faktura #${
        invoice.invoiceNumber || "Mangler nummer"
      }<span>  ${
        invoice.erFraCache
          ? '<span class="offline-icon">🕒 </span>'
          : '<span class="online-icon">🟢</span>'
      }</span></div>
      <div class="cell amount" data-label="Beløp">Beløp: ${invoice.total} kr</div>
      <div class="cell status" data-label="Status"><span class="badge ${
        invoice.status
      }">${invoice.status}</span></div>
      <button class="view-btn" data-id="${invoice.id}">Se detaljer</button>
    </div>
  `
    )
    .join("");
};

// ---- Invoice detail stub
export const viewDetails = (invoiceID) => {
  alert(
    "View Details for Invoice: " + invoiceID + "\n\n 🛠 Not yet implemented 🛠"
  );
};

// ---- Called by Firestore subscription on every snapshot
export const updateDataAndHtml = (invoices) => {
  if (!invoices) {
    clearInvoiceList();
    clearPreview();
  } else {
    if (DEBUG) {
      console.log(
        `Hentet ${invoices.length} fakturaer. Er de fra cache?`,
        invoices[0]?.erFraCache
      );
    }
    renderInvoices(invoices);
    const invoice = getLatestInvoice(invoices);
    renderInvoicePreview(invoice);
  }
};

// ---- Render invoice preview panel
export const renderInvoicePreview = (invoice) => {
  console.log("in renderInvoicePreview and invoice is: ", invoice);
  if (!invoice) {
    console.warn("No invoice to render in preview");
    return;
  }

  getEl("inv-number").innerText = "Nr: " + invoice.invoiceNumber || "";

  getEl("inv-date").innerText =
    "Dato: " +
      new Date(
        invoice.createdAt.seconds * 1000 + invoice.createdAt.nanoseconds / 1000
      ).toLocaleDateString() || "";

  getEl("customer").innerHTML =
    `
    ${invoice.customer?.name || ""}<br>
    ${invoice.customer?.address || ""}<br>
    ${invoice.customer?.email || ""}
  ` || "";

  const itemsEl = getEl("items");
  const items = invoice.items || [];

  itemsEl.innerHTML = items
    .map((item) => {
      const sum = item.quantity * item.unitPrice;
      const vat = (sum * item.vatRate) / 100;
      const totalItem = sum + vat;
      const itemLineID =
        "item-line-random-" + Math.floor(Math.random() * 100 + 1).toString();
      return `
      <tr id=${itemLineID} style="border-bottom:1px solid #ccc;">
        <td style="text-align: left">${item.description}</td>
        <td style="text-align: right">${item.quantity}</td>
        <td style="text-align: right">${item.unitPrice}</td>
        <td style="text-align: right">${item.vatRate.toFixed(0)}</td>
        <td style="text-align: right">${totalItem}</td>
      </tr>`;
    })
    .join("");

  getEl("subtotal").innerText = invoice.subtotal;
  getEl("vat").innerText = invoice.vatTotal;
  getEl("total").innerText = invoice.total;
};

// ---- Clear preview panel
export const clearPreview = () => {
  getEl("items").innerHTML = "";
  getEl("subtotal").innerText = "";
  getEl("vat").innerText = "";
  getEl("total").innerText = "";
  getEl("inv-number").innerText = "Nr:";
  getEl("inv-date").innerText = "Dato: ";
  getEl("customer").innerHTML = "NoName";
  console.log("Cleared all data from Faktura Preview");
};

// ---- Clear invoice list
export const clearInvoiceList = () => {
  getEl("invoice-list").innerHTML = "";
};

// ---- Add one item row to the invoice form
export const addItemRow = (user) => {
  if (!user) {
    alert("Du må logge inn først!");
    console.warn("Unexpected event: User not logged in, but addItemRow() called.");
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
};

// ---- Read form values and compute invoice totals
export const getFormData = (user) => {
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
};
