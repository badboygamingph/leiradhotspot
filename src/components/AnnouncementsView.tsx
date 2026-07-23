import React, { useState, useEffect } from 'react';
import { ChevronLeft, Megaphone, Info, AlertTriangle, CheckCircle2, Zap, RefreshCw, Search, X, Clock, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'promo';
  is_active: boolean;
  created_at: string;
}

type TimeFilter = 'all' | 'today' | 'week' | 'month';

const TIME_FILTERS: { id: TimeFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all',   label: 'All',        icon: <CalendarRange className="w-3 h-3" /> },
  { id: 'today', label: 'Today',      icon: <Clock className="w-3 h-3" /> },
  { id: 'week',  label: 'Last Week',  icon: <Calendar className="w-3 h-3" /> },
  { id: 'month', label: 'Last Month', icon: <CalendarDays className="w-3 h-3" /> },
];

function matchesTime(announcement: Announcement, filter: TimeFilter): boolean {
  if (filter === 'all') return true;
  const ts = announcement.created_at;
  if (!ts) return false;
  const createdTime = new Date(ts).getTime();
  const now = Date.now();
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  if (filter === 'today')  return createdTime >= startOfToday;
  if (filter === 'week')   return createdTime >= now - 7  * 24 * 60 * 60 * 1000;
  if (filter === 'month')  return createdTime >= now - 30 * 24 * 60 * 60 * 1000;
  return true;
}

interface AnnouncementsViewProps {
  isDarkMode: boolean;
  onClose: () => void;
}

const TYPE_CONFIG = {
  info: {
    icon: <Info className="w-5 h-5" />,
    badge: 'Info',
    color: 'blue',
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-500',
    strip: 'bg-blue-500',
    badgeBg: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    badge: 'Notice',
    color: 'amber',
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-500',
    strip: 'bg-amber-500',
    badgeBg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  },
  success: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    badge: 'Update',
    color: 'emerald',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-500',
    strip: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  },
  promo: {
    icon: <Zap className="w-5 h-5" />,
    badge: 'Promo',
    color: 'purple',
    bg: 'bg-purple-500/10 border-purple-500/20',
    text: 'text-purple-500',
    strip: 'bg-purple-500',
    badgeBg: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
  },
};

export function AnnouncementsView({ isDarkMode, onClose }: AnnouncementsViewProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const { filteredAnnouncements, counts } = React.useMemo(() => {
    let filtered = announcements;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.content.toLowerCase().includes(q)
      );
    }

    const filterCounts: Record<TimeFilter, number> = {
      all: 0, today: 0, week: 0, month: 0
    };

    filtered.forEach(a => {
      if (matchesTime(a, 'all')) filterCounts.all++;
      if (matchesTime(a, 'today')) filterCounts.today++;
      if (matchesTime(a, 'week')) filterCounts.week++;
      if (matchesTime(a, 'month')) filterCounts.month++;
    });

    filtered = filtered.filter(a => matchesTime(a, timeFilter));

    return { filteredAnnouncements: filtered, counts: filterCounts };
  }, [announcements, searchTerm, timeFilter]);

  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

  const fetchAnnouncements = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/announcements?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    
    // Fallback polling every 10 seconds
    const interval = setInterval(() => {
      fetchAnnouncements();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Subscribe to realtime announcement changes
  useSupabaseRealtime({
    table: 'announcements',
    onChange: () => {
      fetchAnnouncements(true);
    }
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className={`fixed top-16 inset-x-0 bottom-0 z-30 flex flex-col ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      {/* ── Header ── */}
      <div className={`px-4 pt-4 pb-4 border-b shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 ${isDarkMode ? 'bg-slate-950 border border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}`}
          >
            <ChevronLeft className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold font-display tracking-tight text-xl truncate">Announcements</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${textMuted}`}>
                {loading ? 'Loading...' : `${filteredAnnouncements.length} active announcement${filteredAnnouncements.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchAnnouncements(true)}
            disabled={refreshing}
            className={`p-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* Filters */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                isDarkMode 
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              } border`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-500/20 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
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
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`rounded-[1.5rem] border p-6 animate-pulse ${cardBg}`}
                >
                  <div className={`h-3 rounded-full w-20 mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  <div className={`h-5 rounded-full w-3/4 mb-3 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  <div className={`h-3 rounded-full w-full mb-2 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  <div className={`h-3 rounded-full w-5/6 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                </div>
              ))}
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 space-y-4"
            >
              <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <p className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Failed to load</p>
                <p className={`text-xs mt-1 ${textMuted}`}>{error}</p>
              </div>
              <button
                onClick={() => fetchAnnouncements()}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold transition-colors hover:bg-blue-500 active:scale-95"
              >
                Try Again
              </button>
            </motion.div>
          ) : filteredAnnouncements.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 space-y-5"
            >
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100 shadow-sm'}`}
              >
                <Megaphone className={`w-9 h-9 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
              </motion.div>
              <div className="space-y-1.5">
                <p className={`text-lg font-bold tracking-tight font-display ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  No announcements yet
                </p>
                <p className={`text-[11px] font-medium uppercase tracking-wider ${textMuted}`}>
                  Check back later for updates and promotions.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <p className={`text-[10px] font-bold uppercase tracking-widest px-1 ${textMuted}`}>
                {filteredAnnouncements.length} active post{filteredAnnouncements.length !== 1 ? 's' : ''}
              </p>

              {filteredAnnouncements.map((item, idx) => {
                const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.06, 0.3), ease: "easeOut" }}
                    className={`relative overflow-hidden rounded-[1.5rem] border transition-all hover:shadow-lg ${cardBg} hover:border-slate-300 dark:hover:border-slate-700`}
                  >
                    {/* Color accent strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cfg.strip}`} />

                    <div className="p-5 pl-7">
                      {/* Top row: badge + date */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md border ${cfg.badgeBg}`}>
                          {cfg.icon && React.cloneElement(cfg.icon as React.ReactElement<any>, { className: 'w-3 h-3' })}
                          {cfg.badge}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${textMuted}`}>
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className={`font-black text-base tracking-tight leading-snug mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {item.title}
                      </h4>

                      {/* Content */}
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.content}
                      </p>
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
