import { NextResponse } from 'next/server';
import { getBusinessByEmail } from '../../../../lib/storageAdapter';
import { verifyPassword, createSessionToken } from '../../../../lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.ownerEmail || body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const business = await getBusinessByEmail(email);
    if (!business || !business.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, business.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const token = createSessionToken(business.id, business.ownerEmail, business.businessName);

    const safeBusiness = { ...business };
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
      maxAge: 30 * 24 * 60 * 60,
      path: '/'
    });

    return res;
  } catch (error: any) {
    console.error('[API Login Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Login failed due to server error.' },
      { status: 500 }
    );
  }
}
