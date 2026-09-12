import fs from 'fs';
import path from 'path';
import { dbConnect } from './db';
import { BusinessModel, CustomerModel, ProductModel, InvoiceModel, SettingModel } from './models';
import { BusinessProfile, Customer, Product, InvoiceData, DEFAULT_PYXIS_BUSINESS } from '../types';
import { hashPassword } from './auth';

interface LocalDatabase {
  businesses: BusinessProfile[];
  customers: Customer[];
  products: Product[];
  invoices: InvoiceData[];
  settings: Record<string, any>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'pyxis-db.json');

// Initialize in-memory cache to make reads fast and synchronous when using local store
let localDbCache: LocalDatabase | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function ensureDataFile(): LocalDatabase {
  if (localDbCache) return localDbCache;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      localDbCache = JSON.parse(raw);
      if (localDbCache && Array.isArray(localDbCache.businesses)) {
        return localDbCache;
      }
    } catch (e) {
      console.warn('[Pyxis Storage] Error parsing data file, initializing fresh database', e);
    }
  }

  // Seed default database
  const demoHashedPassword = hashPassword('password123');
  const demoBusiness: BusinessProfile = {
    ...DEFAULT_PYXIS_BUSINESS,
    passwordHash: demoHashedPassword
  };

  const sampleCustomers: Customer[] = [
    {
      id: 'cust-1',
      businessId: demoBusiness.id,
      name: 'LANKA COMMERCIAL ENTERPRISES (PVT) LTD',
      tin: '109876543',
      address: 'No. 88, Galle Road, Colombo 03',
      phone: '011 255 4321',
      email: 'purchasing@lankacommercial.lk'
    },
    {
      id: 'cust-2',
      businessId: demoBusiness.id,
      name: 'CEYLON TRADING & LOGISTICS CO.',
      tin: '105432198',
      address: 'Warehouse Complex B, Peliyagoda',
      phone: '011 291 0022',
      email: 'logistics@ceylontrading.lk'
    }
  ];

  const sampleProducts: Product[] = [
    {
      id: 'prod-1',
      businessId: demoBusiness.id,
      code: 'SRV-001',
      description: 'Enterprise ERP System Consultation (Monthly)',
      unitPrice: 125000
    },
    {
      id: 'prod-2',
      businessId: demoBusiness.id,
      code: 'SRV-002',
      description: 'Cloud Infrastructure & Managed Database Support',
      unitPrice: 85000
    },
    {
      id: 'prod-3',
      businessId: demoBusiness.id,
      code: 'LIC-003',
      description: 'Annual Software Assurance & Security License',
      unitPrice: 45000
    }
  ];

  localDbCache = {
    businesses: [demoBusiness],
    customers: sampleCustomers,
    products: sampleProducts,
    invoices: [],
    settings: {
      [`${demoBusiness.id}:seq`]: 1
    }
  };

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(localDbCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Pyxis Storage] Failed to write initial data file', err);
  }

  return localDbCache;
}

async function persistLocalDb(): Promise<void> {
  if (!localDbCache) return;
  const dataToSave = JSON.stringify(localDbCache, null, 2);
  
  writeQueue = writeQueue.then(async () => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      await fs.promises.writeFile(DATA_FILE, dataToSave, 'utf-8');
    } catch (e) {
      console.error('[Pyxis Storage] Error persisting database to disk', e);
    }
  });

  return writeQueue;
}

// ---------------- BUSINESS PROFILE METHODS ----------------

export async function getBusinessById(id: string): Promise<BusinessProfile | null> {
  const mongoose = await dbConnect();
  if (mongoose) {
    const doc = await BusinessModel.findOne({ id }).lean();
    return doc ? (doc as unknown as BusinessProfile) : null;
  }

  const db = ensureDataFile();
  return db.businesses.find(b => b.id === id) || null;
}

export async function getBusinessByEmail(email: string): Promise<BusinessProfile | null> {
  const cleanEmail = email.trim().toLowerCase();
  const mongoose = await dbConnect();
  if (mongoose) {
    const doc = await BusinessModel.findOne({ ownerEmail: cleanEmail }).lean();
    return doc ? (doc as unknown as BusinessProfile) : null;
  }

  const db = ensureDataFile();
  return db.businesses.find(b => b.ownerEmail.toLowerCase() === cleanEmail) || null;
}

export async function createBusiness(biz: BusinessProfile): Promise<BusinessProfile> {
  biz.ownerEmail = biz.ownerEmail.trim().toLowerCase();
  const mongoose = await dbConnect();
  if (mongoose) {
    await BusinessModel.findOneAndUpdate({ id: biz.id }, biz, { upsert: true });
    return biz;
  }

  const db = ensureDataFile();
  const existingIdx = db.businesses.findIndex(b => b.id === biz.id);
  if (existingIdx >= 0) {
    db.businesses[existingIdx] = biz;
  } else {
    db.businesses.push(biz);
  }
  await persistLocalDb();
  return biz;
}

export async function updateBusiness(id: string, updates: Partial<BusinessProfile>): Promise<BusinessProfile | null> {
  const mongoose = await dbConnect();
  if (mongoose) {
    const updated = await BusinessModel.findOneAndUpdate({ id }, updates, { new: true }).lean();
    return updated ? (updated as unknown as BusinessProfile) : null;
  }

  const db = ensureDataFile();
  const idx = db.businesses.findIndex(b => b.id === id);
  if (idx === -1) return null;

  db.businesses[idx] = { ...db.businesses[idx], ...updates };
  await persistLocalDb();
  return db.businesses[idx];
}

// ---------------- CUSTOMERS METHODS (SCOPED BY BUSINESS) ----------------

export async function getCustomers(businessId: string): Promise<Customer[]> {
  const mongoose = await dbConnect();
  if (mongoose) {
    const docs = await CustomerModel.find({ businessId }).lean();
    return docs as unknown as Customer[];
  }

  const db = ensureDataFile();
  return db.customers.filter(c => c.businessId === businessId);
}

export async function saveCustomer(businessId: string, customer: Customer): Promise<Customer> {
  const toSave: Customer = { ...customer, businessId };
  const mongoose = await dbConnect();
  if (mongoose) {
    await CustomerModel.findOneAndUpdate({ id: toSave.id, businessId }, toSave, { upsert: true });
    return toSave;
  }

  const db = ensureDataFile();
  const idx = db.customers.findIndex(c => c.id === toSave.id && c.businessId === businessId);
  if (idx >= 0) {
    db.customers[idx] = toSave;
  } else {
    db.customers.push(toSave);
  }
  await persistLocalDb();
  return toSave;
}

export async function deleteCustomer(businessId: string, id: string): Promise<{ success: boolean; error?: string }> {
  // Check if customer has invoices
  const invoices = await getInvoices(businessId);
  const hasInvoices = invoices.some(inv => inv.customerId === id);
  if (hasInvoices) {
    return { success: false, error: 'Cannot delete customer because invoices are linked to this customer.' };
  }

  const mongoose = await dbConnect();
  if (mongoose) {
    await CustomerModel.deleteOne({ id, businessId });
    return { success: true };
  }

  const db = ensureDataFile();
  db.customers = db.customers.filter(c => !(c.id === id && c.businessId === businessId));
  await persistLocalDb();
  return { success: true };
}

// ---------------- PRODUCTS METHODS (SCOPED BY BUSINESS) ----------------

export async function getProducts(businessId: string): Promise<Product[]> {
  const mongoose = await dbConnect();
  if (mongoose) {
    const docs = await ProductModel.find({ businessId }).lean();
    return docs as unknown as Product[];
  }

  const db = ensureDataFile();
  return db.products.filter(p => p.businessId === businessId);
}

export async function saveProduct(businessId: string, product: Product): Promise<Product> {
  const toSave: Product = { ...product, businessId };
  const mongoose = await dbConnect();
  if (mongoose) {
    await ProductModel.findOneAndUpdate({ id: toSave.id, businessId }, toSave, { upsert: true });
    return toSave;
  }

  const db = ensureDataFile();
  const idx = db.products.findIndex(p => p.id === toSave.id && p.businessId === businessId);
  if (idx >= 0) {
    db.products[idx] = toSave;
  } else {
    db.products.push(toSave);
  }
  await persistLocalDb();
  return toSave;
}

export async function deleteProduct(businessId: string, id: string): Promise<boolean> {
  const mongoose = await dbConnect();
  if (mongoose) {
    await ProductModel.deleteOne({ id, businessId });
    return true;
  }

  const db = ensureDataFile();
  db.products = db.products.filter(p => !(p.id === id && p.businessId === businessId));
  await persistLocalDb();
  return true;
}

// ---------------- INVOICES METHODS (SCOPED BY BUSINESS) ----------------

export async function getInvoices(businessId: string): Promise<InvoiceData[]> {
  const mongoose = await dbConnect();
  if (mongoose) {
    const docs = await InvoiceModel.find({ businessId }).lean();
    return docs as unknown as InvoiceData[];
  }

  const db = ensureDataFile();
  return db.invoices.filter(i => i.businessId === businessId);
}

export async function getInvoiceById(businessId: string, id: string): Promise<InvoiceData | null> {
  const mongoose = await dbConnect();
  if (mongoose) {
    const doc = await InvoiceModel.findOne({ id, businessId }).lean();
    return doc ? (doc as unknown as InvoiceData) : null;
  }

  const db = ensureDataFile();
  return db.invoices.find(i => i.id === id && i.businessId === businessId) || null;
}

export async function saveInvoice(businessId: string, invoice: InvoiceData): Promise<InvoiceData> {
  const toSave: InvoiceData = { ...invoice, businessId };
  const mongoose = await dbConnect();
  if (mongoose) {
    await InvoiceModel.findOneAndUpdate({ id: toSave.id, businessId }, toSave, { upsert: true });
    return toSave;
  }

  const db = ensureDataFile();
  const idx = db.invoices.findIndex(i => i.id === toSave.id && i.businessId === businessId);
  if (idx >= 0) {
    db.invoices[idx] = toSave;
  } else {
    db.invoices.push(toSave);
  }
  await persistLocalDb();
  return toSave;
}

export async function deleteInvoice(businessId: string, id: string): Promise<boolean> {
  const mongoose = await dbConnect();
  if (mongoose) {
    await InvoiceModel.deleteOne({ id, businessId });
    return true;
  }

  const db = ensureDataFile();
  db.invoices = db.invoices.filter(i => !(i.id === id && i.businessId === businessId));
  await persistLocalDb();
  return true;
}

// ---------------- INVOICE SEQUENCE METHODS (SCOPED BY BUSINESS) ----------------

export async function getNextInvoiceSequence(businessId: string): Promise<number> {
  const biz = await getBusinessById(businessId);
  return biz?.invoiceSequence || 1;
}

export async function incrementInvoiceSequence(businessId: string): Promise<number> {
  const biz = await getBusinessById(businessId);
  const next = (biz?.invoiceSequence || 1) + 1;
  await updateBusiness(businessId, { invoiceSequence: next });
  return next;
}

export async function setInvoiceSequence(businessId: string, sequence: number): Promise<number> {
  await updateBusiness(businessId, { invoiceSequence: Math.max(1, sequence) });
  return Math.max(1, sequence);
}
