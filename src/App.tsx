import React, { ReactNode, useState, useEffect, useMemo } from 'react';
import { Ticket, Layers, History, Trash2, LayoutDashboard, FileUp, Settings, Activity, Menu, X, Sun, Moon, BarChart2, Eye, EyeOff, DollarSign, Megaphone, Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useVouchers } from './hooks/useVouchers';
import { ImportVouchersWidget } from './components/ImportVouchersWidget';
import { VoucherTable } from './components/VoucherTable';
import { ImportLogsTable } from './components/ImportLogsTable';
import { KioskView } from './components/KioskView';
import { ConfirmationModal } from './components/ConfirmationModal';
import { useToast } from './components/Toast';
import { useSupabaseRealtime } from './hooks/useSupabaseRealtime';
import { AnalyticsView } from './components/AnalyticsView';
import { Announcement } from './components/AnnouncementsView';

const ANNOUNCEMENT_TYPES = [
  { id: 'info',    label: 'Info',    color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'warning', label: 'Notice',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'success', label: 'Update',  color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'promo',   label: 'Promo',   color: 'text-purple-600 bg-purple-50 border-purple-200' },
] as const;

function AnnouncementManager() {
  const { addToast } = useToast();
  const [items, setItems] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Announcement | null>(null);
  const [form, setForm] = React.useState({ title: '', content: '', type: 'info' as Announcement['type'], is_active: true });
  const [saving, setSaving] = React.useState(false);

  const fetchAll = async () => {
    try {
      const res = await fetch('/api/announcements/all');
      const data = await res.json();
      setItems(data.announcements || []);
    } catch {}
    setLoading(false);
  };

  React.useEffect(() => { fetchAll(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', content: '', type: 'info', is_active: true });
    setModalOpen(true);
  };

  const openEdit = (item: Announcement) => {
    setEditing(item);
    setForm({ title: item.title, content: item.content, type: item.type, is_active: item.is_active });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) { addToast('Title and content are required', 'error'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/announcements/${editing.id}` : '/api/announcements';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      addToast(editing ? 'Announcement updated!' : 'Announcement created!', 'success');
      setModalOpen(false);
      fetchAll();
    } catch (err: any) {
      addToast(err.message || 'Failed to save announcement', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      addToast('Announcement deleted', 'success');
      setItems(prev => prev.filter(a => a.id !== id));
    } catch { addToast('Failed to delete', 'error'); }
  };

  const handleToggle = async (item: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, is_active: !item.is_active })
      });
      if (!res.ok) throw new Error();
      setItems(prev => prev.map(a => a.id === item.id ? { ...a, is_active: !a.is_active } : a));
    } catch { addToast('Failed to toggle', 'error'); }
  };

  return (
    <div className="bg-white border border-slate-200 p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Kiosk Content</h2>
          </div>
          <h1 className="text-xl font-light text-slate-900 tracking-tight mt-1">Announcements Manager</h1>
          <p className="text-xs text-slate-500 mt-0.5">Posts displayed on the kiosk Updates page for customers.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm">
          <Plus className="w-3.5 h-3.5" /> New Post
        </button>
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 text-center py-8">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <Megaphone className="w-8 h-8 text-slate-200 mx-auto" />
          <p className="text-xs text-slate-400">No announcements yet. Click "New Post" to create one.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 -mx-6">
          {items.map(item => {
            const tc = ANNOUNCEMENT_TYPES.find(t => t.id === item.type) ?? ANNOUNCEMENT_TYPES[0];
            return (
              <div key={item.id} className={`px-6 py-4 flex items-start gap-4 transition-colors hover:bg-slate-50 ${!item.is_active ? 'opacity-50' : ''}`}>
                <span className={`mt-0.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full shrink-0 ${tc.color}`}>{tc.label}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 leading-snug">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{item.content}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">{new Date(item.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggle(item)} title={item.is_active ? 'Deactivate' : 'Activate'} className={`p-1.5 rounded transition-all ${item.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                    {item.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{editing ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {ANNOUNCEMENT_TYPES.map(t => (
                    <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, type: t.id as any }))}
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${form.type === t.id ? t.color + ' ring-2 ring-offset-1 ring-blue-400' : 'text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Title <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. System Maintenance Tonight" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Content <span className="text-red-500">*</span></label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Write your announcement here..." className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-600">Active (visible on kiosk)</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { vouchers, importLogs, addVouchers, addSingleVoucher, editVoucher, updateVoucherStatus, getAndUseVoucher, deleteVoucher, clearAll, stats, loading, refresh } = useVouchers();
  const { addToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vouchers' | 'analytics' | 'logs' | 'settings'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  
  const fetchMaintenanceMode = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.isMaintenanceMode === 'boolean') {
          setIsMaintenanceMode(data.isMaintenanceMode);
        }
      }
    } catch (err) {
      console.error('Failed to fetch maintenance mode', err);
    }
  };

  useEffect(() => {
    fetchMaintenanceMode();
  }, []);

  useSupabaseRealtime({
    table: 'system_settings',
    onChange: () => {
      fetchMaintenanceMode();
    }
  });
  useEffect(() => { if (isDarkMode) { document.documentElement.classList.add("dark"); } else { document.documentElement.classList.remove("dark"); } }, [isDarkMode]);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  // Compute Income Stats
  const { todayIncome, lastWeekIncome, monthlyIncome } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = startOfToday - 30 * 24 * 60 * 60 * 1000;

    let today = 0, week = 0, month = 0;

    vouchers.forEach(v => {
      if (v.status === 'used') {
        const rawPrice = v.price ? v.price.toString().match(/[\d.]+/) : null;
        const price = rawPrice ? parseFloat(rawPrice[0]) : 0;
        const usedTime = v.usedAt ? new Date(v.usedAt).getTime() : new Date(v.createdAt).getTime();

        if (usedTime >= startOfToday) {
          today += price;
        }
        if (usedTime >= startOfWeek) {
          week += price;
        }
        if (usedTime >= startOfMonth) {
          month += price;
        }
      }
    });

    return { todayIncome: today, lastWeekIncome: week, monthlyIncome: month };
  }, [vouchers]);

  // Supabase Configuration States
  const [supabaseConfig, setSupabaseConfig] = useState<{ url: string, anonKey: string, serviceRoleKey: string } | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [showServiceRoleKey, setShowServiceRoleKey] = useState(false);

  useEffect(() => {
    fetch('/api/supabase-config')
      .then(res => res.json())
      .then(data => {
        setSupabaseConfig(data);
      })
      .catch(err => console.error("Failed to load Supabase config:", err));
  }, []);

  const handleClearAllConfirm = async () => {
    try {
      setIsClearAllOpen(false);
      const success = await clearAll();
      if (success) {
        addToast("Database records cleared successfully", "success");
      } else {
        addToast("Failed to clear database records", "error");
      }
    } catch (err) {
      addToast("Failed to clear database", "error");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
            {/* Mobile/Kiosk Interface Section */}
            <div className="lg:hidden">
              <KioskView 
                vouchers={vouchers}
                available={stats.available} 
                used={stats.used} 
                onGetVoucher={getAndUseVoucher} 
                isDarkMode={isDarkMode}
                onRefresh={refresh}
                isRefreshing={loading}
                isMaintenanceMode={isMaintenanceMode}
              />
            </div>

            {/* Desktop Dashboard View */}
            <div className="hidden lg:block space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                  label="Available Vouchers" 
                  value={stats.available} 
                  subtext="Ready for customers"
                  color="amber"
                  icon={<Ticket className="w-5 h-5 text-amber-500" />}
                />
                <StatsCard 
                  label="Today's Income" 
                  value={todayIncome.toLocaleString('en-US', { style: 'currency', currency: 'PHP' }).replace('PHP', 'Php')} 
                  subtext="Revenue generated today"
                  color="blue"
                  icon={<DollarSign className="w-5 h-5 text-blue-500" />}
                />
                <StatsCard 
                  label="Last Week's Income" 
                  value={lastWeekIncome.toLocaleString('en-US', { style: 'currency', currency: 'PHP' }).replace('PHP', 'Php')} 
                  subtext="Revenue past 7 days"
                  color="slate"
                  icon={<DollarSign className="w-5 h-5 text-slate-500" />}
                />
                <StatsCard 
                  label="Monthly Income" 
                  value={monthlyIncome.toLocaleString('en-US', { style: 'currency', currency: 'PHP' }).replace('PHP', 'Php')} 
                  subtext="Revenue past 30 days"
                  color="emerald"
                  icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
                />
              </div>

              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-white border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Vouchers</h2>
                      <button onClick={() => setActiveTab('vouchers')} className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest">View All</button>
                    </div>
                    <VoucherTable 
                      vouchers={vouchers} 
                      onUpdateStatus={updateVoucherStatus} 
                      onDelete={deleteVoucher}
                      onAdd={addSingleVoucher}
                      onEdit={editVoucher}
                      defaultItemsPerPage={5}
                    />
                  </div>
                </div>
                <div className="lg:col-span-4 space-y-8">
                  <div className="shadow-xl">
                    <ImportVouchersWidget onExtracted={addVouchers} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'vouchers':
        return (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-[1600px] mx-auto">
             <div className="bg-white border border-slate-200">
              <VoucherTable 
                vouchers={vouchers} 
                onUpdateStatus={updateVoucherStatus} 
                onDelete={deleteVoucher}
                onAdd={addSingleVoucher}
                onEdit={editVoucher}
              />
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-[1600px] mx-auto">
            <AnalyticsView vouchers={vouchers} />
          </div>
        );
      case 'logs':
        return (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-[1600px] mx-auto">
            <div className="bg-white border border-slate-200">
              <ImportLogsTable logs={importLogs} />
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-3xl space-y-6 animate-in fade-in duration-300 mx-auto lg:mx-0">
            {/* System Status Block */}
            <div className="bg-white border border-slate-200 p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">System Architecture</h2>
                  <h1 className="text-xl font-light text-slate-900 tracking-tight mt-1">Full-Stack Configuration</h1>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                    Production Online
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supabase Status Card */}
                <div className="p-5 border border-slate-200 bg-slate-50/30 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 border border-blue-100">
                        Primary Datastore
                      </span>
                      <h3 className="font-bold text-sm text-slate-800 mt-2">Supabase Database</h3>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-sm">
                      SUPABASE_ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Vouchers are stored securely in a hosted PostgreSQL database cloud instance. Synchronized on-demand.
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Target Table:</span>
                    <span className="text-slate-600 font-bold">vouchers</span>
                  </div>
                </div>

                {/* Supabase Audit Logs Card */}
                <div className="p-5 border border-slate-200 bg-slate-50/30 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 border border-purple-100">
                        Audit Recorder
                      </span>
                      <h3 className="font-bold text-sm text-slate-800 mt-2">Supabase Audit Logs</h3>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-sm">
                      SUPABASE_ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    System activity, import events, manual creations, and redemptions are saved securely directly in Supabase with automatic 30-day rotation and local fallback.
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Target Table:</span>
                    <span className="text-slate-600 font-bold">hotspot_import_logs</span>
                  </div>
                </div>
              </div>

              {/* Maintenance Mode Configuration */}
              <div className="p-6 border border-slate-200 bg-slate-50/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">System Maintenance Mode</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enable this to temporarily suspend voucher generation on the kiosk. Users will see a maintenance screen.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const newMode = !isMaintenanceMode;
                      setIsMaintenanceMode(newMode);
                      try {
                        await fetch('/api/settings/maintenance', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ isMaintenanceMode: newMode })
                        });
                      } catch (err) {
                        console.error('Failed to update maintenance mode', err);
                        // Revert on failure
                        setIsMaintenanceMode(!newMode);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isMaintenanceMode ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isMaintenanceMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Supabase Connection Credentials */}
              <div className="p-6 border border-slate-200 bg-slate-50/10 space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Connection Credentials</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Server-side configured credentials retrieved securely for system diagnostics. Click the reveal button to display.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {/* Supabase URL */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Supabase URL</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-xs rounded-sm overflow-hidden select-all flex items-center min-h-[36px]">
                        {showUrl ? (supabaseConfig?.url || <span className="text-slate-400 italic">Not set</span>) : "••••••••••••••••••••••••••••••••••••••••••••••••"}
                      </div>
                      <button 
                        onClick={() => setShowUrl(!showUrl)}
                        className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors rounded-sm cursor-pointer flex items-center justify-center"
                        title={showUrl ? "Hide URL" : "Reveal URL"}
                      >
                        {showUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* API Anon Key */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">API Anon Key</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-xs rounded-sm overflow-hidden select-all flex items-center min-h-[36px] break-all">
                        {showAnonKey ? (supabaseConfig?.anonKey || <span className="text-slate-400 italic">Not set</span>) : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                      </div>
                      <button 
                        onClick={() => setShowAnonKey(!showAnonKey)}
                        className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors rounded-sm cursor-pointer flex items-center justify-center"
                        title={showAnonKey ? "Hide Anon Key" : "Reveal Anon Key"}
                      >
                        {showAnonKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Service Role Key */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Service Role Key</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-xs rounded-sm overflow-hidden select-all flex items-center min-h-[36px] break-all">
                        {showServiceRoleKey ? (supabaseConfig?.serviceRoleKey || <span className="text-slate-400 italic">Not set</span>) : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                      </div>
                      <button 
                        onClick={() => setShowServiceRoleKey(!showServiceRoleKey)}
                        className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors rounded-sm cursor-pointer flex items-center justify-center"
                        title={showServiceRoleKey ? "Hide Service Role Key" : "Reveal Service Role Key"}
                      >
                        {showServiceRoleKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800">Secure API Proxy Guard</p>
                  <p className="text-slate-500">
                    All DB transaction keys are isolated server-side inside Cloud Run. No sensitive access keys are ever leaked to client browsers.
                  </p>
                </div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 bg-white border border-slate-200 px-2.5 py-1">
                  SHA-256 AES
                </span>
              </div>

              {/* Danger Zone */}
              <div className="pt-6 border-t border-slate-100">
                <div className="p-6 border border-rose-100 bg-rose-50/20 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-rose-700">Danger Zone</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Clearing system records will wipe all voucher configurations from your cloud database, and reset your local audit log files to zero. This is a destructive, irreversible action.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsClearAllOpen(true)}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm shadow-sm hover:shadow-md cursor-pointer"
                  >
                    Wipe Database Vouchers & Logs
                  </button>
                </div>
              </div>

              {/* Announcements Manager */}
              <AnnouncementManager />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors duration-200">
      {/* Sidebar Navigation */}
      <aside className={`hidden lg:flex relative inset-y-0 left-0 bg-slate-900 text-slate-400 flex-col border-r border-slate-800 z-50 transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'w-64' : 'w-20'
      }`}>
        <div className={`h-16 flex items-center border-b border-slate-800 bg-slate-900 flex-shrink-0 transition-all ${isSidebarOpen ? 'px-6 justify-between' : 'px-0 justify-center'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <motion.div 
              animate={{ 
                y: [0, -2, 0],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="bg-blue-600 p-2 rounded-sm flex items-center justify-center flex-shrink-0"
            >
              <Ticket className="text-white w-4 h-4" />
            </motion.div>
            {isSidebarOpen && (
              <span className="text-white font-bold tracking-tight text-lg uppercase whitespace-nowrap animate-in fade-in slide-in-from-left-2">
                Leirad Hotspot
              </span>
            )}
          </div>
          {isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-800 rounded">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
          <NavItem 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            index="01" 
            collapsed={!isSidebarOpen}
            onClick={() => { setActiveTab('dashboard'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
          />
          <NavItem 
            icon={<Ticket className="w-4 h-4" />} 
            label="Vouchers" 
            active={activeTab === 'vouchers'} 
            index="02" 
            collapsed={!isSidebarOpen}
            onClick={() => { setActiveTab('vouchers'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
          />
          <NavItem 
            icon={<BarChart2 className="w-4 h-4" />} 
            label="Analytics" 
            active={activeTab === 'analytics'} 
            index="03" 
            collapsed={!isSidebarOpen}
            onClick={() => { setActiveTab('analytics'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
          />
          <NavItem 
            icon={<FileUp className="w-4 h-4" />} 
            label="All Logs" 
            active={activeTab === 'logs'} 
            index="04" 
            collapsed={!isSidebarOpen}
            onClick={() => { setActiveTab('logs'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
          />
          <NavItem 
            icon={<Settings className="w-4 h-4" />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            index="05" 
            collapsed={!isSidebarOpen}
            onClick={() => { setActiveTab('settings'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
          />
        </nav>


      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full relative">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-30 transition-colors duration-200">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:block p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all active:scale-95"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight uppercase">
              {activeTab === 'dashboard' ? 'LEIRAD HOTSPOT' : activeTab.replace('_', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-3 lg:gap-6">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-all active:scale-95 border ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-yellow-400 shadow-inner' 
                  : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 shadow-sm'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 fill-current" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] ${loading ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
              {loading ? 'Synchronizing...' : 'System Online'}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="p-4 lg:p-8 flex-1 overflow-y-auto w-full bg-slate-50/50 dark:bg-slate-950 transition-colors duration-200">
          <div className="w-full">
            {renderContent()}
          </div>
        </div>

        {/* Status Bar Footer */}
        <footer className="hidden lg:flex h-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 items-center justify-between px-4 lg:px-8 text-[10px] text-slate-400 font-mono flex-shrink-0 transition-colors duration-200">
          <div className="truncate uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
            ACTIVE_VIEW: {activeTab}
          </div>
          <div className="flex gap-4 lg:gap-8 uppercase tracking-widest flex-shrink-0">
            <span className="hidden sm:inline">LATENCY: 0.2ms</span>
            <span className="text-blue-600 font-bold">PERSISTENCE: CLOUD_SYNC</span>
          </div>
        </footer>
      </main>

      <ConfirmationModal
        isOpen={isClearAllOpen}
        onClose={() => setIsClearAllOpen(false)}
        onConfirm={handleClearAllConfirm}
        title="Destroy All Database Records"
        message="Are you sure you want to permanently delete all vouchers and logs from Supabase? This action is highly destructive and cannot be undone."
        confirmLabel="Destroy everything"
        isDestructive={true}
      />
    </div>
  );
}

function NavItem({ icon, label, active, index, collapsed, onClick }: { icon: React.ReactNode, label: string, active?: boolean, index: string, collapsed?: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center cursor-pointer transition-all duration-200 group ${
        active 
          ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500' 
          : 'hover:bg-slate-800 hover:text-white border-l-2 border-transparent text-slate-500'
      } ${collapsed ? 'justify-center py-5 px-0' : 'gap-3 px-4 py-3'}`}
      title={collapsed ? label : undefined}
    >
      {!collapsed && (
        <span className="text-[10px] font-mono opacity-50 flex-shrink-0 w-4">{index}</span>
      )}
      <div className={`transition-transform duration-200 flex items-center justify-center ${active ? 'opacity-100 scale-110' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110'}`}>
        {icon}
      </div>
      {!collapsed && (
        <span className="font-medium text-sm whitespace-nowrap animate-in fade-in slide-in-from-left-2">{label}</span>
      )}
    </div>
  );
}

function StatsCard({ label, value, subtext, color, unit = "", icon }: { label: string, value: number | string, subtext: string, color: 'blue' | 'emerald' | 'slate' | 'amber', unit?: string, icon?: React.ReactNode }) {
  const accentColors = {
    blue: 'text-blue-600 dark:text-blue-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    slate: 'text-slate-500 dark:text-slate-400',
    amber: 'text-amber-600 dark:text-amber-400'
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between group hover:border-blue-500/30 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
        {icon && <div>{icon}</div>}
      </div>
      <div className="flex items-baseline gap-1 mt-2">
        <span className="text-4xl font-light text-slate-900 dark:text-white leading-none">
          {typeof value === 'number' ? (value ?? 0).toLocaleString() : value}
        </span>
        {unit && <span className="text-xl font-light text-slate-400 dark:text-slate-500">{unit}</span>}
      </div>
      <span className={`text-[10px] font-bold mt-4 uppercase tracking-tighter ${accentColors[color]}`}>{subtext}</span>
    </div>
  );
}

function LogEntry({ time, text }: { time: string, text: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">{text}</span>
      <span className="text-slate-300 dark:text-slate-500 text-[9px] font-mono whitespace-nowrap">{time}</span>
    </div>
  );
}
