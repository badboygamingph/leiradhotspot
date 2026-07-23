import React, { useMemo, useState } from 'react';
import { Ticket, ChevronLeft, Search, X, Clock, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Voucher } from '../types';

interface MyPurchasedCodesProps {
  purchasedCodes: Voucher[];
  isDarkMode: boolean;
  onClose: () => void;
}

type TimeFilter = 'all' | 'today' | 'week' | 'month';

const TIME_FILTERS: { id: TimeFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all',   label: 'All',        icon: <CalendarRange className="w-3 h-3" /> },
  { id: 'today', label: 'Today',      icon: <Clock className="w-3 h-3" /> },
  { id: 'week',  label: 'Last Week',  icon: <Calendar className="w-3 h-3" /> },
  { id: 'month', label: 'Last Month', icon: <CalendarDays className="w-3 h-3" /> },
];

function matchesTime(code: Voucher, filter: TimeFilter): boolean {
  if (filter === 'all') return true;
  const ts = (code as any).purchasedAt || code.createdAt;
  if (!ts) return false;
  const purchaseTime = new Date(ts).getTime();
  const now = Date.now();
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  if (filter === 'today')  return purchaseTime >= startOfToday;
  if (filter === 'week')   return purchaseTime >= now - 7  * 24 * 60 * 60 * 1000;
  if (filter === 'month')  return purchaseTime >= now - 30 * 24 * 60 * 60 * 1000;
  return true;
}

export function MyPurchasedCodes({ purchasedCodes, isDarkMode, onClose }: MyPurchasedCodesProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400';

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filtered = useMemo(() => {
    return purchasedCodes.filter(code => {
      const matchSearch = !searchTerm ||
        code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.duration.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTime = matchesTime(code, timeFilter);
      return matchSearch && matchTime;
    });
  }, [purchasedCodes, searchTerm, timeFilter]);

  const counts = useMemo(() => ({
    all:   purchasedCodes.length,
    today: purchasedCodes.filter(c => matchesTime(c, 'today')).length,
    week:  purchasedCodes.filter(c => matchesTime(c, 'week')).length,
    month: purchasedCodes.filter(c => matchesTime(c, 'month')).length,
  }), [purchasedCodes]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className={`fixed top-16 inset-x-0 bottom-0 z-30 flex flex-col ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      {/* ── Header ── */}
      <div className={`px-4 pt-4 pb-0 border-b shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onClose}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 ${isDarkMode ? 'bg-slate-950 border border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}`}
          >
            <ChevronLeft className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold font-display tracking-tight text-xl truncate">My Purchased Codes</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${textMuted}`}>
                {purchasedCodes.length} code{purchasedCodes.length !== 1 ? 's' : ''} stored locally
              </p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by code or duration..."
            className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${inputBg}`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Time filter tabs */}
        <div className="flex gap-1.5 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TIME_FILTERS.map(f => {
            const isActive = timeFilter === f.id;
            const count = counts[f.id];
            return (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all shrink-0 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : isDarkMode
                      ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {f.icon}
                {f.label}
                <span className={`ml-0.5 text-[9px] px-1 py-0.5 rounded-full font-mono ${
                  isActive
                    ? 'bg-blue-500 text-blue-100'
                    : isDarkMode ? 'bg-slate-700 text-slate-500' : 'bg-white text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-16 space-y-5"
            >
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-sm ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'}`}
              >
                {searchTerm || timeFilter !== 'all'
                  ? <Search className={`w-8 h-8 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  : <Ticket className={`w-8 h-8 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                }
              </motion.div>
              <div className="space-y-1.5">
                <p className={`text-lg font-bold tracking-tight font-display ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {searchTerm || timeFilter !== 'all' ? 'No matching codes found' : 'No codes history yet'}
                </p>
                <p className={`text-[11px] font-medium uppercase tracking-wider ${textMuted}`}>
                  {searchTerm
                    ? `No codes match "${searchTerm}"`
                    : timeFilter !== 'all'
                      ? `No codes found for ${TIME_FILTERS.find(f => f.id === timeFilter)?.label}`
                      : 'Vouchers you generate will securely appear here.'
                  }
                </p>
                {(searchTerm || timeFilter !== 'all') && (
                  <button
                    onClick={() => { setSearchTerm(''); setTimeFilter('all'); }}
                    className="mt-3 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`list-${timeFilter}-${searchTerm}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Result count */}
              <p className={`text-[10px] font-bold uppercase tracking-widest px-1 ${textMuted}`}>
                {filtered.length} code{filtered.length !== 1 ? 's' : ''}{' '}
                {timeFilter !== 'all' || searchTerm ? '(filtered)' : ''}
              </p>

              {filtered.map((code, idx) => {
                const ts = (code as any).purchasedAt || code.createdAt;
                const dateLabel = ts
                  ? new Date(ts).toLocaleString(undefined, {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })
                  : '—';

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.04, 0.3), ease: "easeOut" }}
                    key={`${code.code}-${idx}`}
                    className={`relative overflow-hidden rounded-[1.5rem] border transition-all hover:shadow-lg ${cardBg} hover:border-blue-500/30`}
                  >
                    {/* Blue accent strip */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />

                    <div className="p-5 pl-7">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                          {code.duration}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>
                          {dateLabel}
                        </span>
                      </div>

                      <div className={`px-4 py-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between border-2 border-dashed gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'}`}>
                        {/* Highlight search term in code */}
                        <span className={`text-2xl font-black font-mono tracking-[0.15em] select-all ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {searchTerm ? (
                            code.code.split(new RegExp(`(${searchTerm})`, 'gi')).map((part, i) =>
                              part.toLowerCase() === searchTerm.toLowerCase()
                                ? <mark key={i} className="bg-yellow-300 text-slate-900 rounded px-0.5">{part}</mark>
                                : <span key={i}>{part}</span>
                            )
                          ) : code.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(code.code)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all active:scale-95"
                        >
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                            {copiedCode === code.code ? '✓ Copied!' : 'Copy Code'}
                          </span>
                          {copiedCode !== code.code && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
