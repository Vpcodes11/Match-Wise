import { 
  PurchaseOrderLine, GoodsReceiptLine, SupplierInvoiceLine, 
  ThreeWayComparisonLine, ReconciliationException, ToleranceSettings 
} from '../types/reconciliation';

export const DEFAULT_TOLERANCES: ToleranceSettings = {
  quantityVarianceUnits: 0,
  unitPriceVarianceAmount: 0.00,
  currencyRoundingThreshold: 0.02,
  fuzzySimilarityThreshold: 0.85
};

export const roundCurrency = (val: number) => Math.round(val * 100) / 100;
export const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

export function runThreeWayReconciliation(
  poLines: PurchaseOrderLine[],
  grnLines: GoodsReceiptLine[],
  invoiceLines: SupplierInvoiceLine[],
  tolerances: ToleranceSettings = DEFAULT_TOLERANCES
) {
  const comparisons: ThreeWayComparisonLine[] = [];
  const exceptions: ReconciliationException[] = [];
  const usedInvoiceIds = new Set<string>();

  poLines.forEach((po, index) => {
    const matchedGrns = grnLines.filter(g => normalize(g.itemCode) === normalize(po.itemCode));
    const matchedInvs = invoiceLines.filter(i => {
      if (normalize(i.itemCode) === normalize(po.itemCode) && !usedInvoiceIds.has(i.rowId)) {
        usedInvoiceIds.add(i.rowId);
        return true;
      }
      return false;
    });

    const orderedQuantity = po.orderedQuantity;
    const receivedQuantity = matchedGrns.reduce((sum, g) => sum + g.receivedQuantity, 0);
    const invoicedQuantity = matchedInvs.reduce((sum, i) => sum + i.invoicedQuantity, 0);
    
    const orderedUnitPrice = po.unitPrice;
    const actualInvoiceAmount = roundCurrency(matchedInvs.reduce((sum, i) => sum + i.lineTotal, 0));
    const invoicedUnitPrice = invoicedQuantity > 0 ? roundCurrency(actualInvoiceAmount / invoicedQuantity) : 0;

    const payableQty = Math.min(orderedQuantity, receivedQuantity);
    const expectedAmount = roundCurrency(payableQty * orderedUnitPrice);
    
    const quantityVarianceUnits = invoicedQuantity - receivedQuantity;
    const priceVariance = invoicedQuantity > 0 ? roundCurrency((invoicedUnitPrice - orderedUnitPrice) * invoicedQuantity) : 0;

    const expectedTax = roundCurrency(expectedAmount * (po.tax / po.lineTotal || 0));
    const actualTax = roundCurrency(matchedInvs.reduce((sum, i) => sum + i.tax, 0));
    const taxVariance = actualTax - expectedTax;

    let status: ThreeWayComparisonLine['status'] = 'MATCHED';
    const comparisonId = `CMP-${index + 1}-${po.rowId}`;

    if (receivedQuantity === 0 && invoicedQuantity > 0) {
      status = 'DISCREPANCY';
      exceptions.push({
        exceptionId: `EXC-NO-GRN-${po.rowId}`,
        category: 'MISSING_GOODS_RECEIPT',
        productReference: po.itemCode,
        expectedValue: orderedQuantity,
        actualValue: 0,
        variance: actualInvoiceAmount,
        explanation: `Invoice for ${invoicedQuantity} units received, but no goods receipt recorded.`,
        severity: 'CRITICAL',
        reviewStatus: 'OPEN'
      });
    }

    if (invoicedQuantity > receivedQuantity && receivedQuantity > 0) {
      status = 'DISCREPANCY';
      exceptions.push({
        exceptionId: `EXC-OVERBILL-${po.rowId}`,
        category: 'INVOICE_EXCEEDS_RECEIVED_QTY',
        productReference: po.itemCode,
        expectedValue: receivedQuantity,
        actualValue: invoicedQuantity,
        variance: roundCurrency((invoicedQuantity - receivedQuantity) * invoicedUnitPrice),
        explanation: `Supplier invoiced for ${invoicedQuantity - receivedQuantity} units more than were delivered.`,
        severity: 'CRITICAL',
        reviewStatus: 'OPEN'
      });
    }

    if (invoicedUnitPrice - orderedUnitPrice > tolerances.unitPriceVarianceAmount) {
      status = 'DISCREPANCY';
      exceptions.push({
        exceptionId: `EXC-PRICE-${po.rowId}`,
        category: 'INVOICE_PRICE_EXCEEDS_PO_PRICE',
        productReference: po.itemCode,
        expectedValue: orderedUnitPrice,
        actualValue: invoicedUnitPrice,
        variance: priceVariance,
        explanation: `Invoiced unit price exceeds PO price by $${(invoicedUnitPrice - orderedUnitPrice).toFixed(2)}.`,
        severity: 'HIGH',
        reviewStatus: 'OPEN'
      });
    }

    if (orderedQuantity > receivedQuantity) {
      status = status === 'DISCREPANCY' ? 'DISCREPANCY' : 'WARNING';
      exceptions.push({
        exceptionId: `EXC-SHORT-${po.rowId}`,
        category: 'SHORT_DELIVERY',
        productReference: po.itemCode,
        expectedValue: orderedQuantity,
        actualValue: receivedQuantity,
        variance: roundCurrency((orderedQuantity - receivedQuantity) * orderedUnitPrice),
        explanation: `Short delivery: Received ${receivedQuantity} of ${orderedQuantity} ordered.`,
        severity: 'MEDIUM',
        reviewStatus: 'OPEN'
      });
    }

    comparisons.push({
      comparisonId, productKey: po.itemCode, description: po.description,
      orderedQuantity, receivedQuantity, invoicedQuantity, orderedUnitPrice, invoicedUnitPrice,
      expectedAmount, actualInvoiceAmount, priceVariance, quantityVarianceUnits, taxVariance, status
    });
  });

  invoiceLines.filter(i => !usedInvoiceIds.has(i.rowId)).forEach((inv, index) => {
    exceptions.push({
      exceptionId: `EXC-UNKNOWN-${index}`,
      category: 'UNKNOWN_INVOICE_PRODUCT',
      productReference: inv.itemCode,
      expectedValue: 'On PO',
      actualValue: 'Not on PO',
      variance: inv.lineTotal,
      explanation: `Invoice line item ${inv.itemCode} could not be matched to the PO.`,
      severity: 'HIGH',
      reviewStatus: 'OPEN'
    });
  });

  return { comparisons, exceptions };
}
