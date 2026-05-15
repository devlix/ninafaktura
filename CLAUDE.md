# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

The app uses native ES modules (`type="module"`) so it **must** be served over HTTP — opening `index.html` directly via `file://` will not work.

### Tailwind CSS (local CLI — required for offline PWA)

The Tailwind CDN is replaced by a locally compiled stylesheet (`css/style.css`). **You must run the Tailwind watcher whenever you edit HTML classes**, otherwise changes won't appear.

```bash
npm run dev      # watch mode — recompiles css/style.css on every change
npm run build    # one-shot minified build for production
```

Input: `src/input.css` → Output: `css/style.css` (committed, loaded by `index.html`).

### HTTP server (separate terminal)

```bash
python3 -m http.server 8080   # or: npx serve .
```

Then open `http://localhost:8080`. Run both terminals simultaneously during development.

## Architecture

This is a **vanilla JS PWA** (no framework, no bundler) backed by Firebase (Firestore + Google Auth). The JS modules have strict single responsibilities:

| File | Responsibility |
|---|---|
| `js/firebase.js` | Firebase init only — exports `db`, `auth`, `provider` |
| `js/state.js` | Shared mutable state — exports `currentUser`, `setCurrentUser`, `DEBUG` |
| `js/invoices.js` | Firestore data layer — `saveInvoice`, `subscribeToInvoices`, `updateInvoice`, `updateInvoiceStatus` |
| `js/ui.js` | DOM/render only — all functions that touch the HTML |
| `js/app.js` | Orchestrator — wires auth state, form logic, view switching, PDF export |

`app.js` imports from all others. `ui.js` imports from `state.js` and `invoices.js`. `state.js` was extracted specifically to break the previous circular dependency between `app.js` and `ui.js`.

## Key data flow

1. `onAuthStateChanged` in `app.js` calls `startApp(user)`
2. `startApp` calls `subscribeToInvoices(uid, updateDataAndHtml)` — returns an unsubscribe function stored in `unsubscribeInvoices`
3. Every Firestore snapshot triggers `updateDataAndHtml(invoices)` → `renderInvoices` + `renderInvoicePreview` (latest invoice)
4. `cleanup()` must be called on logout and page unload to cancel the Firestore listener and clear state

## Firestore data model

- Collection `invoices`: one document per invoice, field `ownerId` = `user.uid` (used in security rules)
- Collection `counters` / document `invoice`: holds `currentNumber` for sequential invoice numbering — updated via Firestore transaction in `saveInvoice`
- Query in `subscribeToInvoices` orders by `customer.name` asc then `invoiceNumberRaw` desc, limited to 50

### Invoice document fields

```yaml
ownerId         string    Firebase Auth uid
status          string    "draft" | "sent" | "paid" | "cancelled"
invoiceNumber   string    zero-padded e.g. "000042"
invoiceNumberRaw number   raw integer (used for sort)
createdAt       Timestamp Firestore server timestamp
updatedAt       Timestamp set on every updateInvoice / updateInvoiceStatus call
deresRef        string    customer's reference (optional)
vaarRef         string    our internal reference (optional)
customer        object
  .name         string    required
  .orgnr        string    Norwegian org number (optional)
  .address      string    street address (optional)
  .city         string    postal code + city (optional)
  .email        string    required
items           array
  [].description string
  [].quantity    number
  [].unitPrice   number
  [].vatRate     number   percentage e.g. 25
subtotal        number    sum of quantity × unitPrice
vatTotal        number    sum of vat per line
total           number    subtotal + vatTotal
```

### Status lifecycle (bidirectional)

```text
draft ──► sent ──► paid
  ▲         │  ▲    │
  │         ▼  │    ▼
  └── cancelled ◄───┘   (all backward transitions allowed)
```

`NEXT_STATUSES` table in `js/ui.js` encodes all valid transitions.
`updateInvoiceStatus(id, newStatus)` in `js/invoices.js` writes status + updatedAt.

## PWA / offline

- Service worker in `sw.js` (cache name `faktura-v2`) caches all static assets on install — includes `css/style.css` (Tailwind output) and `css/invoice.css`
- Firestore persistence is enabled via `persistentLocalCache` + `persistentMultipleTabManager` — data survives offline and across tabs
- Firebase API traffic is explicitly bypassed by the service worker (let Firebase SDK handle it)
- When bumping the SW cache, update `CACHE_NAME` in `sw.js`

## PDF export

Uses `html2canvas` + `jsPDF` loaded from cdnjs CDN (not npm). The `#invoicePreview` div is rendered to canvas and saved as PDF. The browser cannot attach files to `mailto:` automatically — the user must attach the downloaded PDF manually.

## Firebase project

Project ID: `ninafaktura`. The `firebase.js` API key is the public web API key — safe to expose client-side; access is controlled by Firestore security rules on the server.
