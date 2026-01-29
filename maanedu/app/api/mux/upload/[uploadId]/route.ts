import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

interface MuxUpload {
  id?: string;
  status?: string;
  asset_id?: string;
  timeout_at?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params;

    if (!uploadId) {
      return NextResponse.json({ success: false, error: 'Upload ID is required' }, { status: 400 });
    }

    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      return NextResponse.json({ success: false, error: 'Mux credentials not configured' }, { status: 500 });
    }

    const upload = (await mux.video.uploads.retrieve(uploadId)) as unknown as MuxUpload;

    return NextResponse.json({
      success: true,
      upload: {
        id: upload.id,
        status: upload.status,
        asset_id: upload.asset_id,
        timeout_at: upload.timeout_at,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve upload',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
