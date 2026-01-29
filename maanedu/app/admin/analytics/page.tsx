"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useAuth, useSupabase } from "../../contexts/AuthContext";

type UserCourseRow = {
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  course_id: string | null;
  course_title: string | null;
  purchased_at: string | null;
};

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  avatar?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  batch_year?: number | null;
  enrollment_date?: string | null;
  last_login?: string | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  profile_completed?: boolean | null;
  created_at?: string | null;
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { currentUserId, isAuthenticated, isLoading, logout } = useAuth();
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [rows, setRows] = useState<UserCourseRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("analytics");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !currentUserId) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/analytics", {
          headers: {
            "x-user-id": currentUserId,
          },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Request failed (${res.status})`);
        }
        const data = (await res.json()) as { totalUsers: number; users: UserRow[]; userCourses: UserCourseRow[]; purchases: any[] };
        setTotalUsers(data.totalUsers || (data.users?.length ?? 0));
        setRows(Array.isArray(data.userCourses) ? data.userCourses : []);
        setUsers(Array.isArray(data.users) ? data.users : []);
        setPurchases(Array.isArray(data.purchases) ? data.purchases : []);
      } catch (e: any) {
        setError(e?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isLoading, currentUserId, supabase]);

  const usersWithCourses = useMemo(() => {
    const map = new Map<string, { email: string | null; name: string | null; courses: { id: string | null; title: string | null; purchased_at: string | null }[] }>();
    for (const r of rows) {
      const key = r.user_id || r.user_email || "unknown";
      if (!map.has(key)) {
        map.set(key, { email: r.user_email, name: r.user_name, courses: [] });
      }
      map.get(key)!.courses.push({ id: r.course_id, title: r.course_title, purchased_at: r.purchased_at });
    }
    return Array.from(map.entries()).map(([userKey, v]) => ({ userKey, ...v }));
  }, [rows]);

  const content = (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of registered users and course purchases</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {(isLoading || loading) ? (
        <div className="min-h-[200px] bg-white shadow rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-white shadow p-4">
              <div className="text-sm text-gray-500">Total Registered Users</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{totalUsers}</div>
            </div>
            <div className="rounded-lg bg-white shadow p-4">
              <div className="text-sm text-gray-500">Users with Purchases</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{usersWithCourses.length}</div>
            </div>
            <div className="rounded-lg bg-white shadow p-4">
              <div className="text-sm text-gray-500">Total Purchases</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{rows.length}</div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">User → Courses</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courses</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usersWithCourses.map((u) => (
                    <tr key={u.userKey}>
                      <td className="px-4 py-3 align-top">
                        <div className="text-sm font-medium text-gray-900">{u.name || u.email || u.userKey}</div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-2">
                          {u.courses.map((c, idx) => (
                            <li key={idx} className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-gray-900">{c.title || c.id || 'Unknown course'}</div>
                                {c.purchased_at && (
                                  <div className="text-xs text-gray-500">{new Date(c.purchased_at).toLocaleString()}</div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                  {usersWithCourses.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-gray-500" colSpan={2}>No purchases found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Purchases (Full Details)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 text-sm text-gray-700">{p.payment_id || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{p.users?.name || p.users?.email || p.user_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{p.courses?.title || p.course_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{p.currency || 'INR'} {((p.amount_paise || 0) / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                  {purchases.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-gray-500" colSpan={6}>No purchases found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Purchases by Day (Last 14 days)</h2>
            </div>
            <div className="p-4">
              <PurchasesBarChart purchases={purchases} />
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Users (Full Details)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{u.name || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{u.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{u.phone || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{u.city || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{u.state || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{u.country || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{u.batch_year ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{u.enrollment_date ? new Date(u.enrollment_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-gray-500" colSpan={10}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={(s: string) => { setActiveSection(s); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="md:ml-64">
        <Header onLogout={handleLogout} onToggleSidebar={() => setSidebarOpen(true)} />
        <div className="p-4 sm:p-6 mx-auto">
          {content}
        </div>
      </div>
    </div>
  );
}


function PurchasesBarChart({ purchases }: { purchases: any[] }) {
  const days = 14;
  const today = new Date();
  const series: { label: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = purchases.filter((p) => (p.created_at ? p.created_at.slice(0, 10) === key : false)).length;
    series.push({ label: key.slice(5), count });
  }

  const max = Math.max(1, ...series.map((s) => s.count));

  return (
    <div className="w-full">
      <div className="flex items-end gap-2 h-40">
        {series.map((s, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-blue-500 rounded-t"
              style={{ height: `${(s.count / max) * 100}%` }}
              title={`${s.label}: ${s.count}`}
            />
            <div className="mt-1 text-[10px] text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


