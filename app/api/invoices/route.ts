import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '../../../lib/auth';
import { getInvoices, saveInvoice, deleteInvoice } from '../../../lib/storageAdapter';
import { InvoiceData } from '../../../types';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const invoices = await getInvoices(businessId);
    return NextResponse.json(invoices);
  } catch (e: any) {
    console.error('[API Invoices GET]', e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const invoice: InvoiceData = await req.json();

    if (!invoice.id) {
      invoice.id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const saved = await saveInvoice(businessId, invoice);
    return NextResponse.json({ success: true, invoice: saved });
  } catch (e: any) {
    console.error('[API Invoices POST]', e);
    return NextResponse.json({ error: e?.message || 'Failed to save invoice' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
    }

    await deleteInvoice(businessId, id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[API Invoices DELETE]', e);
    return NextResponse.json({ error: e?.message || 'Failed to delete invoice' }, { status: 500 });
  }
}
