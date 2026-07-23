import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, X, Delete } from 'lucide-react';

interface FloatingCalculatorProps {
  isDarkMode: boolean;
}

export function FloatingCalculator({ isDarkMode }: FloatingCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isNewNumber, setIsNewNumber] = useState(true);

  const buttonClass = `
    flex items-center justify-center text-lg font-medium rounded-2xl transition-all active:scale-95 h-12
  `;

  const numberClass = isDarkMode 
    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' 
    : 'bg-white text-slate-800 hover:bg-slate-50 shadow-sm border border-slate-200';

  const opClass = isDarkMode 
    ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' 
    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100';

  const handleNumber = (num: string) => {
    if (isNewNumber) {
      setDisplay(num);
      setIsNewNumber(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOperator = (op: string) => {
    // If the last character in the equation is an operator and we just pressed an operator, replace it
    if (isNewNumber && equation && /[\+\-\*\/]$/.test(equation)) {
      setEquation(equation.slice(0, -1) + op);
      return;
    }
    
    // Evaluate if there's an ongoing equation
    try {
      if (!isNewNumber && equation) {
        // eslint-disable-next-line no-eval
        const result = eval(equation + display);
        const formattedResult = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(8)).toString();
        setDisplay(formattedResult);
        setEquation(formattedResult + op);
      } else {
        setEquation(display + op);
      }
    } catch (e) {
      setDisplay('Error');
    }
    setIsNewNumber(true);
  };

  const handleEqual = () => {
    if (!equation || isNewNumber) return;
    try {
      // eslint-disable-next-line no-eval
      const result = eval(equation + display);
      const formattedResult = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(8)).toString();
      setDisplay(formattedResult);
      setEquation('');
      setIsNewNumber(true);
    } catch (e) {
      setDisplay('Error');
      setEquation('');
      setIsNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setIsNewNumber(true);
  };

  const handleDelete = () => {
    if (isNewNumber) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
      setIsNewNumber(true);
    }
  };

  const handleDecimal = () => {
    if (isNewNumber) {
      setDisplay('0.');
      setIsNewNumber(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
      if (e.key === '.') handleDecimal();
      if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') handleOperator(e.key);
      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEqual();
      }
      if (e.key === 'Backspace') handleDelete();
      if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') handleClear();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, equation, isNewNumber]);

  return (
    <div id="floating-calculator" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className={`mb-4 w-72 rounded-[2rem] shadow-2xl border p-4 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {/* Display */}
            <div className={`mb-4 p-4 rounded-[1.5rem] flex flex-col items-end justify-end overflow-hidden ${
              isDarkMode ? 'bg-slate-950 shadow-inner' : 'bg-white shadow-sm border border-slate-200'
            }`}>
              <div className={`text-xs h-4 mb-1 font-mono tracking-wider ${
                isDarkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {equation.replace(/\*/g, '×').replace(/\//g, '÷')}
              </div>
              <div className={`text-3xl font-bold tracking-tight truncate w-full text-right ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                {display}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-2">
              <button onClick={handleClear} className={`${buttonClass} ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 border border-red-100 hover:bg-red-100'}`}>C</button>
              <button onClick={handleDelete} className={`${buttonClass} ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300'}`}>
                <Delete className="w-5 h-5" />
              </button>
              <button onClick={() => handleOperator('/')} className={`${buttonClass} ${opClass}`}>÷</button>
              <button onClick={() => handleOperator('*')} className={`${buttonClass} ${opClass}`}>×</button>

              <button onClick={() => handleNumber('7')} className={`${buttonClass} ${numberClass}`}>7</button>
              <button onClick={() => handleNumber('8')} className={`${buttonClass} ${numberClass}`}>8</button>
              <button onClick={() => handleNumber('9')} className={`${buttonClass} ${numberClass}`}>9</button>
              <button onClick={() => handleOperator('-')} className={`${buttonClass} ${opClass}`}>-</button>

              <button onClick={() => handleNumber('4')} className={`${buttonClass} ${numberClass}`}>4</button>
              <button onClick={() => handleNumber('5')} className={`${buttonClass} ${numberClass}`}>5</button>
              <button onClick={() => handleNumber('6')} className={`${buttonClass} ${numberClass}`}>6</button>
              <button onClick={() => handleOperator('+')} className={`${buttonClass} ${opClass}`}>+</button>

              <div className="col-span-3 grid grid-cols-3 gap-2">
                <button onClick={() => handleNumber('1')} className={`${buttonClass} ${numberClass}`}>1</button>
                <button onClick={() => handleNumber('2')} className={`${buttonClass} ${numberClass}`}>2</button>
                <button onClick={() => handleNumber('3')} className={`${buttonClass} ${numberClass}`}>3</button>
                <button onClick={() => handleNumber('0')} className={`${buttonClass} ${numberClass} col-span-2`}>0</button>
                <button onClick={handleDecimal} className={`${buttonClass} ${numberClass}`}>.</button>
              </div>

              <button 
                onClick={handleEqual} 
                className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20`}
                style={{ height: 'calc(100% + 0.5rem)' }}
              >
                =
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 ${
          isOpen 
            ? 'bg-slate-800 text-white hover:bg-slate-700' 
            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/30'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isOpen ? 'close' : 'open'}
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Calculator className="w-6 h-6" />}
          </motion.div>
        </AnimatePresence>
      </button>
    </div>
  );
}
