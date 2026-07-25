import React, { useMemo, useState } from 'react';
import { Ticket, ChevronLeft, Search, X, Clock, Calendar, CalendarDays, CalendarRange, Coins, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Voucher } from '../types';

interface IncomeVouchersViewProps {
  vouchers: Voucher[];
  period: 'today' | 'week' | 'month' | 'total';
  isDarkMode: boolean;
  onClose: () => void;
}

const PERIOD_CONFIG = {
  today: { label: 'Today\'s Sold Vouchers', icon: <Clock className="w-5 h-5" /> },
  week: { label: 'Last Week\'s Sold Vouchers', icon: <Calendar className="w-5 h-5" /> },
  month: { label: 'Monthly Sold Vouchers', icon: <CalendarDays className="w-5 h-5" /> },
  total: { label: 'Total Sold Vouchers', icon: <CalendarRange className="w-5 h-5" /> },
};

function matchesTime(code: Voucher, filter: 'today' | 'week' | 'month' | 'total'): boolean {
  if (filter === 'total') return true;
  const ts = code.usedAt || code.createdAt;
  if (!ts) return false;
  const usedTime = new Date(ts).getTime();
  const now = Date.now();
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  
  if (filter === 'today') return usedTime >= startOfToday;
  if (filter === 'week') return usedTime >= now - 7 * 24 * 60 * 60 * 1000;
  if (filter === 'month') return usedTime >= now - 30 * 24 * 60 * 60 * 1000;
  return true;
}

const getPriceValue = (v: Voucher): number => {
  if (v.price) {
    const match = v.price.match(/[\d.]+/);
    if (match) return parseFloat(match[0]);
  }
  switch (v.duration?.toUpperCase()) {
    case "1H": return 5;
    case "3H": return 10;
    case "1D": return 20;
    case "2D": return 35;
    case "30D": return 200;
    default: return 0;
  }
};

export function IncomeVouchersView({ vouchers, period, isDarkMode, onClose }: IncomeVouchersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400';

  const usedVouchers = useMemo(() => vouchers.filter(v => v.status === 'used'), [vouchers]);

  const filtered = useMemo(() => {
    return usedVouchers.filter(code => {
      const matchSearch = !searchTerm ||
        code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.duration.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTime = matchesTime(code, period);
      return matchSearch && matchTime;
    });
  }, [usedVouchers, searchTerm, period]);

  const totalIncomeForPeriod = useMemo(() => {
    return filtered.reduce((sum, v) => sum + getPriceValue(v), 0);
  }, [filtered]);

  const config = PERIOD_CONFIG[period];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className={`fixed top-16 inset-x-0 bottom-0 z-40 flex flex-col ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      {/* ── Header ── */}
      <div className={`px-4 pt-4 pb-4 border-b shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onClose}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 ${isDarkMode ? 'bg-slate-950 border border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}`}
          >
            <ChevronLeft className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold font-display tracking-tight text-xl truncate flex items-center gap-2">
              {config.icon}
              {config.label}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${textMuted}`}>
                {filtered.length} code{filtered.length !== 1 ? 's' : ''} sold
              </p>
            </div>
          </div>
        </div>

        {/* Income Summary Card inside Modal */}
        <div className={`mb-4 p-4 rounded-[1.5rem] border flex items-center justify-between ${cardBg}`}>
            <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Total Income</p>
                <p className={`text-2xl font-black font-display tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Php {totalIncomeForPeriod.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                <TrendingUp className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
        </div>

        {/* Search bar */}
        <div className="relative">
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
                {searchTerm
                  ? <Search className={`w-8 h-8 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  : <Coins className={`w-8 h-8 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                }
              </motion.div>
              <div className="space-y-1.5">
                <p className={`text-lg font-bold tracking-tight font-display ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {searchTerm ? 'No matching sales found' : 'No sales for this period'}
                </p>
                <p className={`text-[11px] font-medium uppercase tracking-wider ${textMuted}`}>
                  {searchTerm
                    ? `No codes match "${searchTerm}"`
                    : 'Sales data will appear here once vouchers are sold.'
                  }
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`list-${period}-${searchTerm}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filtered.map((code, idx) => {
                const ts = code.usedAt || code.createdAt;
                const dateLabel = ts
                  ? new Date(ts).toLocaleString(undefined, {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })
                  : '—';
                const price = getPriceValue(code);

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.04, 0.3), ease: "easeOut" }}
                    key={`${code.code}-${idx}`}
                    className={`relative overflow-hidden rounded-[1.5rem] border transition-all hover:shadow-lg ${cardBg} hover:border-emerald-500/30`}
                  >
                    {/* Emerald accent strip */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />

                    <div className="p-5 pl-7">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                          {code.duration}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>
                          {dateLabel}
                        </span>
                      </div>

                      <div className={`px-4 py-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between border gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                        {/* Highlight search term in code */}
                        <span className={`text-xl font-black font-mono tracking-[0.1em] select-all ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {searchTerm ? (
                            code.code.split(new RegExp(`(${searchTerm})`, 'gi')).map((part, i) =>
                              part.toLowerCase() === searchTerm.toLowerCase()
                                ? <mark key={i} className="bg-yellow-300 text-slate-900 rounded px-0.5">{part}</mark>
                                : <span key={i}>{part}</span>
                            )
                          ) : code.code}
                        </span>
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Price</span>
                           <span className={`text-sm font-black font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              Php {price.toFixed(2)}
                           </span>
                        </div>
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
