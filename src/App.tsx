import React, { useState, useMemo } from 'react';
import { ShieldCheck, Upload, AlertTriangle, Download, Lock } from 'lucide-react';
import { runThreeWayReconciliation } from './lib/engine';
import { PurchaseOrderLine, GoodsReceiptLine, SupplierInvoiceLine } from './types/reconciliation';
import { parseCSVLocally } from './lib/parsers';

export default function App() {
  const [route, setRoute] = useState<'LANDING' | 'APP'>('LANDING');
  const [poLines, setPoLines] = useState<PurchaseOrderLine[]>([]);
  const [grnLines, setGrnLines] = useState<GoodsReceiptLine[]>([]);
  const [invLines, setInvLines] = useState<SupplierInvoiceLine[]>([]);

  const { comparisons, exceptions } = useMemo(() => {
    return runThreeWayReconciliation(poLines, grnLines, invLines);
  }, [poLines, grnLines, invLines]);

  const loadDemo = () => {
    setPoLines([{ rowId: '1', poReference: 'PO-100', itemCode: 'WIDGET-A', description: 'Widget A', uom: 'EA', orderedQuantity: 100, unitPrice: 10, lineTotal: 1000, tax: 0 }]);
    setGrnLines([{ rowId: '1', poReference: 'PO-100', itemCode: 'WIDGET-A', description: 'Widget A', uom: 'EA', grnReference: 'GRN-1', receivedQuantity: 92, receiptDate: '2026-11-18' }]);
    setInvLines([{ rowId: '1', invoiceNumber: 'INV-1', poReference: 'PO-100', itemCode: 'WIDGET-A', description: 'Widget A', uom: 'EA', invoicedQuantity: 100, unitPrice: 10, lineTotal: 1000, tax: 0 }]);
    setRoute('APP');
  };

  const handlePoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setPoLines(await parseCSVLocally(e.target.files[0]));
  };

  if (route === 'LANDING') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
        <header className="border-b bg-white px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck className="text-emerald-700" /> MatchWise
          </div>
          <button onClick={() => setRoute('APP')} className="bg-slate-900 text-white px-4 py-2 rounded-md font-medium text-sm">
            Launch Application
          </button>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-20 text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-medium">
            <Lock size={14} /> Processed 100% locally in your browser
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight">Stop Paying Suppliers for What You Never Received.</h1>
          <p className="text-lg text-slate-600">Compare purchase orders, goods receipts, and invoices in seconds. Find discrepancies before you pay.</p>
          <button onClick={loadDemo} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-md font-semibold shadow-sm transition-colors">
            Run $80 Overbilling Demo
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Reconciliation Dashboard</h1>
          <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded shadow-sm text-sm font-medium">
            <Download size={16} /> Export
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="text-xs text-slate-500 font-semibold uppercase">Total Invoice Value</div>
            <div className="text-2xl font-bold mt-1">${comparisons.reduce((s, c) => s + c.actualInvoiceAmount, 0).toFixed(2)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="text-xs text-slate-500 font-semibold uppercase">Value Matched</div>
            <div className="text-2xl font-bold mt-1 text-emerald-700">
              ${comparisons.filter(c => c.status === 'MATCHED').reduce((s, c) => s + c.actualInvoiceAmount, 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 shadow-sm col-span-2">
            <div className="text-xs text-red-700 font-semibold uppercase">Total Monetary Discrepancy</div>
            <div className="text-2xl font-bold mt-1 text-red-700">
              ${exceptions.reduce((s, e) => s + e.variance, 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
