/* =============  invoices.js  ===================
 * Alt som rører DOM
 * =============================================== */

import { getLatestInvoice } from "./invoices.js";
import { currentUser } from "./app.js";

export function renderInvoices(invoices) {
  const container = document.getElementById("invoice-list");

  // 1. Sjekk om det er data å vise
  if (!invoices || invoices.length === 0) {
    console.log("current user in renderInvoices: ", currentUser);
    if (!currentUser) {
      container.innerHTML = "<p>Du må logge på for å se dine faktura.</p>";
    } else {
      container.innerHTML = "<p>Ingen fakturaer funnet for din brker.</p>";
    }
    return;
  }

  // 2. Bygg HTML-strengen
  // Vi bruker .map() for å lage en <li> per faktura og .join('') for å gjøre det til tekst
  const html = invoices
    .map(
      (invoice) => `
    <div class="invoice-card" data-id="${invoice.id}">
      <h3>KUNDE ${invoice.customer.name || "Mangler Kundenavn"}</h3>
      <p>Faktura #${invoice.invoiceNumber || "Mangler nummer"}</p>
      <p>Beløp: ${invoice.total} kr</p>
      <p>Status: <span class="status-${invoice.status}">${
        invoice.status
      }</span></p>
      <button class="view-btn" data-id="${invoice.id}">Se detaljer</button>
    </div>
  `
    )
    .join("");

  // 3. Oppdater DOM-en i ett jafs (effektivt)
  container.innerHTML = html;
}

export function viewDetails(invoiceID) {
  alert(
    "View Details for Invoice: " + invoiceID + "\n\n 🛠 Not yet implemented 🛠"
  );
}
// window.viewDetails = viewDetails;

export function updateDataAndHtml(invoices) {
  if (!invoices) {
    clearInvoiceList();
    clearPreview();
  } else {
    renderInvoices(invoices);
    const invoice = getLatestInvoice(invoices);
    renderInvoicePreview(invoice);
  }
}

export function renderInvoicePreview(invoice) {
  console.log("in renderInvoicePreview and invoice is: ", invoice);
  // stopp hvis ingen invoice
  if (!invoice) {
    console.warn("No invoice to render in preview");
    return;
  }
  // sett faktura info
  document.getElementById("inv-number").innerText =
    "Nr: " + invoice.invoiceNumber || "";

  document.getElementById("inv-date").innerText =
    "Dato: " +
      new Date(
        invoice.createdAt.seconds * 1000 + invoice.createdAt.nanoseconds / 1000
      ).toLocaleDateString() || "";

  // kundeinfo
  document.getElementById("customer").innerHTML =
    `
    ${invoice.customer?.name || ""}<br>
    ${invoice.customer?.address || ""}<br>
    ${invoice.customer?.email || ""}
  ` || "";

  // items
  const itemsEl = document.getElementById("items");

  // fallback hvis items mangler
  const items = invoice.items || [];

  itemsEl.innerHTML = "";

  itemsEl.innerHTML = items
    .map((item) => {
      const sum = item.quantity * item.unitPrice;
      const vat = (sum * item.vatRate) / 100;
      const totalItem = sum + vat;
      const itemLineID =
        "item-line-random-" + Math.floor(Math.random() * 100 + 1).toString();

      return `
      
      <tr  id=${itemLineID} style="border-bottom:1px solid #ccc;">

      <td style="text-align: left">${item.description}</td>
      <td style="text-align: right">${item.quantity}</td>
      <td style="text-align: right">${item.unitPrice}</td>
      <td style="text-align: right">${item.vatRate.toFixed(0)}</td>
      <td style="text-align: right">${totalItem}</td>
      </tr> `;
    })
    .join("");

  // totals
  document.getElementById("subtotal").innerText = invoice.subtotal;
  document.getElementById("vat").innerText = invoice.vatTotal;
  document.getElementById("total").innerText = invoice.total;
}

export function clearPreview() {
  //  console.log("Now erasing preview data on html");
  // clear data in preview in canvas
  document.getElementById("items").innerHTML = "";
  document.getElementById("subtotal").innerText = "";
  document.getElementById("vat").innerText = "";
  document.getElementById("total").innerText = "";
  document.getElementById("inv-number").innerText = "Nr:";
  document.getElementById("inv-date").innerText = "Dato: ";
  document.getElementById("customer").innerHTML = "NoName";

  /* TODO: use this if only specific lline(s) shall be removed
  // 1. Select all direct child elements of the 'top' div
  const children = document.querySelectorAll("#items > *");
  // 2. Loop through each child - use to clear specific line(s) 
  children.forEach((child) => {
    // 3. Check if the child has an ID defined
      if (child.id.includes("itemLine-")) {
      // 4. Set innerHTML (or textContent) to empty
      child.innerHTML = "";
    }
  });
  */

  console.log("Cleared all data from Faktura Preview");
  return;
}

export function clearInvoiceList() {
  document.getElementById("invoice-list").innerHTML = "";
}
