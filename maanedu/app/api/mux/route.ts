import { NextRequest, NextResponse } from 'next/server';
import { createLiveStream } from '@/lib/mux';

export async function POST(_req: NextRequest) {
  try {
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      return NextResponse.json({ success: false, error: 'Mux not configured' }, { status: 500 });
    }
    const live = await createLiveStream();
    return NextResponse.json({ success: true, live });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}


