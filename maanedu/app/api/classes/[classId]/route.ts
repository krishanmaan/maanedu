import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { mux } from '@/lib/mux';

interface FirebaseUserRecord {
  supabaseUrl?: string;
  servicerole?: string;
  profile?: {
    supabaseUrl?: string;
    servicerole?: string;
  };
}

async function getUserAdminSupabase(userId: string) {
  // Fetch from Firebase Realtime DB: prefer profile.servicerole; fall back to servicerole at root
  const userRef = ref(database, `user/${userId}`);
  const snapshot = await get(userRef);
  if (!snapshot.exists()) {
    return { error: `User ${userId} not found in Firebase` } as const;
  }
  const value = snapshot.val() as FirebaseUserRecord;
  const supabaseUrl: string | undefined = value.supabaseUrl || value.profile?.supabaseUrl;
  const serviceRole: string | undefined = value.profile?.servicerole || value.servicerole;

  if (!supabaseUrl || !serviceRole) {
    return { error: 'Supabase URL or service role key missing for user' } as const;
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  return { supabase } as const;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  const { classId } = await context.params;
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!classId) {
    return NextResponse.json({ success: false, error: 'Missing classId' }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
  }

  try {
    const { supabase, error } = await getUserAdminSupabase(userId);
    if (error || !supabase) {
      return NextResponse.json({ success: false, error: error || 'Failed to create Supabase admin client' }, { status: 500 });
    }

    // Fetch class to get related Mux asset info
    const { data: classRows, error: fetchError } = await supabase
      .from('classes')
      .select('id, mux_asset_id, mux_playback_id')
      .eq('id', classId)
      .limit(1);

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    const classRow = classRows && classRows[0];

    // Attempt to delete the Mux asset if we have the asset id
    const muxDeletion: { attempted: boolean; success: boolean; error?: string } = { attempted: false, success: false };
    try {
      const assetId = classRow?.mux_asset_id as string | undefined;
      if (assetId) {
        muxDeletion.attempted = true;
        await mux.video.assets.delete(assetId);
        muxDeletion.success = true;
      }
    } catch (e) {
      muxDeletion.error = e instanceof Error ? e.message : 'Unknown Mux deletion error';
    }

    // Delete the class row
    const { data, error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)
      .select('id');

    if (deleteError) {
      return NextResponse.json({ success: false, error: deleteError.message, details: deleteError.details }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Class not found or no permission.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: data, mux: muxDeletion });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
