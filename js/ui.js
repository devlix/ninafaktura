/* =============  invoices.js  ===================
 * Alt som rører DOM
 * =============================================== */

export function renderInvoices(invoices) {
  const container = document.getElementById("invoice-list");

  // 1. Sjekk om det er data å vise
  if (!invoices || invoices.length === 0) {
    container.innerHTML = "<p>Ingen fakturaer funnet.</p>";
    return;
  }

  // 2. Bygg HTML-strengen
  // Vi bruker .map() for å lage en <li> per faktura og .join('') for å gjøre det til tekst
  const html = invoices
    .map(
      (invoice) => `
    <div class="invoice-card" data-id="${invoice.id}">
      <h3>Faktura #${invoice.invoiceNumber || "Mangler nummer"}</h3>
      <p>Beløp: ${invoice.amount} kr</p>
      <p>Status: <span class="status-${invoice.status}">${
        invoice.status
      }</span></p>
      <button onclick="viewDetails('${invoice.id}')">Se detaljer</button>
    </div>
  `
    )
    .join("");

  // 3. Oppdater DOM-en i ett jafs (effektivt)
  container.innerHTML = html;
}

export function viewDetails(invoiceID) {
  alert("🕵️‍♀️ Not yet implemented");
}
window.viewDetails = viewDetails;

export function renderInvoice(invoice) {
  // stopp hvis ingen invoice
  if (!invoice) {
    console.warn("No invoice to render");
    alert("!! No invoice found !!");
    return;
  }

  // sett faktura info
  document.getElementById("inv-number").innerText = "Nr: " + invoice.id;

  document.getElementById("inv-date").innerText =
    "Dato: " +
    new Date(
      invoice.createdAt.seconds * 1000 + invoice.createdAt.nanoseconds / 1000
    ).toLocaleDateString();

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

  itemsEl.innerHTML = "";

  itemsEl.innerHTML = items
    .map((item) => {
      const sum = item.quantity * item.unitPrice;
      const vat = (sum * item.vatRate) / 100;
      const totalItem = sum + vat;

      return `
      
      <tr style="border-bottom:1px solid #ccc;">

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
