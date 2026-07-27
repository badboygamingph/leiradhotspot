import React, { useEffect, useState } from 'react';
import { ChevronLeft, ExternalLink, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpotifyPreviewViewProps {
  isDarkMode: boolean;
  onClose: () => void;
}

export function SpotifyPreviewView({ isDarkMode, onClose }: SpotifyPreviewViewProps) {
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
              <Music className="w-5 h-5 text-emerald-500" />
              Listen on Spotify
            </h3>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-0.5 ${textMuted}`}>
              Leirad G.
            </p>
          </div>
          <a
            href="https://open.spotify.com/artist/78yrPwOcBEFSnaUPOycNmS?si=0E3Ev8nzQj2a67E4H9XzXg"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 rounded-xl transition-all active:scale-95 flex items-center gap-2 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-emerald-400' : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-600'}`}
          >
            <span className="text-[10px] font-bold uppercase hidden sm:block">Open App</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 w-full relative ${isDarkMode ? 'bg-[#121212]' : 'bg-white'} p-4 flex justify-center`}>
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`absolute inset-0 z-20 p-6 flex flex-col items-center space-y-8 ${isDarkMode ? 'bg-[#121212]' : 'bg-white'}`}
            >
              <div className="w-full max-w-sm space-y-8 flex flex-col items-center animate-pulse pt-10">
                <div className={`h-[352px] w-full rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-2xl h-full">
          <iframe 
            style={{ borderRadius: '12px' }}
            src={`https://open.spotify.com/embed/artist/78yrPwOcBEFSnaUPOycNmS?utm_source=generator${isDarkMode ? '&theme=0' : ''}`}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className={`relative z-10 transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            title="Spotify Preview"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    </motion.div>
  );
}
