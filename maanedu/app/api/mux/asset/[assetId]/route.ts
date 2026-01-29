import { NextRequest, NextResponse } from 'next/server';
import { getMuxAsset } from '@/lib/mux';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    
    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // Check environment variables
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

    console.log('Retrieving Mux asset:', assetId);
    
    const asset = await getMuxAsset(assetId);
    
    console.log('Retrieved asset:', { id: asset.id, status: asset.status });
    
    return NextResponse.json({
      success: true,
      asset,
    });
  } catch (error) {
    console.error('Error retrieving Mux asset:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve asset',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
