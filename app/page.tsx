'use client';

import React, { useState, useEffect } from 'react';
import { 
  InvoiceData, 
  InvoiceItem, 
  Customer, 
  Product, 
  Payment, 
  BusinessProfile, 
  DEFAULT_PYXIS_BUSINESS,
  PaymentMode
} from '../types';
import { InvoicePreview } from '../components/InvoicePreview';
import { AuthModal } from '../components/AuthModal';
import * as db from '../services/storage';
import { 
  formatGazetteDate, 
  fromInputDateFormat, 
  toInputDateFormat, 
  numberToWordsLKR 
} from '../lib/gazetteUtils';
import { 
  Printer, FileText, Plus, Trash2, Edit3, 
  Save, LayoutDashboard, Users, Package, 
  CheckCircle, ChevronRight, Settings,
  CreditCard, DollarSign, Loader2, LogOut,
  Sliders, ShieldCheck, Download, Search, Percent
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 11);

type ViewState = 'dashboard' | 'create-invoice' | 'customers' | 'products' | 'settings';

export default function Home() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Authentication State
  const [currentBusiness, setCurrentBusiness] = useState<BusinessProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Data Lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [productQuery, setProductQuery] = useState('');

  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [invoiceQuery, setInvoiceQuery] = useState('');

  // Settings State
  const [invoiceSequence, setInvoiceSequence] = useState<number>(1);
  const [settingsBusiness, setSettingsBusiness] = useState<Partial<BusinessProfile>>({});

  // Active Invoice Editor State
  const [showPreview, setShowPreview] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceData | null>(null);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer>({
    id: '',
    businessId: '',
    name: '',
    address: '',
    tin: '',
    phone: '',
    email: ''
  });

  const [showProductModal, setShowProductModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product>({
    id: '',
    businessId: '',
    code: '',
    description: '',
    unitPrice: 0
  });

  // ---------------- INITIAL DATA LOADING ----------------

  useEffect(() => {
    initAuthAndData();
  }, []);

  const initAuthAndData = async () => {
    setIsLoading(true);
    try {
      const auth = await db.getMe();
      if (auth.authenticated && auth.business) {
        setCurrentBusiness(auth.business);
        setSettingsBusiness(auth.business);
        await refreshBusinessData();
      } else {
        setShowAuthModal(true);
      }
    } catch (e) {
      console.warn('Failed to load session, showing auth modal', e);
      setShowAuthModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBusinessData = async () => {
    try {
      const [c, p, i, seqInfo] = await Promise.all([
        db.getCustomers(),
        db.getProducts(),
        db.getInvoices(),
        db.getSettingsInfo()
      ]);

      setCustomers(Array.isArray(c) ? c : []);
      setProducts(Array.isArray(p) ? p : []);
      setInvoiceSequence(seqInfo.sequence || 1);

      const safeInvoices = Array.isArray(i) ? i : [];
      const sortedInvoices = [...safeInvoices].sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });
      setInvoices(sortedInvoices);
    } catch (e) {
      console.error('Error refreshing business data', e);
    }
  };

  const handleAuthSuccess = async (biz: BusinessProfile) => {
    setCurrentBusiness(biz);
    setSettingsBusiness(biz);
    setShowAuthModal(false);
    setIsLoading(true);
    await refreshBusinessData();
    setIsLoading(false);
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await db.logout();
      setCurrentBusiness(null);
      setCustomers([]);
      setProducts([]);
      setInvoices([]);
      setShowAuthModal(true);
    }
  };

  // ---------------- INVOICE LOGIC ----------------

  const startNewInvoice = async () => {
    setIsLoading(true);
    try {
      const nextNo = await db.getNextInvoiceNumber();
      const todayFormatted = formatGazetteDate(new Date());

      const biz = currentBusiness || DEFAULT_PYXIS_BUSINESS;
      const initialVatRate = biz.vatRate ?? 0.18;
      const initialIsVat = biz.isVatRegistered !== false;

      setCurrentInvoice({
        id: generateId(),
        businessId: biz.id,
        invoiceNo: nextNo,
        date: todayFormatted,
        dateOfSupply: todayFormatted,
        placeOfSupply: biz.address || 'Same as Supplier Address',
        supplier: {
          tin: biz.tin || 'N/A',
          name: biz.businessName || '',
          address: biz.address || '',
          phone: biz.phone || ''
        },
        purchaser: {
          tin: '',
          name: '',
          address: '',
          phone: ''
        },
        items: [
          {
            id: generateId(),
            reference: '01',
            description: '',
            quantity: 1,
            unitPrice: 0,
            total: 0
          }
        ],
        totalValueOfSupply: 0,
        isVat: initialIsVat,
        vatRate: initialIsVat ? initialVatRate : 0,
        vatAmount: 0,
        grandTotal: 0,
        amountInWords: 'Zero Rupees Only',
        modeOfPayment: 'Credit',
        status: 'credit',
        payments: [],
        balanceDue: 0,
        additionalNotes: ''
      });

      setShowPreview(false);
      setView('create-invoice');
    } catch (e) {
      console.error('Failed to initialize invoice', e);
    } finally {
      setIsLoading(false);
    }
  };

  const editInvoice = (inv: InvoiceData) => {
    setCurrentInvoice(inv);
    setShowPreview(false);
    setView('create-invoice');
  };

  const recalculateInvoiceTotals = (
    items: InvoiceItem[],
    isVat: boolean,
    vatRate: number
  ) => {
    const totalValueOfSupply = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const vatAmount = isVat ? Number((totalValueOfSupply * vatRate).toFixed(2)) : 0;
    const grandTotal = Number((totalValueOfSupply + vatAmount).toFixed(2));
    const words = numberToWordsLKR(grandTotal);

    return {
      totalValueOfSupply: Number(totalValueOfSupply.toFixed(2)),
      vatAmount,
      grandTotal,
      amountInWords: words
    };
  };

  const updateInvoiceItem = (id: string, field: keyof InvoiceItem, value: any) => {
    if (!currentInvoice) return;

    setCurrentInvoice((prev) => {
      if (!prev) return null;
      const updatedItems = prev.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            const qty = Number(updated.quantity) || 0;
            const price = Number(updated.unitPrice) || 0;
            updated.total = Number((qty * price).toFixed(2));
          }
          return updated;
        }
        return item;
      });

      const totals = recalculateInvoiceTotals(updatedItems, prev.isVat, prev.vatRate);
      const totalPaid = (prev.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = Math.max(0, Number((totals.grandTotal - totalPaid).toFixed(2)));

      return {
        ...prev,
        items: updatedItems,
        ...totals,
        balanceDue
      };
    });
  };

  const selectProductForItem = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product || !currentInvoice) return;

    setCurrentInvoice((prev) => {
      if (!prev) return null;
      const updatedItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const qty = Number(item.quantity) || 1;
          const price = Number(product.unitPrice) || 0;
          return {
            ...item,
            description: product.description,
            reference: product.code || item.reference || '',
            unitPrice: price,
            total: Number((qty * price).toFixed(2))
          };
        }
        return item;
      });

      const totals = recalculateInvoiceTotals(updatedItems, prev.isVat, prev.vatRate);
      return {
        ...prev,
        items: updatedItems,
        ...totals
      };
    });
  };

  const selectCustomerForInvoice = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust || !currentInvoice) return;

    setCurrentInvoice({
      ...currentInvoice,
      customerId: cust.id,
      purchaser: {
        name: cust.name,
        tin: cust.tin || '',
        address: cust.address || '',
        phone: cust.phone || ''
      }
    });
  };

  const handleToggleVat = (enabled: boolean) => {
    if (!currentInvoice) return;
    const effectiveVatRate = enabled ? (currentBusiness?.vatRate || 0.18) : 0;
    const totals = recalculateInvoiceTotals(currentInvoice.items, enabled, effectiveVatRate);

    setCurrentInvoice({
      ...currentInvoice,
      isVat: enabled,
      vatRate: effectiveVatRate,
      ...totals
    });
  };

  const handleVatRateChange = (ratePercentage: number) => {
    if (!currentInvoice) return;
    const rateDecimal = Math.max(0, ratePercentage) / 100;
    const totals = recalculateInvoiceTotals(currentInvoice.items, currentInvoice.isVat, rateDecimal);

    setCurrentInvoice({
      ...currentInvoice,
      vatRate: rateDecimal,
      ...totals
    });
  };

  const saveCurrentInvoice = async () => {
    if (!currentInvoice) return;
    setIsLoading(true);
    try {
      const isNew = !invoices.some((i) => i.id === currentInvoice.id);

      const totalPaid = (currentInvoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
      let balanceDue = Math.max(0, Number((currentInvoice.grandTotal - totalPaid).toFixed(2)));
      let status: 'paid' | 'partial' | 'credit' = 'credit';

      if (currentInvoice.modeOfPayment === 'Cash') {
        status = 'paid';
        balanceDue = 0;
        if ((currentInvoice.payments || []).length === 0) {
          currentInvoice.payments = [
            {
              id: generateId(),
              date: currentInvoice.date,
              amount: currentInvoice.grandTotal,
              note: 'Paid in Full (Cash)'
            }
          ];
        }
      } else {
        if (balanceDue <= 0.05) status = 'paid';
        else if (totalPaid > 0) status = 'partial';
        else status = 'credit';
      }

      const invoiceToSave: InvoiceData = {
        ...currentInvoice,
        status,
        balanceDue
      };

      await db.saveInvoice(invoiceToSave);
      if (isNew) {
        await db.incrementInvoiceNumber();
      }

      await refreshBusinessData();
      setCurrentInvoice(invoiceToSave);
      setShowPreview(true);
    } catch (e: any) {
      alert(e.message || 'Failed to save invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCurrentInvoice = async () => {
    if (!currentInvoice) return;
    if (confirm(`Are you sure you want to delete invoice ${currentInvoice.invoiceNo}?`)) {
      setIsLoading(true);
      try {
        await db.deleteInvoice(currentInvoice.id);
        await refreshBusinessData();
        setCurrentInvoice(null);
        setView('dashboard');
      } catch (e: any) {
        alert(e.message || 'Failed to delete invoice');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const downloadInvoicePdf = async (invoice: InvoiceData) => {
    try {
      // @ts-ignore
      const html2canvas: any = (await import('html2canvas')).default;
      // @ts-ignore
      const jspdfModule: any = await import('jspdf');
      const jsPDF = jspdfModule.jsPDF;

      const el = document.getElementById('invoice-preview-container');
      if (!el) {
        alert('Preview element not rendered yet.');
        return;
      }

      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const safeName = (invoice.purchaser?.name || 'Customer').replace(/[^a-z0-9-_]/gi, '_');
      const fileName = `${invoice.invoiceNo}_${safeName}.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error('PDF export failed', e);
      alert('Could not export PDF. Use Print -> Save as PDF as a high quality alternative.');
    }
  };

  // ---------------- PAYMENTS ----------------

  const handleAddPayment = async () => {
    if (!currentInvoice || !paymentAmount) return;
    setIsLoading(true);
    try {
      const amt = parseFloat(paymentAmount);
      const pay: Payment = {
        id: generateId(),
        date: formatGazetteDate(new Date()),
        amount: amt,
        note: paymentNote || 'Payment recorded'
      };

      await db.addPayment(currentInvoice.id, pay);
      await refreshBusinessData();

      const allInvs = await db.getInvoices();
      const updated = allInvs.find((i) => i.id === currentInvoice.id);
      if (updated) setCurrentInvoice(updated);

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNote('');
    } catch (e: any) {
      alert(e.message || 'Payment recording failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- CUSTOMERS CRUD ----------------

  const handleSaveCustomer = async () => {
    if (!editingCustomer.name) {
      alert('Customer Name is required');
      return;
    }
    setIsLoading(true);
    try {
      await db.saveCustomer({
        ...editingCustomer,
        id: editingCustomer.id || generateId(),
        businessId: currentBusiness?.id || 'demo-pyxis'
      });
      await refreshBusinessData();
      setShowCustomerModal(false);
    } catch (e: any) {
      alert(e.message || 'Error saving customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsLoading(true);
    try {
      await db.deleteCustomer(customerToDelete.id);
      await refreshBusinessData();
      setCustomerToDelete(null);
    } catch (e: any) {
      alert(e.message || 'Failed to delete customer');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- PRODUCTS CRUD ----------------

  const handleSaveProduct = async () => {
    if (!editingProduct.description) {
      alert('Product Description is required');
      return;
    }
    setIsLoading(true);
    try {
      await db.saveProduct({
        ...editingProduct,
        id: editingProduct.id || generateId(),
        businessId: currentBusiness?.id || 'demo-pyxis'
      });
      await refreshBusinessData();
      setShowProductModal(false);
    } catch (e: any) {
      alert(e.message || 'Error saving product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsLoading(true);
    try {
      await db.deleteProduct(productToDelete.id);
      await refreshBusinessData();
      setProductToDelete(null);
    } catch (e: any) {
      alert(e.message || 'Failed to delete product');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- SETTINGS SAVE ----------------

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      const updatedBiz = await db.updateBusinessProfile(settingsBusiness);
      setCurrentBusiness(updatedBiz);

      await db.setInvoiceSequence(invoiceSequence);
      alert('Settings updated successfully!');
      await refreshBusinessData();
    } catch (e: any) {
      alert(e.message || 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- RENDER DASHBOARD ----------------

  const renderDashboard = () => {
    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + (inv.grandTotal - (inv.balanceDue || 0)),
      0
    );
    const totalDue = invoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

    const filteredInvoices = invoices.filter((inv) => {
      const q = invoiceQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (inv.invoiceNo || '').toLowerCase().includes(q) ||
        (inv.purchaser?.name || '').toLowerCase().includes(q) ||
        (inv.status || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-8 animate-fade-in">
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <DollarSign size={26} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Total Collected Revenue
                </div>
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                  LKR {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
                <CreditCard size={26} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Outstanding Receivables
                </div>
                <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                  LKR {totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-xl">
                <FileText size={26} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Total Invoices Issued
                </div>
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                  {invoices.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT INVOICES */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tax & Commercial Invoices</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                All invoices issued by {currentBusiness?.businessName || 'your business'}
              </p>
            </div>
            <button
              onClick={startNewInvoice}
              className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              <Plus size={18} /> Create New Invoice
            </button>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40 flex items-center gap-3">
            <Search size={18} className="text-gray-400" />
            <input
              type="search"
              placeholder="Search by Invoice No, Purchaser Name, or Status..."
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              className="w-full bg-transparent border-none text-sm outline-none placeholder-gray-400"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-300 uppercase text-[11px] tracking-wider font-bold">
                <tr>
                  <th className="p-4">Invoice No (Gazette)</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Purchaser Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Total (LKR)</th>
                  <th className="p-4 text-right">Due (LKR)</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                      No invoices found. Click "Create New Invoice" to issue your first invoice.
                    </td>
                  </tr>
                )}
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition">
                    <td className="p-4 font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">
                      {inv.invoiceNo}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300 text-xs font-mono">{inv.date}</td>
                    <td className="p-4 font-bold text-gray-900 dark:text-white">
                      {inv.purchaser?.name || 'Walk-in Client'}
                    </td>
                    <td className="p-4 text-xs">
                      {inv.isVat !== false ? (
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold px-2 py-0.5 rounded text-[10px]">
                          VAT ({Math.round((inv.vatRate || 0.18) * 100)}%)
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 px-2 py-0.5 rounded text-[10px]">
                          Non-VAT
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                            : inv.status === 'partial'
                            ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                      {Number(inv.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-mono font-semibold">
                      {(inv.balanceDue || 0) > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          {Number(inv.balanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          <CheckCircle size={15} className="inline" />
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => editInvoice(inv)}
                        className="text-sky-600 dark:text-sky-400 hover:text-sky-800 font-bold text-xs"
                      >
                        View & Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      
      {/* LOADING OVERLAY */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
          <Loader2 className="animate-spin text-sky-600 dark:text-sky-400" size={48} />
        </div>
      )}

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={showAuthModal}
        onSuccess={handleAuthSuccess}
      />

      {/* SIDEBAR NAVIGATION (NO-PRINT) */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex-shrink-0 flex flex-col no-print md:h-screen md:sticky top-0 z-30">
        
        {/* BRAND LOGO */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md">
              Py
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white">
                Pyxis
              </h1>
              <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-widest">
                IRD TAX BILLING
              </p>
            </div>
          </div>
        </div>

        {/* NAV BUTTONS */}
        <div className="p-4 space-y-1.5 flex-1">
          <button
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              view === 'dashboard'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>

          <button
            onClick={startNewInvoice}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              view === 'create-invoice'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <FileText size={20} /> New Invoice
          </button>

          <button
            onClick={() => setView('customers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              view === 'customers'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <Users size={20} /> Customers
          </button>

          <button
            onClick={() => setView('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              view === 'products'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <Package size={20} /> Products & Services
          </button>

          <button
            onClick={() => setView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              view === 'settings'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <Settings size={20} /> Settings & VAT
          </button>
        </div>

        {/* BUSINESS INFO & SIGNOUT */}
        {currentBusiness && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/80">
            <div className="mb-3">
              <p className="text-xs font-bold truncate text-gray-900 dark:text-white">
                {currentBusiness.businessName}
              </p>
              <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
                TIN: {currentBusiness.tin || 'N/A'}
              </p>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">
                {currentBusiness.ownerEmail}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900"
            >
              <LogOut size={14} /> Sign Out Business
            </button>
          </div>
        )}
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto overflow-y-auto w-full">
        
        {/* VIEW: DASHBOARD */}
        {view === 'dashboard' && renderDashboard()}

        {/* VIEW: CREATE / EDIT INVOICE */}
        {view === 'create-invoice' && currentInvoice && (
          <div className="space-y-6 animate-fade-in pb-20">
            
            {/* INVOICE TOOLBAR (NO-PRINT) */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView('dashboard')}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  <ChevronRight className="rotate-180" size={20} />
                </button>
                <div>
                  <h2 className="text-xl font-mono font-extrabold text-gray-900 dark:text-white">
                    {currentInvoice.invoiceNo}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-semibold uppercase text-[10px] bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                      {currentInvoice.status}
                    </span>
                    {currentInvoice.isVat ? (
                      <span className="text-sky-600 font-bold">
                        Tax Invoice ({Math.round(currentInvoice.vatRate * 100)}% VAT)
                      </span>
                    ) : (
                      <span className="text-gray-500 font-bold">Commercial (Without VAT)</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {!showPreview ? (
                  <>
                    <button
                      onClick={() => setShowPreview(true)}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl font-bold text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition"
                    >
                      <FileText size={16} /> Preview Gazette Layout
                    </button>
                    <button
                      onClick={saveCurrentInvoice}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition"
                    >
                      <Save size={16} /> Save Invoice
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowPreview(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl font-bold text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition"
                    >
                      <Edit3 size={16} /> Edit Form
                    </button>
                    <button
                      onClick={() => downloadInvoicePdf(currentInvoice)}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition"
                    >
                      <Download size={16} /> Download PDF
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition"
                    >
                      <Printer size={16} /> Print Tax Invoice
                    </button>
                    <button
                      onClick={deleteCurrentInvoice}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-bold text-xs transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            {showPreview ? (
              <div className="flex justify-center bg-gray-100 dark:bg-slate-900/80 p-4 md:p-8 rounded-2xl border border-gray-200 dark:border-slate-700">
                <div id="invoice-preview-container">
                  <InvoicePreview data={currentInvoice} />
                </div>
              </div>
            ) : (
              /* EDITOR FORM */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT 2 COLUMNS: CORE DETAILS */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* VAT MODE & RATE SCALE / SLIDER */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <Percent size={18} className="text-sky-600" />
                          VAT Function & Rate Adjustment
                        </h3>
                        <p className="text-xs text-gray-500">
                          Toggle between official Tax Invoice (with VAT) or Non-VAT invoice, and adjust rate.
                        </p>
                      </div>

                      {/* TOGGLE WITH VAT / WITHOUT VAT */}
                      <div className="flex items-center gap-3 bg-gray-100 dark:bg-slate-700 p-1.5 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleToggleVat(true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentInvoice.isVat
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          Tax Invoice (VAT)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleVat(false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            !currentInvoice.isVat
                              ? 'bg-gray-800 text-white dark:bg-slate-600 shadow-sm'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          Without VAT
                        </button>
                      </div>
                    </div>

                    {/* VAT RATE SCALE / SLIDER */}
                    {currentInvoice.isVat && (
                      <div className="pt-3 border-t border-gray-100 dark:border-slate-700 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-600 dark:text-gray-400">
                            Adjust VAT Rate Scale (%):
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 px-3 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                              {Math.round(currentInvoice.vatRate * 100)}%
                            </span>
                          </div>
                        </div>

                        {/* Interactive Range Slider */}
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min={0}
                            max={30}
                            step={1}
                            value={Math.round(currentInvoice.vatRate * 100)}
                            onChange={(e) => handleVatRateChange(parseInt(e.target.value, 10) || 0)}
                            className="w-full accent-sky-600 cursor-pointer h-2 bg-gray-200 dark:bg-slate-700 rounded-lg"
                          />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={Math.round(currentInvoice.vatRate * 100)}
                            onChange={(e) => handleVatRateChange(parseInt(e.target.value, 10) || 0)}
                            className="w-16 text-center py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-mono font-bold"
                          />
                        </div>

                        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                          <span>0% (Exempt)</span>
                          <span>15%</span>
                          <span>18% (Standard IRD)</span>
                          <span>20%</span>
                          <span>25%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PURCHASER DETAILS SECTION */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                        Purchaser Particulars (Gazette Annexure I)
                      </h3>
                      {customers.length > 0 && (
                        <select
                          onChange={(e) => selectCustomerForInvoice(e.target.value)}
                          defaultValue=""
                          className="text-xs py-1.5 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-medium outline-none"
                        >
                          <option value="" disabled>Choose Registered Customer...</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.tin ? `(TIN: ${c.tin})` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                          Purchaser's Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={currentInvoice.purchaser.name}
                          onChange={(e) =>
                            setCurrentInvoice({
                              ...currentInvoice,
                              purchaser: { ...currentInvoice.purchaser, name: e.target.value }
                            })
                          }
                          placeholder="e.g. Lanka Logistics (Pvt) Ltd"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                          Purchaser's TIN (9 Digits)
                        </label>
                        <input
                          type="text"
                          value={currentInvoice.purchaser.tin}
                          onChange={(e) =>
                            setCurrentInvoice({
                              ...currentInvoice,
                              purchaser: { ...currentInvoice.purchaser, tin: e.target.value }
                            })
                          }
                          placeholder="e.g. 109876543"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                          Purchaser's Address
                        </label>
                        <textarea
                          rows={2}
                          value={currentInvoice.purchaser.address}
                          onChange={(e) =>
                            setCurrentInvoice({
                              ...currentInvoice,
                              purchaser: { ...currentInvoice.purchaser, address: e.target.value }
                            })
                          }
                          placeholder="No. 45, Baseline Road, Colombo 09"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                          Telephone No.*
                        </label>
                        <input
                          type="text"
                          value={currentInvoice.purchaser.phone}
                          onChange={(e) =>
                            setCurrentInvoice({
                              ...currentInvoice,
                              purchaser: { ...currentInvoice.purchaser, phone: e.target.value }
                            })
                          }
                          placeholder="e.g. 011 254 3210"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                          Place of Supply*
                        </label>
                        <input
                          type="text"
                          value={currentInvoice.placeOfSupply || ''}
                          onChange={(e) =>
                            setCurrentInvoice({
                              ...currentInvoice,
                              placeOfSupply: e.target.value
                            })
                          }
                          placeholder="e.g. Colombo Warehouse"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* LINE ITEMS TABLE (GAZETTE SPECIFICATION) */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                        Goods or Services Line Items
                      </h3>
                      <button
                        onClick={() =>
                          setCurrentInvoice({
                            ...currentInvoice,
                            items: [
                              ...currentInvoice.items,
                              {
                                id: generateId(),
                                reference: String(currentInvoice.items.length + 1).padStart(2, '0'),
                                description: '',
                                quantity: 1,
                                unitPrice: 0,
                                total: 0
                              }
                            ]
                          })
                        }
                        className="text-sky-600 dark:text-sky-400 hover:text-sky-700 font-bold text-xs flex items-center gap-1"
                      >
                        <Plus size={16} /> Add Item Row
                      </button>
                    </div>

                    <div className="space-y-3">
                      {currentInvoice.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 grid grid-cols-12 gap-3 items-center"
                        >
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                              Ref*
                            </label>
                            <input
                              type="text"
                              value={item.reference || ''}
                              onChange={(e) => updateInvoiceItem(item.id, 'reference', e.target.value)}
                              placeholder={`0${idx + 1}`}
                              className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono"
                            />
                          </div>

                          <div className="col-span-5">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                              Description of Supply
                            </label>
                            {products.length > 0 && (
                              <select
                                onChange={(e) => selectProductForItem(item.id, e.target.value)}
                                defaultValue=""
                                className="w-full mb-1 text-[11px] py-1 px-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                              >
                                <option value="" disabled>Select from Product Catalog...</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.description} (Rs. {p.unitPrice})
                                  </option>
                                ))}
                              </select>
                            )}
                            <input
                              type="text"
                              required
                              value={item.description}
                              onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                              placeholder="Description of goods or services supplied"
                              className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs uppercase"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                              Qty
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-center font-mono font-bold"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                              Unit Price
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => updateInvoiceItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-right font-mono"
                            />
                          </div>

                          <div className="col-span-1 flex justify-center pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (currentInvoice.items.length > 1) {
                                  setCurrentInvoice({
                                    ...currentInvoice,
                                    items: currentInvoice.items.filter((i) => i.id !== item.id)
                                  });
                                }
                              }}
                              className="text-gray-400 hover:text-rose-600 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ADDITIONAL NOTES / REMARKS */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      Additional Information if any:* (Gazette Annexure I Item 5)
                    </label>
                    <textarea
                      rows={3}
                      value={currentInvoice.additionalNotes || ''}
                      onChange={(e) => setCurrentInvoice({ ...currentInvoice, additionalNotes: e.target.value })}
                      placeholder="Delivery notes, PO numbers, serial numbers, warranty terms, or remarks..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                </div>

                {/* RIGHT 1 COLUMN: DATES, PAYMENT & TOTALS */}
                <div className="space-y-6">
                  
                  {/* INVOICE & SUPPLY DATES */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Gazette Date Specifications
                    </h3>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                        Date of Invoice (MM/DD/YYYY)
                      </label>
                      <input
                        type="date"
                        value={toInputDateFormat(currentInvoice.date)}
                        onChange={(e) =>
                          setCurrentInvoice({
                            ...currentInvoice,
                            date: fromInputDateFormat(e.target.value)
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                        Date of Supply (MM/DD/YYYY)
                      </label>
                      <input
                        type="date"
                        value={toInputDateFormat(currentInvoice.dateOfSupply)}
                        onChange={(e) =>
                          setCurrentInvoice({
                            ...currentInvoice,
                            dateOfSupply: fromInputDateFormat(e.target.value)
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono outline-none"
                      />
                    </div>
                  </div>

                  {/* MODE OF PAYMENT (GAZETTE SPECIFICATION) */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Mode of Payment (Gazette Item 4.1.h)
                    </h3>
                    <select
                      value={currentInvoice.modeOfPayment}
                      onChange={(e) =>
                        setCurrentInvoice({
                          ...currentInvoice,
                          modeOfPayment: e.target.value as PaymentMode
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-bold outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Credit/Debit Card">Credit/Debit Card</option>
                      <option value="Mobile Payment">Mobile Payment</option>
                      <option value="Online Payment">Online Payment</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>

                  {/* TOTALS COMPUTATION (GAZETTE SPECIFICATION) */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                      Summary Calculation
                    </h3>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Value of Supply:</span>
                      <span className="font-mono font-bold">
                        {currentInvoice.totalValueOfSupply.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {currentInvoice.isVat && (
                      <div className="flex justify-between text-sm text-sky-600 dark:text-sky-400">
                        <span>VAT Amount (@ {Math.round(currentInvoice.vatRate * 100)}%):</span>
                        <span className="font-mono font-bold">
                          {currentInvoice.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-extrabold pt-3 border-t border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
                      <span>Total Consideration:</span>
                      <span className="text-sky-600 dark:text-sky-400">
                        LKR {currentInvoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* AMOUNT IN WORDS PREVIEW */}
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg text-xs italic text-gray-600 dark:text-gray-300">
                      "{currentInvoice.amountInWords}"
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-xs">
                      <span className="font-bold">Balance Due:</span>
                      <span className={`font-mono font-bold ${currentInvoice.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        LKR {currentInvoice.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {currentInvoice.balanceDue > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentAmount(String(currentInvoice.balanceDue));
                          setPaymentNote('');
                          setShowPaymentModal(true);
                        }}
                        className="w-full mt-2 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition hover:bg-emerald-100"
                      >
                        + Record Payment
                      </button>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* VIEW: CUSTOMERS */}
        {view === 'customers' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Customer Database</h2>
                <p className="text-xs text-gray-500">
                  Manage client accounts, addresses, and IRD Taxpayer Identification Numbers (TIN)
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingCustomer({
                    id: generateId(),
                    businessId: currentBusiness?.id || 'demo-pyxis',
                    name: '',
                    address: '',
                    tin: '',
                    phone: '',
                    email: ''
                  });
                  setShowCustomerModal(true);
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition flex items-center gap-2"
              >
                <Plus size={18} /> Add Customer
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40 flex items-center gap-3">
                <Search size={18} className="text-gray-400" />
                <input
                  type="search"
                  placeholder="Search customers by Name, TIN, Address or Phone..."
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-sm outline-none placeholder-gray-400"
                />
              </div>

              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-300 uppercase text-[11px] tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Purchaser TIN (9 Digits)</th>
                    <th className="p-4">Address</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {customers
                    .filter((c) => {
                      const q = customerQuery.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (c.name || '').toLowerCase().includes(q) ||
                        (c.tin || '').toLowerCase().includes(q) ||
                        (c.address || '').toLowerCase().includes(q) ||
                        (c.phone || '').toLowerCase().includes(q)
                      );
                    })
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition">
                        <td className="p-4 font-bold text-gray-900 dark:text-white">{c.name}</td>
                        <td className="p-4 font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">
                          {c.tin || 'N/A'}
                        </td>
                        <td className="p-4 text-xs text-gray-600 dark:text-gray-300">{c.address || '-'}</td>
                        <td className="p-4 text-xs text-gray-600 dark:text-gray-300">{c.phone || '-'}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-3 text-xs font-bold">
                            <button
                              onClick={() => {
                                setEditingCustomer(c);
                                setShowCustomerModal(true);
                              }}
                              className="text-sky-600 hover:text-sky-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setCustomerToDelete(c)}
                              className="text-rose-600 hover:text-rose-800"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: PRODUCTS */}
        {view === 'products' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Product & Service Catalog</h2>
                <p className="text-xs text-gray-500">
                  Manage items, default prices, and codes for quick invoice generation
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingProduct({
                    id: generateId(),
                    businessId: currentBusiness?.id || 'demo-pyxis',
                    code: '',
                    description: '',
                    unitPrice: 0
                  });
                  setShowProductModal(true);
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition flex items-center gap-2"
              >
                <Plus size={18} /> Add Product / Service
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40 flex items-center gap-3">
                <Search size={18} className="text-gray-400" />
                <input
                  type="search"
                  placeholder="Search products by Description or Code..."
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-sm outline-none placeholder-gray-400"
                />
              </div>

              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-300 uppercase text-[11px] tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Item Code (Ref)</th>
                    <th className="p-4">Description of Supply</th>
                    <th className="p-4 text-right">Base Price (Excl. VAT)</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {products
                    .filter((p) => {
                      const q = productQuery.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (p.description || '').toLowerCase().includes(q) ||
                        (p.code || '').toLowerCase().includes(q)
                      );
                    })
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition">
                        <td className="p-4 font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
                          {p.code || '-'}
                        </td>
                        <td className="p-4 font-bold text-gray-900 dark:text-white uppercase text-xs">
                          {p.description}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                          LKR {Number(p.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-3 text-xs font-bold">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setShowProductModal(true);
                              }}
                              className="text-sky-600 hover:text-sky-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="text-rose-600 hover:text-rose-800"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: SETTINGS */}
        {view === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">System & VAT Configuration</h2>
              <p className="text-xs text-gray-500">
                Update your business identity, Inland Revenue Department (IRD) TIN, and billing parameters
              </p>
            </div>

            {/* SECTION 1: BUSINESS IDENTITY */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-3">
                <ShieldCheck size={18} className="text-sky-600" />
                Business Particulars (Printed on Invoices)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Company / Business Name *
                  </label>
                  <input
                    type="text"
                    value={settingsBusiness.businessName || ''}
                    onChange={(e) => setSettingsBusiness({ ...settingsBusiness, businessName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Supplier TIN (9-Digit IRD Number) *
                  </label>
                  <input
                    type="text"
                    value={settingsBusiness.tin || ''}
                    onChange={(e) => setSettingsBusiness({ ...settingsBusiness, tin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Business Registration (BR) No.
                  </label>
                  <input
                    type="text"
                    value={settingsBusiness.brNumber || ''}
                    onChange={(e) => setSettingsBusiness({ ...settingsBusiness, brNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Official Telephone Number
                  </label>
                  <input
                    type="text"
                    value={settingsBusiness.phone || ''}
                    onChange={(e) => setSettingsBusiness({ ...settingsBusiness, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Business Address *
                  </label>
                  <textarea
                    rows={2}
                    value={settingsBusiness.address || ''}
                    onChange={(e) => setSettingsBusiness({ ...settingsBusiness, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Header Slogan / Subtitle
                  </label>
                  <input
                    type="text"
                    value={settingsBusiness.slogan || ''}
                    onChange={(e) => setSettingsBusiness({ ...settingsBusiness, slogan: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: VAT RATE SCALE / SLIDER IN SETTINGS */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-3">
                <Sliders size={18} className="text-sky-600" />
                Default VAT Rate & Scale Adjustment
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block">Enable VAT by Default</span>
                    <span className="text-[11px] text-gray-500">
                      When enabled, newly created invoices default to Tax Invoice mode
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsBusiness.isVatRegistered ?? true}
                    onChange={(e) => setSettingsBusiness({ ...settingsBusiness, isVatRegistered: e.target.checked })}
                    className="w-5 h-5 accent-sky-600"
                  />
                </div>

                {settingsBusiness.isVatRegistered !== false && (
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-600 dark:text-gray-400">
                        Default VAT Percentage:
                      </span>
                      <span className="font-mono font-bold text-sm bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 px-3 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                        {Math.round((settingsBusiness.vatRate ?? 0.18) * 100)}%
                      </span>
                    </div>

                    {/* INTERACTIVE VAT RATE SCALE / SLIDER */}
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={0}
                        max={30}
                        step={1}
                        value={Math.round((settingsBusiness.vatRate ?? 0.18) * 100)}
                        onChange={(e) =>
                          setSettingsBusiness({
                            ...settingsBusiness,
                            vatRate: (parseInt(e.target.value, 10) || 0) / 100
                          })
                        }
                        className="w-full accent-sky-600 cursor-pointer h-2.5 bg-gray-200 dark:bg-slate-700 rounded-lg"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round((settingsBusiness.vatRate ?? 0.18) * 100)}
                        onChange={(e) =>
                          setSettingsBusiness({
                            ...settingsBusiness,
                            vatRate: (parseInt(e.target.value, 10) || 0) / 100
                          })
                        }
                        className="w-16 text-center py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                      <span>0%</span>
                      <span>15%</span>
                      <span>18% (IRD Standard)</span>
                      <span>20%</span>
                      <span>30%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: GAZETTE NUMBERING SPECIFICATIONS */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-slate-700 pb-3">
                Gazette Serial Numbering Parameters (YYMMM_QQQQ_XXXXX)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Branch / Entity Code (QQQQ)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={settingsBusiness.branchCode || 'BR01'}
                    onChange={(e) =>
                      setSettingsBusiness({
                        ...settingsBusiness,
                        branchCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                      })
                    }
                    placeholder="BR01"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono uppercase focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Alphanumeric branch code (1 to 15 chars) as defined in Gazette Section 4.1.a.iii.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Next Sequential Counter (XXXXX)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={invoiceSequence}
                    onChange={(e) => setInvoiceSequence(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    The next invoice created will use this sequence number.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center gap-2"
                >
                  <Save size={18} /> Save Settings & Parameters
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-slate-700 animate-fade-in">
            <h3 className="font-bold text-base text-gray-900 dark:text-white mb-4">Record Payment</h3>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">Amount (LKR)</label>
                <input
                  type="number"
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono font-bold outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">Payment Note / Cheque Ref</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Cheque No 882910"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-gray-500 font-bold hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition"
                >
                  Save Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER EDIT MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-slate-700 animate-fade-in">
            <h3 className="font-bold text-base text-gray-900 dark:text-white mb-4">Customer Details</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  placeholder="Company or Individual Name"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">Purchaser TIN (9 Digits)</label>
                <input
                  type="text"
                  value={editingCustomer.tin}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, tin: e.target.value })}
                  placeholder="e.g. 109876543"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={editingCustomer.address}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 text-gray-500 font-bold hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomer}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold transition"
                >
                  Save Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT EDIT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-slate-700 animate-fade-in">
            <h3 className="font-bold text-base text-gray-900 dark:text-white mb-4">Product / Service Details</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">Item Code (Ref)</label>
                <input
                  type="text"
                  value={editingProduct.code || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}
                  placeholder="e.g. ITM-001"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">Description *</label>
                <input
                  type="text"
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="e.g. Premium Service / Product"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm uppercase outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">Base Price Excl. VAT (LKR) *</label>
                <input
                  type="number"
                  step="any"
                  value={editingProduct.unitPrice}
                  onChange={(e) => setEditingProduct({ ...editingProduct, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono font-bold outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-gray-500 font-bold hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold transition"
                >
                  Save Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE CUSTOMER MODAL */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-slate-700 animate-fade-in text-xs">
            <h3 className="font-bold text-base text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Are you sure you want to delete customer <strong>{customerToDelete.name}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 text-gray-500 font-bold hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PRODUCT MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-slate-700 animate-fade-in text-xs">
            <h3 className="font-bold text-base text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Are you sure you want to delete product <strong>{productToDelete.description}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-gray-500 font-bold hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
