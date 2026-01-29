import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserSupabaseConfig } from '../../../lib/dynamicSupabase';
import { ref, get } from 'firebase/database';
import { database } from '../../../lib/firebase';

export const runtime = 'nodejs';

async function getAdminClient(userId?: string) {
  try {
    // Prefer env service role if present
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (envUrl && envServiceKey) {
      return createClient(envUrl, envServiceKey, { auth: { persistSession: false } });
    }

    // Fallback: try Firebase for per-user service role
    if (userId && userId.trim().length > 0) {
      try {
        const userRef = ref(database, `user/${userId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const value: any = snapshot.val();
          const supabaseUrl: string | undefined = value.supabaseUrl || value.profile?.supabaseUrl || envUrl;
          const serviceRole: string | undefined = value.profile?.servicerole || value.servicerole || envServiceKey;
          if (supabaseUrl && serviceRole) {
            return createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
          }
        }
      } catch (_) {}

      // Last resort: use user anon key (may be limited by RLS)
      const cfg = await getUserSupabaseConfig(userId);
      return createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: false } });
    }

    return null;
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || undefined;
    const supabase = await getAdminClient(userId);
    if (!supabase) {
      return NextResponse.json({ error: 'Admin Supabase client not configured' }, { status: 500 });
    }

    // Total users and full users list
    const usersSelect = supabase.from('users').select(`
      id,
      email,
      name,
      avatar,
      phone,
      date_of_birth,
      gender,
      city,
      state,
      country,
      batch_year,
      enrollment_date,
      last_login,
      is_active,
      is_verified,
      profile_completed,
      created_at
    `);
    const [{ count: totalUsers, error: usersErr }, { data: usersList, error: usersListErr }] = await Promise.all([
      usersSelect.then(({ error }) => ({ count: undefined as number | undefined, error })) as any,
      supabase.from('users').select('*').order('created_at', { ascending: false })
    ]);
    if (usersErr) throw usersErr;
    if (usersListErr) throw usersListErr;

    // User -> Courses mapping from purchases with explicit joins
    const { data: purchases, error: purchasesErr } = await supabase
      .from('purchases')
      .select(`
        id,
        user_id,
        course_id,
        amount_paise,
        currency,
        payment_id,
        order_id,
        signature,
        status,
        created_at,
        users!inner ( id, email, name ),
        courses!inner ( id, title )
      `)
      .order('created_at', { ascending: false }) as unknown as { data: any, error: any };
    if (purchasesErr) throw purchasesErr;

    const userCourses = (purchases || []).map((p: any) => ({
      user_id: p.user_id ?? p.users?.id ?? null,
      user_email: p.users?.email ?? null,
      user_name: p.users?.name ?? null,
      course_id: p.course_id ?? p.courses?.id ?? null,
      course_title: p.courses?.title ?? null,
      purchased_at: p.created_at ?? null,
    }));

    return NextResponse.json({ totalUsers: usersList?.length ?? 0, users: usersList ?? [], userCourses, purchases: purchases ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || undefined;
    const supabase = await getAdminClient(userId);
    if (!supabase) {
      return NextResponse.json({ error: 'Admin Supabase client not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { user_id, course_id, amount_paise = 99900, currency = 'INR', payment_id, order_id, status = 'success' } = body || {};

    if (!user_id || !course_id) {
      return NextResponse.json({ error: 'user_id and course_id are required' }, { status: 400 });
    }

    const insert = {
      user_id,
      course_id,
      amount_paise,
      currency,
      payment_id: payment_id || `pay_${Math.random().toString(36).slice(2, 10)}`,
      order_id: order_id || null,
      signature: null,
      status,
    } as const;

    const { data, error } = await supabase.from('purchases').insert(insert).select('*').single();
    if (error) throw error;
    return NextResponse.json({ purchase: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}


