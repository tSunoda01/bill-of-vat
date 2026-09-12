import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '../../../lib/auth';
import { getCustomers, saveCustomer, deleteCustomer } from '../../../lib/storageAdapter';
import { Customer } from '../../../types';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const customers = await getCustomers(businessId);
    return NextResponse.json(customers);
  } catch (e: any) {
    console.error('[API Customers GET]', e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const customer: Customer = await req.json();

    if (!customer.id) {
      customer.id = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const saved = await saveCustomer(businessId, customer);
    return NextResponse.json({ success: true, customer: saved });
  } catch (e: any) {
    console.error('[API Customers POST]', e);
    return NextResponse.json({ error: e?.message || 'Failed to save customer' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing customer id' }, { status: 400 });
    }

    const result = await deleteCustomer(businessId, id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[API Customers DELETE]', e);
    return NextResponse.json({ error: e?.message || 'Failed to delete customer' }, { status: 500 });
  }
}
