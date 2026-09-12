import { NextResponse } from 'next/server';
import { getAuthFromRequest } from '../../../lib/auth';
import { getProducts, saveProduct, deleteProduct } from '../../../lib/storageAdapter';
import { Product } from '../../../types';

export async function GET(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const products = await getProducts(businessId);
    return NextResponse.json(products);
  } catch (e: any) {
    console.error('[API Products GET]', e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const product: Product = await req.json();

    if (!product.id) {
      product.id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const saved = await saveProduct(businessId, product);
    return NextResponse.json({ success: true, product: saved });
  } catch (e: any) {
    console.error('[API Products POST]', e);
    return NextResponse.json({ error: e?.message || 'Failed to save product' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = getAuthFromRequest(req);
    const businessId = session?.businessId || 'demo-pyxis';
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
    }

    await deleteProduct(businessId, id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[API Products DELETE]', e);
    return NextResponse.json({ error: e?.message || 'Failed to delete product' }, { status: 500 });
  }
}
