import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Ticket, Zap, Clock, CreditCard, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Coins, Wallet, TrendingUp, Layers, History, X, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Voucher } from '../types';
import { MyPurchasedCodes } from './MyPurchasedCodes';

interface Props {
  vouchers: Voucher[];
  available: number;
  used: number;
  onGetVoucher: (duration: string) => Promise<Voucher | null>;
  isDarkMode: boolean;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  isMaintenanceMode?: boolean;
}

const DURATIONS = [
  { id: '1H', label: '1 Hour', price: 'Php 5.00' },
  { id: '3H', label: '3 Hours', price: 'Php 10.00' },
  { id: '1D', label: '1 Day', price: 'Php 20.00' },
  { id: '2D', label: '2 Days', price: 'Php 35.00' },
  { id: '30D', label: '30 Days', price: 'Php 200.00' },
];

export function KioskView({ vouchers = [], available, used, onGetVoucher, isDarkMode, onRefresh, isRefreshing, isMaintenanceMode }: Props) {
  const [pendingDuration, setPendingDuration] = useState<typeof DURATIONS[0] | null>(null);
  const [dispensedVoucher, setDispensedVoucher] = useState<Voucher | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMyCodesOpen, setIsMyCodesOpen] = useState(false);
  const [purchasedCodes, setPurchasedCodes] = useState<Voucher[]>(() => {
    try {
      const stored = localStorage.getItem('myPurchasedCodes');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [pullY, setPullY] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0) {
        // Add resistance and max out at 100px
        setPullY(Math.min(diff * 0.4, 100));
        // Prevent default scrolling when pulling down
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullY > 60 && !isPullRefreshing && !isRefreshing) {
      setIsPullRefreshing(true);
      setPullY(60);
      // Let the spinner show at 60px before triggering a hard reload
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } else {
      setStartY(0);
      setPullY(0);
    }
  };

  // Sync external loading state
  const isActuallyRefreshing = isRefreshing || isPullRefreshing;

  const getStockForDuration = (durationId: string) => {
    return vouchers.filter(v => v.duration?.toUpperCase() === durationId.toUpperCase() && v.status === 'available').length;
  };

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

  const { todayIncome, lastWeekIncome, monthlyIncome } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = startOfToday - 30 * 24 * 60 * 60 * 1000;

    let today = 0, week = 0, month = 0;

    vouchers.forEach(v => {
      if (v.status === 'used') {
        const price = getPriceValue(v);
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

  const potentialValue = useMemo(() => {
    return vouchers
      .filter(v => v.status === 'available')
      .reduce((sum, v) => sum + getPriceValue(v), 0);
  }, [vouchers]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const cardWidth = 280 + 16; // card width + gap
    const index = Math.round(scrollLeft / cardWidth);
    if (index !== activeCardIndex && index >= 0 && index < 4) {
      setActiveCardIndex(index);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const cardWidth = 280 + 16; // card width + gap
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? Math.max(0, currentScroll - cardWidth) 
        : Math.min(scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth, currentScroll + cardWidth);
      scrollContainerRef.current.scrollTo({ left: newScroll, behavior: 'smooth' });
    }
  };

  const handleConfirmDispense = async () => {
    if (!pendingDuration) return;
    
    setIsRedeeming(true);
    try {
      const voucher = await onGetVoucher(pendingDuration.id);
      if (voucher) {
        const storedVoucher = { ...voucher, purchasedAt: new Date().toISOString() };
        const newPurchasedCodes = [storedVoucher, ...purchasedCodes];
        setPurchasedCodes(newPurchasedCodes);
        try {
          localStorage.setItem('myPurchasedCodes', JSON.stringify(newPurchasedCodes));
        } catch(e) {}
        
        setDispensedVoucher(voucher);
        setError(null);
      } else {
        setError(`No available vouchers for ${pendingDuration.id}`);
        setDispensedVoucher(null);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsRedeeming(false);
      setPendingDuration(null);
    }
  };

  const themeClass = isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardClass = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="relative overflow-hidden w-full h-full">
      {isMaintenanceMode ? (
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 z-50 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`w-full max-w-sm p-8 rounded-[2rem] border shadow-2xl text-center space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
          >
            <motion.div 
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mx-auto"
            >
              <AlertCircle className="w-12 h-12 text-amber-500" />
            </motion.div>
            <div className="space-y-3">
              <h2 className={`text-2xl font-black font-display tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>System Maintenance</h2>
              <p className={`text-xs font-medium leading-relaxed px-2 ${textMuted}`}>
                The voucher dispensing system is currently undergoing scheduled maintenance. Please check back shortly!
              </p>
            </div>
            <div className="pt-4 flex justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Temporarily Offline</span>
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Pull to refresh spinner */}
      <div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-16 z-20 pointer-events-none"
        style={{
          transform: `translateY(${pullY > 0 || isActuallyRefreshing ? Math.min(pullY, 60) - 30 : -100}px)`,
          opacity: pullY > 0 || isActuallyRefreshing ? Math.min(pullY / 60, 1) : 0,
          transition: startY === 0 ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'none'
        }}
      >
        <div className={`w-8 h-8 rounded-full border-[3px] shadow-md flex items-center justify-center ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
        }`}>
          <div className={`w-4 h-4 rounded-full border-2 border-t-transparent animate-spin ${
            isDarkMode ? 'border-blue-400' : 'border-blue-500'
          }`}></div>
        </div>
      </div>

      <div 
        className={`-m-4 sm:-m-8 p-6 min-h-[calc(100vh-64px)] transition-colors duration-500 font-sans ${themeClass}`}
        style={{
          transform: `translateY(${isActuallyRefreshing ? 60 : pullY}px)`,
          transition: startY === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        <div className="max-w-md mx-auto space-y-10">
        {/* Header - Pull to refresh trigger area */}
        <div 
          className="py-2 -my-2 flex flex-col gap-4 relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Centered pull-to-refresh hint */}
          <div className={`flex flex-col items-center justify-center opacity-50 ${textMuted} animate-bounce w-full pt-2`}>
            <ArrowDown className="w-4 h-4 mb-1" />
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-center">Pull to refresh</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight font-display">Welcome</h2>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${textMuted}`}>Select a voucher to begin</p>
            </div>
          </div>
        </div>

        {/* Kiosk Stats - Horizontally Scrollable Carousel Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ margin: "-20px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${textMuted}`}>Swipe or Scroll Metrics</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => scroll('left')}
                className={`p-1 rounded-full border transition-all ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white hover:border-slate-700' 
                    : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                } cursor-pointer flex items-center justify-center`}
                title="Scroll Left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div 
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      activeCardIndex === i 
                        ? 'bg-blue-500 w-3.5' 
                        : isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                    }`}
                  ></div>
                ))}
              </div>

              <button 
                onClick={() => scroll('right')}
                className={`p-1 rounded-full border transition-all ${
                  isDarkMode 
                    ? 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white hover:border-slate-700' 
                    : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                } cursor-pointer flex items-center justify-center`}
                title="Scroll Right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory pr-4 -mr-6 pl-1 -ml-1 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Card 1: Today's Income */}
            <motion.div 
              initial={{ opacity: 0.3, scale: 0.9, x: 20 }}
              whileInView={{ opacity: 1, scale: 1, x: 0 }}
              viewport={{ amount: 0.4 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`snap-center shrink-0 w-[280px] p-6 rounded-3xl border transition-colors ${cardClass} shadow-md border-l-4 border-l-blue-500 relative overflow-hidden group`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isDarkMode ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
                    <Coins className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <span className={`text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-md uppercase ${
                    isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-800'
                  }`}>
                    Collected
                  </span>
                </div>
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Today's Income
                  </span>
                  <span className={`text-2xl font-bold tracking-tight font-display block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Php {todayIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Revenue generated today
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Last Week's Income */}
            <motion.div 
              initial={{ opacity: 0.3, scale: 0.9, x: 20 }}
              whileInView={{ opacity: 1, scale: 1, x: 0 }}
              viewport={{ amount: 0.4 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`snap-center shrink-0 w-[280px] p-6 rounded-3xl border transition-colors ${cardClass} shadow-md border-l-4 border-l-slate-500 relative overflow-hidden group`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isDarkMode ? 'bg-slate-500/15' : 'bg-slate-50'}`}>
                    <Coins className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                  </div>
                  <span className={`text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-md uppercase ${
                    isDarkMode ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-100 text-slate-800'
                  }`}>
                    Collected
                  </span>
                </div>
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Last Week's Income
                  </span>
                  <span className={`text-2xl font-bold tracking-tight font-display block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Php {lastWeekIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Revenue past 7 days
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Monthly Income */}
            <motion.div 
              initial={{ opacity: 0.3, scale: 0.9, x: 20 }}
              whileInView={{ opacity: 1, scale: 1, x: 0 }}
              viewport={{ amount: 0.4 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`snap-center shrink-0 w-[280px] p-6 rounded-3xl border transition-colors ${cardClass} shadow-md border-l-4 border-l-emerald-500 relative overflow-hidden group`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isDarkMode ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                    <Coins className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <span className={`text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-md uppercase ${
                    isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Collected
                  </span>
                </div>
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Monthly Income
                  </span>
                  <span className={`text-2xl font-bold tracking-tight font-display block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Php {monthlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Revenue past 30 days
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Card 4: Available Vouchers */}
            <motion.div 
              initial={{ opacity: 0.3, scale: 0.9, x: 20 }}
              whileInView={{ opacity: 1, scale: 1, x: 0 }}
              viewport={{ amount: 0.4 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`snap-center shrink-0 w-[280px] p-6 rounded-3xl border transition-colors ${cardClass} shadow-md border-l-4 border-l-amber-500 relative overflow-hidden group`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isDarkMode ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
                    <Ticket className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  </div>
                  <span className={`text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-md uppercase ${
                    isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Ready
                  </span>
                </div>
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Available Vouchers
                  </span>
                  <span className={`text-2xl font-bold tracking-tight font-display block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {available} Codes
                  </span>
                  <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Unsold value: <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Php {potentialValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Action Section */}
        <div className="space-y-5">
          <div className="grid gap-4">
            {DURATIONS.map((d, index) => {
              const stock = getStockForDuration(d.id);
              return (
                <motion.button
                  key={d.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ margin: "-20px" }}
                  transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
                  onClick={() => setPendingDuration(d)}
                  className={`w-full group relative overflow-hidden p-6 rounded-[2rem] border transition-all active:scale-[0.98] text-left flex items-center justify-between ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50 shadow-lg shadow-black/20' 
                      : 'bg-white border-slate-200 hover:border-blue-500/50 hover:shadow-xl shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all group-hover:scale-105 group-hover:rotate-3 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-blue-400' : 'bg-slate-50 border-slate-100 text-blue-600'
                    }`}>
                      <span className="text-sm font-bold font-display">{d.id}</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-lg tracking-tight font-display">{d.label}</div>
                      <div className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{d.price}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2.5 py-1 font-bold uppercase tracking-wider ${
                      stock > 0 
                        ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                        : isDarkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {stock > 0 ? `${stock} Stock` : 'Out of Stock'}
                    </span>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isDarkMode ? 'bg-slate-800 group-hover:bg-blue-500 group-hover:text-white' : 'bg-slate-50 group-hover:bg-blue-600 group-hover:text-white'
                    }`}>
                      <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ margin: "-20px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="pt-6"
        >
          <button
            onClick={() => setIsMyCodesOpen(true)}
            className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 border ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            My Purchased Codes
            {purchasedCodes.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
              }`}>
                {purchasedCodes.length}
              </span>
            )}
          </button>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="pt-12 pb-6 text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-4 opacity-20">
            <div className="h-px flex-1 max-w-[40px] bg-current"></div>
            <Ticket className="w-4 h-4" />
            <div className="h-px flex-1 max-w-[40px] bg-current"></div>
          </div>
          <div className="space-y-1">
            <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${textMuted}`}>
              © {new Date().getFullYear()} Leirad Hotspot
            </p>
            <p className={`text-[8px] font-bold uppercase tracking-[0.2em] opacity-40 ${textMuted}`}>
              All Rights Reserved
            </p>
          </div>
        </motion.div>
      </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {pendingDuration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`rounded-3xl w-full max-w-sm overflow-hidden border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="p-8 text-center space-y-8">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto rotate-12 ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <Ticket className="w-10 h-10 text-blue-500" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold font-display tracking-tight">Confirm Selection</h3>
                  <p className={`text-xs font-medium px-4 ${textMuted}`}>You are requesting a single-use access code for this duration.</p>
                </div>

                <div className={`p-6 rounded-[2rem] border flex items-center justify-between ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="text-left">
                    <span className={`text-[10px] font-bold uppercase tracking-widest block mb-0.5 ${textMuted}`}>Duration</span>
                    <span className="font-bold text-lg font-display uppercase">{pendingDuration.label}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold uppercase tracking-widest block mb-0.5 ${textMuted}`}>Amount</span>
                    <span className="font-bold text-lg font-display text-blue-500">{pendingDuration.price}</span>
                  </div>
                </div>

                <div className="grid gap-3">
                  <button 
                    onClick={handleConfirmDispense}
                    disabled={isRedeeming}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isRedeeming ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      'Generate Code'
                    )}
                  </button>
                  <button 
                    onClick={() => setPendingDuration(null)}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {dispensedVoucher && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`rounded-[2.5rem] w-full max-w-sm overflow-hidden border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="p-10 text-center space-y-8">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto relative"
                >
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 relative z-10" />
                </motion.div>
                
                <div className="space-y-1">
                  <h3 className="text-3xl font-black uppercase tracking-tighter">Success!</h3>
                  <p className={`text-xs font-bold uppercase tracking-widest ${textMuted}`}>Your code is ready</p>
                </div>
                
                <div className={`p-8 rounded-[2rem] border-2 border-dashed transition-colors relative group ${
                  isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-5xl font-black text-blue-500 tracking-tighter select-all block">
                    {dispensedVoucher.code}
                  </span>
                  <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    Access Code
                  </div>
                </div>

                <div className={`flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${textMuted} px-2`}>
                  <span>{dispensedVoucher.duration}</span>
                  <div className="w-1 h-1 rounded-full bg-current opacity-30"></div>
                  <span>{dispensedVoucher.price}</span>
                </div>

                <button 
                  onClick={() => setDispensedVoucher(null)}
                  className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:bg-slate-800 active:scale-95 transition-all"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-red-500/10 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`rounded-3xl w-full max-w-sm overflow-hidden border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="p-8 text-center space-y-6">
                <motion.div 
                  animate={{ 
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 0.5, 
                    repeat: Infinity, 
                    repeatDelay: 2 
                  }}
                  className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto"
                >
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tight">Empty Inventory</h3>
                  <p className={`text-xs font-medium px-4 ${textMuted}`}>{error}</p>
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-700 active:scale-95 transition-all"
                >
                  Acknowledge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {isMyCodesOpen && (
          <MyPurchasedCodes
            purchasedCodes={purchasedCodes}
            isDarkMode={isDarkMode}
            onClose={() => setIsMyCodesOpen(false)}
          />
        )}
      </AnimatePresence>
      </>
      )}
    </div>
  );
}
