import { Customer, InvoiceData, Product, Payment, BusinessProfile } from "../types";

// Helper for safe fetching
async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (e: any) {
    console.error(`Fetch error for ${url}:`, e?.message || e);
    throw e;
  }
}

async function fetchArray<T>(url: string): Promise<T[]> {
  try {
    const data = await fetchJson<T[]>(url);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

// ---------------- AUTH SERVICES ----------------

export const login = async (email: string, password: string): Promise<{ success: boolean; business: BusinessProfile; token?: string }> => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  return data;
};

export const register = async (businessData: Partial<BusinessProfile> & { password: string }): Promise<{ success: boolean; business: BusinessProfile; token?: string }> => {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(businessData)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  return data;
};

export const logout = async (): Promise<void> => {
  await fetch('/api/auth/logout', { method: 'POST' });
};

export const getMe = async (): Promise<{ authenticated: boolean; business: BusinessProfile | null }> => {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!res.ok) return { authenticated: false, business: null };
    return await res.json();
  } catch (e) {
    return { authenticated: false, business: null };
  }
};

export const updateBusinessProfile = async (updates: Partial<BusinessProfile>): Promise<BusinessProfile> => {
  const res = await fetch('/api/auth/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update business profile');
  }
  return data.business;
};

// ---------------- CUSTOMERS ----------------

export const getCustomers = async (): Promise<Customer[]> => {
  return fetchArray<Customer>('/api/customers');
};

export const saveCustomer = async (customer: Customer): Promise<Customer> => {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save customer');
  return data.customer;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  const res = await fetch('/api/customers', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Delete failed');
  }
};

// ---------------- PRODUCTS ----------------

export const getProducts = async (): Promise<Product[]> => {
  return fetchArray<Product>('/api/products');
};

export const saveProduct = async (product: Product): Promise<Product> => {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save product');
  return data.product;
};

export const deleteProduct = async (id: string): Promise<void> => {
  const res = await fetch('/api/products', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Delete failed');
  }
};

// ---------------- INVOICES ----------------

export const getInvoices = async (): Promise<InvoiceData[]> => {
  return fetchArray<InvoiceData>('/api/invoices');
};

export const saveInvoice = async (invoice: InvoiceData): Promise<InvoiceData> => {
  const res = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save invoice');
  return data.invoice;
};

export const deleteInvoice = async (id: string): Promise<void> => {
  const res = await fetch('/api/invoices', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Delete failed');
  }
};

// ---------------- SETTINGS & AUTO INCREMENT ----------------

export const getNextInvoiceNumber = async (): Promise<string> => {
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (!res.ok) return "26SEP_BR01_00001";
    const data = await res.json();
    return data.nextInvoiceNo || "26SEP_BR01_00001";
  } catch (e) {
    return "26SEP_BR01_00001";
  }
};

export const getSettingsInfo = async (): Promise<{ nextInvoiceNo: string; sequence: number; vatRate: number; isVatRegistered: boolean; branchCode: string }> => {
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (!res.ok) return { nextInvoiceNo: "26SEP_BR01_00001", sequence: 1, vatRate: 0.18, isVatRegistered: true, branchCode: "BR01" };
    return await res.json();
  } catch (e) {
    return { nextInvoiceNo: "26SEP_BR01_00001", sequence: 1, vatRate: 0.18, isVatRegistered: true, branchCode: "BR01" };
  }
};

export const incrementInvoiceNumber = async (): Promise<void> => {
  await fetch('/api/settings', { method: 'POST' });
};

export const getInvoiceSequence = async (): Promise<number> => {
  try {
    const res = await fetch('/api/settings_admin', { cache: 'no-store' });
    if (!res.ok) return 1;
    const data = await res.json();
    return data.value || 1;
  } catch (e) {
    return 1;
  }
};

export const setInvoiceSequence = async (value: number): Promise<void> => {
  await fetch('/api/settings_admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  });
};

// ---------------- PAYMENTS ----------------

export const addPayment = async (invoiceId: string, payment: Payment): Promise<void> => {
  const invoices = await getInvoices();
  const invoice = invoices.find(i => i.id === invoiceId);

  if (invoice) {
    if (!invoice.payments) invoice.payments = [];
    invoice.payments.push(payment);

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    invoice.balanceDue = Math.max(0, Number((invoice.grandTotal - totalPaid).toFixed(2)));

    if (invoice.balanceDue <= 0.05) {
      invoice.status = 'paid';
      invoice.balanceDue = 0;
    } else if (totalPaid > 0) {
      invoice.status = 'partial';
    } else {
      invoice.status = 'unpaid';
    }

    await saveInvoice(invoice);
  }
};
