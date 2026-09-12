import { NextResponse } from 'next/server';
import { getBusinessByEmail, createBusiness } from '../../../../lib/storageAdapter';
import { hashPassword, createSessionToken } from '../../../../lib/auth';
import { BusinessProfile } from '../../../../types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      businessName,
      tin,
      brNumber,
      address,
      phone,
      slogan,
      ownerName,
      ownerEmail,
      password,
      branchCode,
      isVatRegistered,
      vatRate
    } = body;

    if (!businessName || !ownerEmail || !password || !ownerName) {
      return NextResponse.json(
        { error: 'Business Name, Owner Name, Email, and Password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = ownerEmail.trim().toLowerCase();
    const existing = await getBusinessByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in.' },
        { status: 409 }
      );
    }

    const businessId = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const passwordHash = hashPassword(password);

    const newBusiness: BusinessProfile = {
      id: businessId,
      businessName: businessName.trim(),
      tin: (tin || '').trim(),
      brNumber: (brNumber || '').trim(),
      address: (address || '').trim(),
      phone: (phone || '').trim(),
      slogan: (slogan || '').trim() || 'COMMITTED TO EXCELLENCE',
      ownerName: ownerName.trim(),
      ownerEmail: cleanEmail,
      passwordHash,
      branchCode: (branchCode || 'BR01').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'BR01',
      isVatRegistered: typeof isVatRegistered === 'boolean' ? isVatRegistered : true,
      vatRate: typeof vatRate === 'number' ? Math.max(0, vatRate) : 0.18,
      invoiceSequence: 1,
      createdAt: new Date().toISOString()
    };

    await createBusiness(newBusiness);

    const token = createSessionToken(newBusiness.id, newBusiness.ownerEmail, newBusiness.businessName);

    const safeBusiness = { ...newBusiness };
    delete safeBusiness.passwordHash;

    const res = NextResponse.json({
      success: true,
      business: safeBusiness,
      token
    });

    res.cookies.set('pyxis_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    return res;
  } catch (error: any) {
    console.error('[API Register Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Registration failed due to server error.' },
      { status: 500 }
    );
  }
}
