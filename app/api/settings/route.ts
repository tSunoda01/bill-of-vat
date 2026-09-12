import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '../../../lib/auth';
import { getBusinessById, getNextInvoiceSequence, incrementInvoiceSequence } from '../../../lib/storageAdapter';
import { generateGazetteInvoiceNo } from '../../../lib/gazetteUtils';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const business = await getBusinessById(businessId);
    
    const branchCode = business?.branchCode || 'BR01';
    const sequence = await getNextInvoiceSequence(businessId);
    const nextInvoiceNo = generateGazetteInvoiceNo(new Date(), branchCode, sequence);

    return NextResponse.json({
      nextInvoiceNo,
      sequence,
      vatRate: business?.vatRate ?? 0.18,
      isVatRegistered: business?.isVatRegistered ?? true,
      branchCode
    });
  } catch (e: any) {
    console.error('[API Settings GET]', e);
    return NextResponse.json({ nextInvoiceNo: '26SEP_BR01_00001', sequence: 1 }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const nextSeq = await incrementInvoiceSequence(businessId);
    return NextResponse.json({ success: true, nextSequence: nextSeq });
  } catch (e: any) {
    console.error('[API Settings POST]', e);
    return NextResponse.json({ error: e?.message || 'Failed to increment sequence' }, { status: 500 });
  }
}
