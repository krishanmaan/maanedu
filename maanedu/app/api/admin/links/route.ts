import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserSupabaseConfig } from '../../../lib/dynamicSupabase';

export const runtime = 'nodejs';

async function getAdminClient(userId?: string) {
  try {
    if (userId && userId.trim().length > 0) {
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

export async function GET(request: NextRequest) {
  try {
    const raw = request.headers.get('x-user-id') || '';
    const userId = raw && raw.trim().length > 0 ? raw : undefined;
    const supabase = await getAdminClient(userId);
    if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = request.headers.get('x-user-id') || '';
    const userId = raw && raw.trim().length > 0 ? raw : undefined;
    const supabase = await getAdminClient(userId);
    if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    const body = await request.json();
    const { error } = await supabase.from('links').insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message || 'Unexpected error' }, { status: 500 });
  }
}


