export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
export type UnitOfMeasure = 'EA' | 'UNIT' | 'BOX' | 'CASE' | 'KG' | string;

export interface ToleranceSettings {
  quantityVarianceUnits: number;
  unitPriceVarianceAmount: number;
  currencyRoundingThreshold: number;
  fuzzySimilarityThreshold: number;
}

export interface DocumentLine {
  rowId: string;
  poReference: string;
  itemCode: string;
  description: string;
  uom: UnitOfMeasure;
}

export interface PurchaseOrderLine extends DocumentLine {
  orderedQuantity: number;
  unitPrice: number;
  lineTotal: number;
  tax: number;
}

export interface GoodsReceiptLine extends DocumentLine {
  grnReference: string;
  receivedQuantity: number;
  receiptDate: string;
}

export interface SupplierInvoiceLine extends DocumentLine {
  invoiceNumber: string;
  invoicedQuantity: number;
  unitPrice: number;
  lineTotal: number;
  tax: number;
}

export type ExceptionCategory = 
  | 'INVOICE_EXCEEDS_RECEIVED_QTY' | 'INVOICE_EXCEEDS_ORDERED_QTY'
  | 'SHORT_DELIVERY' | 'MISSING_GOODS_RECEIPT' | 'INVOICE_PRICE_EXCEEDS_PO_PRICE'
  | 'DUPLICATE_INVOICE' | 'UNKNOWN_INVOICE_PRODUCT' | 'UNMATCHED_PO_LINE';

export interface ReconciliationException {
  exceptionId: string;
  category: ExceptionCategory;
  productReference: string;
  expectedValue: string | number;
  actualValue: string | number;
  variance: number; // Monetary variance
  explanation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reviewStatus: 'OPEN' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
}

export interface ThreeWayComparisonLine {
  comparisonId: string;
  productKey: string;
  description: string;
  orderedQuantity: number;       // A
  receivedQuantity: number;      // B
  invoicedQuantity: number;      // C
  orderedUnitPrice: number;      // D
  invoicedUnitPrice: number;     // E
  expectedAmount: number;        // F
  actualInvoiceAmount: number;   // G
  priceVariance: number;         // H
  quantityVarianceUnits: number; // I
  taxVariance: number;           // J
  status: 'MATCHED' | 'WARNING' | 'DISCREPANCY';
}
