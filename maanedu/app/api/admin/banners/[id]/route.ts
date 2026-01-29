import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserSupabaseConfig } from '../../../../lib/dynamicSupabase';

async function getAdminClient(userId?: string) {
  try {
    if (userId) {
      const cfg = await getUserSupabaseConfig(userId);
      return createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: false } });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return null;
    return createClient(url, serviceKey, { auth: { persistSession: false } });
  } catch (e) {
    return null;
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const userId = request.headers.get('x-user-id') || undefined;
  const supabase = await getAdminClient(userId);
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  const body = await request.json();
  const { error } = await supabase.from('banners').update(body).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const userId = request.headers.get('x-user-id') || undefined;
  const supabase = await getAdminClient(userId);
  if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


