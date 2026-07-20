import React from 'react';
import { Ticket, History, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Voucher } from '../types';

interface MyPurchasedCodesProps {
  purchasedCodes: Voucher[];
  isDarkMode: boolean;
  onClose: () => void;
}

export function MyPurchasedCodes({ purchasedCodes, isDarkMode, onClose }: MyPurchasedCodesProps) {
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className={`fixed top-16 inset-x-0 bottom-0 z-30 flex flex-col ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      <div className={`p-4 sm:p-6 border-b flex items-center justify-between relative overflow-hidden shrink-0 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {/* Decorative subtle background gradient */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-400/10'}`}></div>
        
        <div className="flex items-center gap-3 sm:gap-4 relative z-10 w-full">
          <button
            onClick={onClose}
            className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm transition-all active:scale-95 ${isDarkMode ? 'bg-slate-950 border border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}`}
          >
            <ChevronLeft className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold font-display tracking-tight text-xl sm:text-2xl truncate">My Purchased Codes</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate ${textMuted}`}>Stored securely locally</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20">
        {purchasedCodes.length === 0 ? (
          <div className="text-center py-16 space-y-5">
            <motion.div 
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-sm ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'}`}
            >
              <Ticket className={`w-8 h-8 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
            </motion.div>
            <div className="space-y-1.5">
              <p className={`text-lg font-bold tracking-tight font-display ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>No codes history yet</p>
              <p className={`text-[11px] font-medium uppercase tracking-wider ${textMuted}`}>Vouchers you generate will securely appear here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {purchasedCodes.map((code, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, ease: "easeOut" }}
                key={idx} 
                className={`relative overflow-hidden rounded-[1.5rem] border transition-all hover:shadow-lg ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-blue-500/30' : 'bg-white border-slate-200 hover:border-blue-500/30 shadow-sm'
                }`}
              >
                {/* Decorative accent strip */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-md ${
                      isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {code.duration}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>
                      {new Date(code.purchasedAt || '').toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className={`px-5 py-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between border-2 border-dashed gap-3 ${
                    isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <span className={`text-2xl sm:text-3xl font-black font-mono tracking-[0.15em] select-all ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {code.code}
                    </span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Ready</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
