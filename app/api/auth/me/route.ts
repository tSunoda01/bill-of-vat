import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '../../../../lib/auth';
import { getBusinessById, updateBusiness } from '../../../../lib/storageAdapter';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, business: null }, { status: 401 });
    }

    const business = await getBusinessById(session.businessId);
    if (!business) {
      return NextResponse.json({ authenticated: false, business: null }, { status: 404 });
    }

    const safeBusiness = { ...business };
    delete safeBusiness.passwordHash;

    return NextResponse.json({ authenticated: true, business: safeBusiness });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await req.json();
    delete updates.id;
    delete updates.passwordHash;
    delete updates.createdAt;

    const updated = await updateBusiness(session.businessId, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const safeBusiness = { ...updated };
    delete safeBusiness.passwordHash;

    return NextResponse.json({ success: true, business: safeBusiness });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
