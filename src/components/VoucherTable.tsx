import { Voucher, VoucherStatus } from "../types";
import { 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  Database,
  ShieldCheck,
  SlidersHorizontal,
  Eraser,
  X,
  Plus,
  Pencil,
  Save,
  AlertCircle
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import { useToast } from "./Toast";
import { motion, AnimatePresence } from "motion/react";

const DURATIONS = ['1H', '3H', '1D', '2D', '30D'];
const PRICES: Record<string, string> = { '1H': 'Php 5.00', '3H': 'Php 10.00', '1D': 'Php 20.00', '2D': 'Php 35.00', '30D': 'Php 200.00' };

interface VoucherFormData {
  code: string;
  duration: string;
  price: string;
  status: VoucherStatus;
}

interface Props {
  vouchers: Voucher[];
  onUpdateStatus: (id: string, status: VoucherStatus) => any;
  onDelete: (id: string) => any;
  onAdd?: (code: string, duration: string, price: string) => Promise<boolean>;
  onEdit?: (id: string, code: string, duration: string, price: string, status: VoucherStatus) => Promise<boolean>;
  defaultItemsPerPage?: number;
}

function VoucherFormModal({
  isOpen,
  mode,
  initial,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initial?: VoucherFormData;
  onClose: () => void;
  onSubmit: (data: VoucherFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<VoucherFormData>(
    initial ?? { code: '', duration: '1H', price: 'Php 5.00', status: 'available' }
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when opened
  React.useEffect(() => {
    if (isOpen) {
      setForm(initial ?? { code: '', duration: '1H', price: 'Php 5.00', status: 'available' });
      setError(null);
    }
  }, [isOpen, initial?.code]);

  const handleDurationChange = (dur: string) => {
    setForm(f => ({ ...f, duration: dur, price: PRICES[dur] ?? f.price }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) { setError('Voucher code is required.'); return; }
    if (!form.duration) { setError('Duration is required.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 16 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === 'add' ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-amber-100 dark:bg-amber-500/20'}`}>
                  {mode === 'add'
                    ? <Plus className={`w-4 h-4 ${mode === 'add' ? 'text-blue-600' : 'text-amber-600'}`} />
                    : <Pencil className="w-4 h-4 text-amber-600" />
                  }
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {mode === 'add' ? 'Add New Voucher' : 'Edit Voucher'}
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {mode === 'add' ? 'Create a new entry in the database' : 'Modify existing voucher record'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* Code field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Voucher Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. ABC123XYZ"
                  className="w-full px-4 py-2.5 text-sm font-mono border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Duration field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Duration <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {DURATIONS.map(dur => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => handleDurationChange(dur)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        form.duration.toUpperCase() === dur
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Price
                </label>
                <input
                  type="text"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. Php 20.00"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-900 dark:text-white"
                />
              </div>

              {/* Status field — only for edit mode */}
              {mode === 'edit' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['available', 'used'] as VoucherStatus[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                          form.status === s
                            ? s === 'available'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-600 text-white border-slate-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                    mode === 'add'
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-200'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-200'
                  }`}
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {submitting ? 'Saving...' : mode === 'add' ? 'Add Voucher' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function VoucherTable({ vouchers, onUpdateStatus, onDelete, onAdd, onEdit, defaultItemsPerPage = 10 }: Props) {
  const { addToast } = useToast();
  const [targetToDelete, setTargetToDelete] = useState<{ id: string; code: string } | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Voucher | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | 'all'>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

  const handleUpdateStatus = async (id: string, status: VoucherStatus, code: string) => {
    try {
      await onUpdateStatus(id, status);
      addToast(`Voucher "${code}" marked as ${status.toUpperCase()}`, "success");
    } catch (err) {
      addToast(`Failed to update status for voucher "${code}"`, "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!targetToDelete) return;
    try {
      const res = await onDelete(targetToDelete.id);
      if (res !== false) {
        addToast(`Voucher "${targetToDelete.code}" permanently deleted`, "success");
      } else {
        addToast(`Failed to delete voucher "${targetToDelete.code}"`, "error");
      }
    } catch (err) {
      addToast(`Error occurred during deletion`, "error");
    } finally {
      setTargetToDelete(null);
    }
  };

  const openAdd = () => { setEditTarget(null); setModalMode('add'); };
  const openEdit = (v: Voucher) => { setEditTarget(v); setModalMode('edit'); };
  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const handleFormSubmit = async (data: VoucherFormData) => {
    if (modalMode === 'add' && onAdd) {
      const ok = await onAdd(data.code, data.duration, data.price);
      if (ok) closeModal();
    } else if (modalMode === 'edit' && onEdit && editTarget) {
      const ok = await onEdit(editTarget.id, data.code, data.duration, data.price, data.status);
      if (ok) closeModal();
    }
  };

  const filtered = useMemo(() => {
    return vouchers.filter(v => {
      const matchesSearch = v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.duration.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.price.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchesDuration = durationFilter === 'all' || v.duration.toUpperCase().includes(durationFilter.toUpperCase());
      return matchesSearch && matchesStatus && matchesDuration;
    });
  }, [vouchers, searchTerm, statusFilter, durationFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * itemsPerPage;
    return filtered.slice(startIdx, startIdx + itemsPerPage);
  }, [filtered, safeCurrentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as any);
    setCurrentPage(1);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDurationFilter(e.target.value);
    setCurrentPage(1);
  };

  const statusCategories = [
    { value: 'all', label: 'All Statuses', count: vouchers.length },
    { value: 'available', label: 'Available', count: vouchers.filter(v => v.status === 'available').length },
    { value: 'used', label: 'Used / Redeemed', count: vouchers.filter(v => v.status === 'used').length },
  ];

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDurationFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Inventory Registry</h2>
          </div>
          <h1 className="text-xl font-light text-slate-900 dark:text-white tracking-tight">Voucher Management System</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A secure database repository of active internet access vouchers, configurations, and consumption histories.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Database Live Sync
            </span>
          </div>
          {onAdd && (
            <button
              onClick={openAdd}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-blue-200 dark:shadow-blue-900 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Voucher
            </button>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search voucher codes, price, durations..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:text-slate-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Mobile Add button */}
            {onAdd && (
              <button
                onClick={openAdd}
                className="sm:hidden flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center flex-wrap gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Duration:</span>
              <select
                value={durationFilter}
                onChange={handleDurationChange}
                className="border border-slate-200 dark:border-slate-800 rounded-sm bg-white dark:bg-slate-900 py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
              >
                <option value="all">All Durations</option>
                <option value="1H">1 Hour</option>
                <option value="3H">3 Hours</option>
                <option value="1D">1 Day</option>
                <option value="2D">2 Days</option>
                <option value="30D">30 Days</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-200 dark:border-slate-800 rounded-sm bg-white dark:bg-slate-900 py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value={5}>5 rows</option>
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
              </select>
            </div>

            {(searchTerm || statusFilter !== 'all' || durationFilter !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors"
              >
                <Eraser className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
            Filter Status:
          </span>
          {statusCategories.map((category) => {
            const isSelected = statusFilter === category.value;
            return (
              <button
                key={category.value}
                onClick={() => {
                  setStatusFilter(category.value as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-xs border transition-all cursor-pointer font-medium rounded-full ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-white'
                }`}
              >
                {category.label}{' '}
                <span className={`inline-block ml-1 px-1.5 py-0.2 text-[9px] rounded-full font-mono ${
                  isSelected ? 'bg-blue-500 text-blue-50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Desktop Table */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-100 dark:border-slate-800">
              <th className="px-6 py-3 font-semibold">Voucher Code</th>
              <th className="px-6 py-3 font-semibold">Duration</th>
              <th className="px-6 py-3 font-semibold">Price</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 italic">
                  NO_RECORDS_FOUND
                </td>
              </tr>
            ) : (
              paginated.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white tracking-tight">{v.code}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium uppercase text-[10px]">{v.duration}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium uppercase text-[10px]">{v.price}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter ${
                      v.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 line-through'
                    }`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Edit button — desktop only */}
                      {onEdit && (
                        <button
                          onClick={() => openEdit(v)}
                          title="Edit voucher"
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-amber-600 border border-transparent hover:border-amber-100 dark:hover:border-amber-900 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Toggle status */}
                      {v.status === 'available' ? (
                        <button
                          onClick={() => handleUpdateStatus(v.id, 'used', v.code)}
                          title="Mark as used"
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 border border-transparent hover:border-emerald-100 rounded transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(v.id, 'available', v.code)}
                          title="Mark as available"
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 border border-transparent hover:border-blue-100 rounded transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Delete */}
                      <button
                        onClick={() => setTargetToDelete({ id: v.id, code: v.code })}
                        title="Delete voucher"
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 border border-transparent hover:border-red-100 rounded transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {paginated.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 italic text-xs">
            NO_RECORDS_FOUND
          </div>
        ) : (
          paginated.map((v) => (
            <div key={v.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-white tracking-tight">{v.code}</span>
                  <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tighter ${
                    v.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}>
                    {v.status}
                  </span>
                </div>
                <div className="flex gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  <span>{v.duration}</span>
                  <span>•</span>
                  <span>{v.price}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {v.status === 'available' ? (
                  <button
                    onClick={() => handleUpdateStatus(v.id, 'used', v.code)}
                    className="p-2 text-emerald-600 bg-emerald-50 rounded border border-emerald-100"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(v.id, 'available', v.code)}
                    className="p-2 text-blue-600 bg-blue-50 rounded border border-blue-100"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setTargetToDelete({ id: v.id, code: v.code })}
                  className="p-2 text-red-500 bg-red-50 rounded border border-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <VoucherFormModal
        isOpen={modalMode !== null}
        mode={modalMode ?? 'add'}
        initial={editTarget ? {
          code: editTarget.code,
          duration: editTarget.duration,
          price: editTarget.price,
          status: editTarget.status,
        } : undefined}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!targetToDelete}
        onClose={() => setTargetToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Voucher Code"
        message={`Are you sure you want to permanently delete voucher code "${targetToDelete?.code}" from the database? This action cannot be undone.`}
        confirmLabel="Delete permanently"
        isDestructive={true}
      />

      {/* Pagination Footer */}
      {filtered.length > 0 && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {Math.min((safeCurrentPage - 1) * itemsPerPage + 1, filtered.length)}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {Math.min(safeCurrentPage * itemsPerPage, filtered.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-800 dark:text-slate-200">{filtered.length}</span>{' '}
            vouchers
            {statusFilter !== 'all' || durationFilter !== 'all' || searchTerm ? ' (filtered)' : ''}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className={`p-2 border border-slate-200 dark:border-slate-800 rounded-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 transition-colors ${
                safeCurrentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white dark:bg-slate-900 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => Math.abs(page - safeCurrentPage) <= 2 || page === 1 || page === totalPages)
              .map((page, idx, arr) => {
                const isPageSelected = safeCurrentPage === page;
                const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="px-2 text-slate-400 dark:text-slate-500 text-xs">...</span>}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`min-w-8 h-8 px-2 border text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                        isPageSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className={`p-2 border border-slate-200 dark:border-slate-800 rounded-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 transition-colors ${
                safeCurrentPage === totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white dark:bg-slate-900 cursor-pointer'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
