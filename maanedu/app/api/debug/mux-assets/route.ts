import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return { error: 'Supabase environment variables are missing (SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).' } as const;
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  return { supabase } as const;
}

export async function GET() {
  try {
    const { supabase, error } = getSupabase();
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    console.log('🔍 Fetching Mux assets from database...');

    // Get all classes with Mux videos
    const { data: classes, error: dbError } = await supabase
      .from('classes')
      .select('id, title, video_url, mux_asset_id, mux_playback_id, created_at')
      .or('video_url.like.mux://%,mux_asset_id.not.is.null')
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        success: false,
        error: `Database error: ${dbError.message}`,
      }, { status: 500 });
    }

    console.log(`Found ${classes?.length || 0} Mux assets`);

    return NextResponse.json({
      success: true,
      assets: classes || [],
      count: classes?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching Mux assets:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, error } = getSupabase();
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    const { action, classId, playbackId } = await request.json();

    if (action === 'fix_playback_id' && classId && playbackId) {
      console.log(`🔧 Fixing playback ID for class ${classId}: ${playbackId}`);

      const { data, error: updateError } = await supabase
        .from('classes')
        .update({
          mux_playback_id: playbackId,
          video_url: `mux://${playbackId}`,
        })
        .eq('id', classId)
        .select();

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({
          success: false,
          error: `Update failed: ${updateError.message}`,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Updated class ${classId} with playback ID ${playbackId}`,
        updated: data,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing parameters',
    }, { status: 400 });
  } catch (error) {
    console.error('Error updating Mux asset:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
