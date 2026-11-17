# MatchWise

MatchWise is a browser-based prototype for checking supplier invoices against purchase orders and goods receipt records. It is intended to help accounts payable teams spot quantity and price differences before approving an invoice.

## Project status

This repository currently contains an early source snapshot, not a complete runnable application. The landing page, reconciliation calculation, data types, and a CSV parser are present. The Vite entry page and configuration files (`index.html`, `vite.config.ts`, and TypeScript configuration) are not included, so the development and build commands need that project scaffolding before they can run successfully. Several dashboard controls are also visual placeholders; see [Current limitations](#current-limitations).

## What is implemented

- A landing page with a demo scenario for a purchase order, goods receipt, and invoice.
- A typed three-way reconciliation engine in [`src/lib/engine.ts`](src/lib/engine.ts).
- Types for purchase order lines, goods receipt lines, invoice lines, comparison results, tolerances, and exceptions in [`src/types/reconciliation.ts`](src/types/reconciliation.ts).
- A Papa Parse based CSV parser in [`src/lib/parsers.ts`](src/lib/parsers.ts). It maps the purchase-order headers below to typed rows and prefixes text values that begin with spreadsheet formula characters (`=`, `+`, `-`, or `@`).
- Dashboard summary values for invoice totals, matched invoice value, and exception variance.

The demo contains one item ordered for 100 units, received for 92, and invoiced for 100 at $10 each. The engine reports an $80 excess-invoice-quantity variance for that example.

## Reconciliation behavior

The current engine:

1. Normalizes item codes by removing non-alphanumeric characters and converting them to uppercase.
2. Groups receipt and invoice rows with purchase-order rows by normalized item code.
3. Calculates ordered, received, and invoiced quantities, expected payable amount, actual invoice amount, price variance, and tax variance.
4. Creates exceptions for invoices without a receipt, invoices exceeding received quantity, invoice prices above the purchase-order price, short deliveries, and invoice items that cannot be matched to a purchase-order item.

The default tolerance object is defined in `src/lib/engine.ts`. At present, the unit-price tolerance is used in the price exception check; the other tolerance fields are not applied by the engine. Matching is based on item code, not purchase-order reference, and the fuzzy matching threshold is not currently used.

## CSV input format

The parser expects a header row with these exact column names:

| Header | Parsed as |
| --- | --- |
| `PO Number` | Purchase-order reference |
| `SKU` | Item code |
| `Description` | Item description |
| `UOM` | Unit of measure; defaults to `EA` when blank |
| `Quantity` | Ordered quantity |
| `Unit Price` | Purchase-order unit price |
| `Total` | Purchase-order line total |
| `Tax` | Purchase-order tax |

The parser is implemented for purchase-order CSV data only. The current dashboard does not yet provide a connected file upload flow for purchase orders, goods receipts, or invoices.

## Local setup

Requirements: Node.js and npm.

Install the dependencies:

```bash
npm install
```

The package scripts are:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Run TypeScript project builds, then create a Vite production build |
| `npm test` | Run Vitest tests |
| `npm run test:e2e` | Run Playwright tests |

These commands are declared in `package.json`, but this source snapshot is missing the Vite and TypeScript configuration and entry files needed to run them. No test or browser configuration files are included either.

## Current limitations

- The dashboard's **Export** button has no export behavior attached.
- The CSV parser exists, but the purchase-order file handler is not connected to a visible upload control.
- Goods receipt and invoice upload flows are not implemented in the UI.
- The comparison engine matches lines using item code alone; it does not use the available purchase-order reference when grouping rows.
- Duplicate-invoice detection is not implemented, although a duplicate category is defined in the types.
- Currency is displayed with a dollar sign in the dashboard; multi-currency handling is not implemented.
- The declared quantity, rounding, and fuzzy matching tolerances are not yet used for matching decisions.
- The included package scripts reference test and build tools, but the corresponding project scaffolding and test files are absent from this snapshot.

## Source layout

```text
src/
├── App.tsx                  # Landing page, demo data, and dashboard summary
├── lib/
│   ├── engine.ts            # Three-way matching calculations and exceptions
│   └── parsers.ts           # Purchase-order CSV parsing
└── types/
    └── reconciliation.ts   # Reconciliation data contracts
```

## Technology

- React 18 and TypeScript
- Vite
- Papa Parse for CSV parsing
- Lucide React icons
- Vitest and Playwright are listed as development dependencies for testing
