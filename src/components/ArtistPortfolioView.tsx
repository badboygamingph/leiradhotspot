import React, { useEffect, useState } from 'react';
import { ChevronLeft, ExternalLink, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ArtistPortfolioViewProps {
  isDarkMode: boolean;
  onClose: () => void;
}

export function ArtistPortfolioView({ isDarkMode, onClose }: ArtistPortfolioViewProps) {
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calc = document.getElementById('floating-calculator');
    if (calc) {
      calc.style.display = 'none';
    }
    return () => {
      if (calc) {
        calc.style.display = '';
      }
    };
  }, []);

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
              Leirad G.
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
      <div className={`flex-1 w-full relative ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`absolute inset-0 z-20 p-6 flex flex-col items-center justify-center space-y-8 ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}
            >
              <div className="w-full max-w-sm space-y-8 flex flex-col items-center animate-pulse">
                {/* Header Text Skeleton */}
                <div className="space-y-3 w-full flex flex-col items-center">
                  <div className={`h-8 w-2/3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                  <div className={`h-10 w-full rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                </div>
                
                {/* Avatar Skeleton */}
                <div className={`w-40 h-40 rounded-full mt-4 border-4 ${isDarkMode ? 'bg-slate-800 border-slate-900' : 'bg-slate-200 border-slate-100'}`}></div>
                
                {/* Description Text Skeleton */}
                <div className="w-full space-y-3 mt-8">
                  <div className={`h-4 w-full rounded ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                  <div className={`h-4 w-5/6 mx-auto rounded ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                </div>
                
                {/* Button Skeleton */}
                <div className={`mt-10 w-full h-14 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <iframe 
          src="https://leirad-artist.vercel.app/"
          className={`w-full h-full border-none relative z-10 transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title="Leirad Artist Portfolio"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </motion.div>
  );
}
