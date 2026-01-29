'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

interface LinkRow {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  thumbnail_url?: string | null;
  category?: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  sort_order: number;
}

export default function AdminLinksPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState('links');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LinkRow | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    url: '',
    thumbnail_url: '',
    category: '',
    is_active: true,
    sort_order: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLinks();
    }
  }, [isAuthenticated]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/links', { cache: 'no-store', headers: { 'x-user-id': localStorage.getItem('currentUserId') || '' } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch links');
      setLinks(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch links');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', url: '', thumbnail_url: '', category: '', is_active: true, sort_order: 0 });
    setEditing(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const res = await fetch(`/api/admin/links/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-id': localStorage.getItem('currentUserId') || '' },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to update link');
      } else {
        const res = await fetch('/api/admin/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': localStorage.getItem('currentUserId') || '' },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to create link');
      }
      await fetchLinks();
      resetForm();
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save link');
    }
  };

  const handleEdit = (row: LinkRow) => {
    setEditing(row);
    setForm({
      title: row.title,
      description: row.description || '',
      url: row.url,
      thumbnail_url: row.thumbnail_url || '',
      category: row.category || '',
      is_active: row.is_active,
      sort_order: row.sort_order,
    });
    setImagePreview(row.thumbnail_url || null);
    setImageFile(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this link?')) return;
    try {
      const res = await fetch(`/api/admin/links/${id}`, { method: 'DELETE', cache: 'no-store', headers: { 'x-user-id': localStorage.getItem('currentUserId') || '' } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      await fetchLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete link');
    }
  };

  const toggleActive = async (row: LinkRow) => {
    try {
      const res = await fetch(`/api/admin/links/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': localStorage.getItem('currentUserId') || '' },
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update status');
      await fetchLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image size should be less than 5MB'); return; }
    if (!file.type.startsWith('image/')) { setError('Please select a valid image file'); return; }
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setForm((prev) => ({ ...prev, thumbnail_url: result }));
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={(s) => { setActiveSection(s); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="md:ml-64">
        <Header onLogout={handleLogout} onToggleSidebar={() => setSidebarOpen(true)} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Links Management</h1>
              <p className="text-gray-600 text-sm">Manage external links and resources</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add New Link
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preview</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {links.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-12 w-20 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                          {row.thumbnail_url ? (
                            <img src={row.thumbnail_url} alt={row.title} className="h-full w-full object-cover" />
                          ) : (
                            <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 11-5.656-5.656l1-1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 010-5.656l2-2a4 4 0 115.656 5.656l-1 1" /></svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{row.title}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{row.url}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.category || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.sort_order}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => toggleActive(row)} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {row.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-900">Edit</button>
                        <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {links.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 11-5.656-5.656l1-1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 010-5.656l2-2a4 4 0 115.656 5.656l-1 1" /></svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No links</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new link.</p>
              <div className="mt-6">
                <button onClick={() => { resetForm(); setShowModal(true); }} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  Add New Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-gray-100 overflow-y-auto">
          <Sidebar
            activeSection={activeSection}
            setActiveSection={(s) => { setActiveSection(s); setSidebarOpen(false); }}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          {sidebarOpen && (<div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />)}
          <div className="md:ml-64 min-h-screen">
            <Header onLogout={handleLogout} onToggleSidebar={() => setSidebarOpen(true)} />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{editing ? 'Edit Link' : 'Add New Link'}</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Close</button>
              </div>
              <form onSubmit={submitForm} className="space-y-4 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                {/* Thumbnail: Combined preview + chooser + URL in one card */}
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Thumbnail</label>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="h-28 w-full md:w-44 rounded-md overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                      {imagePreview || form.thumbnail_url ? (
                        <img src={imagePreview || form.thumbnail_url} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 11-5.656-5.656l1-1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 010-5.656l2-2a4 4 0 115.656 5.656l-1 1" /></svg>
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Thumbnail URL</label>
                        <input
                          type="url"
                          value={form.thumbnail_url}
                          onChange={(e) => { setForm({ ...form, thumbnail_url: e.target.value }); setImagePreview(e.target.value || null); setImageFile(null); }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Or Upload Image</label>
                        <label className="cursor-pointer border-2 border-dashed rounded-lg h-10 flex items-center justify-center text-gray-600 hover:bg-white bg-white">
                          <span className="text-sm">Choose file</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                        </label>
                        {imageFile && (
                          <div className="text-xs text-gray-500 mt-1 truncate">{imageFile.name}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                  <input type="url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {/* Removed duplicate thumbnail URL field (now included above) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                    <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input id="is_active" type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <label htmlFor="is_active" className="text-sm text-gray-900">Active</label>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{editing ? 'Update Link' : 'Create Link'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


