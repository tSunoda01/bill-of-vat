import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '../../../lib/auth';
import { getNextInvoiceSequence, setInvoiceSequence } from '../../../lib/storageAdapter';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const val = await getNextInvoiceSequence(businessId);
    return NextResponse.json({ value: val });
  } catch (e: any) {
    return NextResponse.json({ value: 1 }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const body = await req.json();
    const val = parseInt(body.value, 10) || 1;
    await setInvoiceSequence(businessId, val);
    return NextResponse.json({ success: true, value: val });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update sequence' }, { status: 500 });
  }
}
