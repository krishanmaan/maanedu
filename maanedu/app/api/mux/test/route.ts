import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

export async function GET(request: NextRequest) {
  try {
    // Check if environment variables are set
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;
    
    if (!tokenId || !tokenSecret) {
      return NextResponse.json({
        success: false,
        error: 'Mux credentials not configured',
        details: {
          tokenId: !!tokenId,
          tokenSecret: !!tokenSecret,
          envFile: process.env.NODE_ENV
        }
      }, { status: 500 });
    }

    // Try to initialize Mux client
    try {
      const mux = new Mux({
        tokenId: tokenId,
        tokenSecret: tokenSecret,
      });

      // Test API call - list assets (this should work even if no assets exist)
      const assets = await mux.video.assets.list({ limit: 1 });
      
      return NextResponse.json({
        success: true,
        message: 'Mux connection successful',
        details: {
          assetsCount: assets.data?.length || 0,
          tokenId: tokenId.substring(0, 8) + '...' // Show partial for security
        }
      });
      
    } catch (muxError) {
      console.error('Mux API Error:', muxError);
      return NextResponse.json({
        success: false,
        error: 'Mux API connection failed',
        details: {
          message: muxError instanceof Error ? muxError.message : 'Unknown Mux error'
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test endpoint failed',
      details: {
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}
