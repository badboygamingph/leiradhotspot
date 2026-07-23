import React from 'react';
import { ChevronLeft, ExternalLink, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ArtistPortfolioViewProps {
  isDarkMode: boolean;
  onClose: () => void;
}

export function ArtistPortfolioView({ isDarkMode, onClose }: ArtistPortfolioViewProps) {
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className={`fixed top-16 inset-x-0 bottom-0 z-30 flex flex-col ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      {/* Header */}
      <div className={`px-4 pt-4 pb-4 border-b shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 ${isDarkMode ? 'bg-slate-950 border border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}`}
          >
            <ChevronLeft className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold font-display tracking-tight text-xl truncate flex items-center gap-2">
              <Music className="w-5 h-5 text-indigo-500" />
              Artist Portfolio
            </h3>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-0.5 ${textMuted}`}>
              Dariel Pagsiat Ganzon
            </p>
          </div>
          <a
            href="https://leirad-artist.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 rounded-xl transition-all active:scale-95 flex items-center gap-2 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'}`}
          >
            <span className="text-[10px] font-bold uppercase hidden sm:block">Open Full</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full bg-black relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        </div>
        <iframe 
          src="https://leirad-artist.vercel.app/"
          className="w-full h-full border-none relative z-10 bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title="Leirad Artist Portfolio"
        />
      </div>
    </motion.div>
  );
}
