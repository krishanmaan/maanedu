import { NextRequest, NextResponse } from 'next/server';
import { createDirectUpload } from '@/lib/mux';

export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      console.error('Mux credentials missing from environment');
      return NextResponse.json(
        {
          success: false,
          error: 'Mux credentials not configured. Please check your .env.local file.',
        },
        { status: 500 }
      );
    }

    console.log('Creating Mux direct upload...');
    
    // Create a direct upload URL
    const upload = await createDirectUpload();
    
    console.log('Mux upload created:', { id: upload.id, url: upload.url.substring(0, 50) + '...' });
    
    return NextResponse.json({
      success: true,
      upload_id: upload.id,
      upload_url: upload.url,
    });
  } catch (error) {
    console.error('Error creating Mux upload:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create upload URL',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
