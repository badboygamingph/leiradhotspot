import React, { useState, useMemo } from "react";
import { Keyboard, ClipboardList, CheckCircle, AlertTriangle, ShieldCheck, Loader2, Plus, Info } from "lucide-react";
import { ExtractedVoucher } from "../types";
import { useToast } from "./Toast";

interface Props {
  onExtracted: (vouchers: ExtractedVoucher[], source: string) => Promise<void> | void;
}

const DURATION_PRESETS = [
  { id: "1h", label: "1 Hour", price: "Php 5.00" },
  { id: "3h", label: "3 Hours", price: "Php 10.00" },
  { id: "1d", label: "1 Day", price: "Php 20.00" },
  { id: "2d", label: "2 Days", price: "Php 35.00" },
  { id: "30d", label: "30 Days", price: "Php 200.00" },
];

export function ImportVouchersWidget({ onExtracted }: Props) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"manual" | "bulk">("manual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- State for Single Manual Input ---
  const [singleCode, setSingleCode] = useState("");
  const [singleDuration, setSingleDuration] = useState("1h");
  const [singlePrice, setSinglePrice] = useState("Php 5.00");

  // --- State for Bulk Paste Input ---
  const [bulkText, setBulkText] = useState("");
  const [bulkMode, setBulkMode] = useState<"fixed" | "delimited">("fixed");
  const [bulkDuration, setBulkDuration] = useState("1h");
  const [bulkPrice, setBulkPrice] = useState("Php 5.00");

  // Handle auto-prefilling prices for manual presets
  const handleSingleDurationChange = (dur: string) => {
    setSingleDuration(dur);
    const preset = DURATION_PRESETS.find(p => p.id === dur);
    if (preset) {
      setSinglePrice(preset.price);
    }
  };

  const handleBulkDurationChange = (dur: string) => {
    setBulkDuration(dur);
    const preset = DURATION_PRESETS.find(p => p.id === dur);
    if (preset) {
      setBulkPrice(preset.price);
    }
  };

  // Helper to normalize the manual price strings
  const normalizePriceInput = (p: string): string => {
    let clean = p.trim();
    if (!clean) return "Php 5.00";
    if (!clean.toUpperCase().startsWith("PHP") && !clean.startsWith("₱") && !clean.startsWith("$")) {
      return `Php ${clean}`;
    }
    return clean;
  };

  // Helper to normalize duration formats (like converting "1 Hour" to "1h")
  const normalizeDurationInput = (d: string): string => {
    const norm = d.toLowerCase().trim();
    if (norm.match(/(\d+)\s*(?:h|hr|hour|hours)/)) {
      const match = norm.match(/(\d+)\s*(?:h|hr|hour|hours)/);
      return match ? `${match[1]}h` : "1h";
    }
    if (norm.match(/(\d+)\s*(?:d|day|days)/)) {
      const match = norm.match(/(\d+)\s*(?:d|day|days)/);
      return match ? `${match[1]}d` : "1d";
    }
    if (norm.match(/(\d+)\s*(?:m|min|minute|minutes)/)) {
      const match = norm.match(/(\d+)\s*(?:m|min|minute|minutes)/);
      return match ? `${match[1]}m` : "1h";
    }
    return norm || "1h";
  };

  // --- Real-time Bulk Parsing Logic ---
  const parsedBulkItems = useMemo<ExtractedVoucher[]>(() => {
    if (!bulkText.trim()) return [];
    
    const lines = bulkText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    
    return lines.map(line => {
      if (bulkMode === "fixed") {
        // Just extract codes (one per line, ignore standard separators)
        // Clean trailing/leading spaces or punctuation but keep code
        const cleanedCode = line.replace(/[:=,\s-]+/g, "").trim().toUpperCase();
        return {
          code: cleanedCode,
          duration: bulkDuration,
          price: normalizePriceInput(bulkPrice)
        };
      } else {
        // Delimited mode: expect "CODE, DURATION, PRICE" or "CODE DURATION PRICE"
        // Try parsing by splitting comma, semicolon or tabs
        let parts = line.split(/[;,\t]+/).map(p => p.trim());
        if (parts.length < 2) {
          // Fallback to space split
          parts = line.split(/\s+/).map(p => p.trim());
        }

        const rawCode = parts[0] || "";
        const rawDur = parts[1] || bulkDuration;
        const rawPrice = parts[2] || bulkPrice;

        return {
          code: rawCode.replace(/[:=,\s-]+/g, "").toUpperCase(),
          duration: normalizeDurationInput(rawDur),
          price: normalizePriceInput(rawPrice)
        };
      }
    }).filter(item => item.code.length >= 3);
  }, [bulkText, bulkMode, bulkDuration, bulkPrice]);

  // --- Handlers ---
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = singleCode.replace(/[:=,\s-]+/g, "").trim().toUpperCase();
    if (cleanCode.length < 3) {
      const msg = "Voucher code must be at least 3 characters.";
      setStatusMessage({ type: "error", text: msg });
      addToast(msg, "warning");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const payload: ExtractedVoucher[] = [{
        code: cleanCode,
        duration: singleDuration,
        price: normalizePriceInput(singlePrice)
      }];

      await onExtracted(payload, "Manual Input");
      setSingleCode("");
      setStatusMessage({ type: "success", text: "Voucher successfully inputted into database!" });
    } catch (err: any) {
      const msg = err.message || "Failed to input voucher";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (parsedBulkItems.length === 0) {
      const msg = "No valid voucher codes detected in bulk list.";
      setStatusMessage({ type: "error", text: msg });
      addToast(msg, "warning");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await onExtracted(parsedBulkItems, "Manual Bulk Paste");
      setBulkText("");
      setStatusMessage({ type: "success", text: `Successfully inputted ${parsedBulkItems.length} vouchers into database!` });
    } catch (err: any) {
      const msg = err.message || "Failed to input bulk vouchers";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-none overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Top Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 flex-shrink-0">
        <button
          onClick={() => { setActiveTab("manual"); setStatusMessage(null); }}
          className={`flex-1 py-4 px-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "manual" 
              ? "border-blue-500 bg-slate-900 text-white" 
              : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <Keyboard className="w-4 h-4" />
          <span className="hidden sm:inline">Manual Code</span>
        </button>
        <button
          onClick={() => { setActiveTab("bulk"); setStatusMessage(null); }}
          className={`flex-1 py-4 px-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "bulk" 
              ? "border-blue-500 bg-slate-900 text-white" 
              : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span className="hidden sm:inline">Bulk Paste</span>
        </button>
      </div>

      {/* Main Form Content Area */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        
        {/* TAB 2: SINGLE MANUAL INPUT */}
        {activeTab === "manual" && (
          <form onSubmit={handleSingleSubmit} className="space-y-5">
            <div className="space-y-1">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200">Input Single Voucher</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">Insert individual record directly to database</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Voucher Code / PIN</label>
                <input
                  type="text"
                  required
                  placeholder="E.G. A1B2C3D4"
                  value={singleCode}
                  onChange={(e) => setSingleCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-3 text-sm font-mono tracking-widest focus:outline-none focus:border-blue-500 rounded-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Duration</label>
                  <select
                    value={singleDuration}
                    onChange={(e) => handleSingleDurationChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-3 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-blue-500 rounded-none appearance-none cursor-pointer"
                  >
                    {DURATION_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                    <option value="custom">Custom Value</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Price Rate</label>
                  <input
                    type="text"
                    required
                    placeholder="Php 5.00"
                    value={singlePrice}
                    onChange={(e) => setSinglePrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-3 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-blue-500 rounded-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !singleCode.trim()}
              className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 dark:text-slate-400 text-white text-[10px] font-bold tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-2 rounded-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  SAVING_RECORD...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Save to Database
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 3: BULK CODES PASTE */}
        {activeTab === "bulk" && (
          <div className="space-y-5 flex flex-col h-full">
            <div className="space-y-1">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200">Bulk Paste Vouchers</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">Input multiple vouchers in one bulk batch</p>
            </div>

            {/* Config Panel */}
            <div className="bg-slate-950/40 border border-slate-800/80 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Pasting Mode</span>
                <div className="flex bg-slate-950 border border-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setBulkMode("fixed")}
                    className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                      bulkMode === "fixed" ? "bg-blue-600 text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    Code List
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode("delimited")}
                    className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                      bulkMode === "delimited" ? "bg-blue-600 text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    Spreadsheet Paste
                  </button>
                </div>
              </div>

              {bulkMode === "fixed" ? (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Apply Duration</label>
                    <select
                      value={bulkDuration}
                      onChange={(e) => handleBulkDurationChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                    >
                      {DURATION_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Apply Price</label>
                    <input
                      type="text"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-2 text-[10px] font-bold uppercase tracking-wider focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 p-2.5 bg-blue-950/20 border border-blue-900/30 text-slate-300 rounded-none text-[10px] font-medium leading-relaxed">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p>
                    Paste data directly from tables. Each line should contain: <strong>CODE, DURATION, PRICE</strong> separated by commas or spaces.
                  </p>
                </div>
              )}
            </div>

            {/* Input Text Area */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Paste Voucher Codes</label>
              <textarea
                rows={5}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={
                  bulkMode === "fixed"
                    ? "Example:\nA1B2C3D4\nE5F6G7H8\nI9J0K1L2"
                    : "Example:\nA1B2C3D4, 1 Hour, Php 5.00\nE5F6G7H8, 3 Hours, Php 10.00"
                }
                className="w-full bg-slate-950 border border-slate-800 p-3 text-xs font-mono tracking-wider focus:outline-none focus:border-blue-500 rounded-none h-28 resize-none uppercase"
              />
            </div>

            {/* LIVE PARSING PREVIEW WINDOW */}
            {parsedBulkItems.length > 0 && (
              <div className="space-y-2 animate-in fade-in duration-300 max-h-36 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  <span>Detected ({parsedBulkItems.length}) Vouchers</span>
                  <span className="text-emerald-400 font-mono">Live Preview</span>
                </div>
                <div className="border border-slate-800 bg-slate-950 divide-y divide-slate-800 overflow-y-auto max-h-28 text-[11px] font-mono select-none">
                  {parsedBulkItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-900/50">
                      <span className="font-bold text-slate-200 tracking-wider">{item.code}</span>
                      <div className="flex gap-4 text-slate-500 dark:text-slate-400 text-[10px]">
                        <span>{item.duration}</span>
                        <span>{item.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleBulkSubmit}
              disabled={isSubmitting || parsedBulkItems.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 dark:text-slate-400 text-white text-[10px] font-bold tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-2 rounded-none mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  SAVING_BULK_BATCH...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add {parsedBulkItems.length > 0 ? parsedBulkItems.length : ""} Vouchers to Database
                </>
              )}
            </button>
          </div>
        )}

        {/* FEEDBACK STATUS ALERTS */}
        {statusMessage && (
          <div className={`mt-5 p-3 flex items-center gap-2 border text-[10px] font-mono uppercase ${
            statusMessage.type === "success" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            {statusMessage.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            <p className="flex-1">{statusMessage.text}</p>
          </div>
        )}

        {/* BOTTOM METADATA RAIL */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>REAL_TIME_VALIDATOR_ONLINE</span>
          </div>
          <span>v1.0</span>
        </div>

      </div>
    </div>
  );
}
