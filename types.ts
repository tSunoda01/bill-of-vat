export interface BusinessProfile {
  id: string;
  businessName: string;
  tin: string; // 9-digit Inland Revenue Department TIN
  brNumber: string; // Business Registration Number
  address: string;
  phone: string;
  slogan: string;
  ownerName: string;
  ownerEmail: string;
  passwordHash?: string;
  branchCode: string; // 'QQQQ' entity code in YYMMM_QQQQ_XXXXX (1-15 alphanumeric)
  isVatRegistered: boolean; // default true
  vatRate: number; // e.g. 0.18 (18%) or 0.20 (20%)
  invoiceSequence: number; // sequential counter
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  reference?: string; // Optional reference / item code (Gazette Annexure I)
  description: string;
  quantity: number;
  unitPrice: number; // Unit price excluding VAT
  total: number; // quantity * unitPrice (Amount excluding VAT)
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  address: string;
  tin: string; // Purchaser TIN (9 digits)
  phone?: string;
  email?: string;
}

export interface Product {
  id: string;
  businessId: string;
  code?: string;
  description: string;
  unitPrice: number; // Base price excluding VAT
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  note: string;
}

export type PaymentMode = 
  | 'Cash' 
  | 'Bank Transfer' 
  | 'Cheque' 
  | 'Credit/Debit Card' 
  | 'Mobile Payment' 
  | 'Online Payment' 
  | 'Credit';

export interface PartyDetails {
  tin: string;
  name: string;
  address: string;
  phone?: string;
}

export interface InvoiceData {
  id: string;
  businessId: string;
  invoiceNo: string; // Gazette format: YYMMM_QQQQ_XXXXX
  date: string; // Date of Invoice: MM/DD/YYYY
  dateOfSupply: string; // Date of Supply: MM/DD/YYYY
  placeOfSupply?: string; // Optional Place of Supply
  additionalNotes?: string; // Additional information if any
  
  // Supplier & Purchaser (Gazette specification)
  supplier: PartyDetails;
  purchaser: PartyDetails;
  customerId?: string;

  // Items & Amounts
  items: InvoiceItem[];
  totalValueOfSupply: number; // Total net amount payable exclusive of VAT (LKR)
  isVat: boolean; // True = Tax Invoice, False = Without VAT / Commercial Invoice
  vatRate: number; // Value Added Tax rate (e.g. 0.18, 0.20, 0)
  vatAmount: number; // VAT charged
  grandTotal: number; // Total consideration inclusive of VAT
  amountInWords?: string; // Total consideration expressed in words

  // Payment Details
  modeOfPayment: PaymentMode;
  status: 'paid' | 'unpaid' | 'partial' | 'credit';
  payments: Payment[];
  balanceDue: number;
}

export const DEFAULT_PYXIS_BUSINESS: BusinessProfile = {
  id: "demo-pyxis",
  businessName: "PYXIS ENTERPRISE SOLUTIONS (PVT) LTD",
  tin: "102345678",
  brNumber: "PV-00293841",
  address: "Level 14, World Trade Centre, Echelon Square, Colombo 01",
  phone: "011 234 5678",
  slogan: "ADVANCED ENTERPRISE BILLING & TAX INVOICE SYSTEMS",
  ownerName: "Chief Financial Officer",
  ownerEmail: "admin@pyxis.lk",
  branchCode: "BR01",
  isVatRegistered: true,
  vatRate: 0.18,
  invoiceSequence: 1,
  createdAt: new Date().toISOString()
};