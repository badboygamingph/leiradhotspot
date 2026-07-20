import { Upload, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import React, { useState, useRef } from "react";
import { ExtractedVoucher } from "../types";

interface Props {
  onExtracted: (vouchers: ExtractedVoucher[], source: string) => void;
}

export function UploadZone({ onExtracted }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const endpoint = file.type === "application/pdf" ? "/api/vouchers/extract-pdf" : "/api/vouchers/extract-excel";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      onExtracted(data.vouchers, file.name);
    } catch (err: any) {
      setError(err.message || "Failed to process file");
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-16 h-16 border-2 border-dashed flex items-center justify-center mb-6 transition-all cursor-pointer ${
          isUploading ? "border-blue-500 animate-pulse bg-blue-500/10" : "border-slate-700 hover:border-blue-500 group"
        }`}
      >
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          accept=".pdf,.xlsx,.xls"
          onChange={onFileChange}
          disabled={isUploading}
        />
        {isUploading ? (
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        ) : (
          <div className="w-8 h-8 bg-blue-600 opacity-50 group-hover:opacity-100 transition-opacity"></div>
        )}
      </div>

      <h3 className="text-lg font-bold mb-2 tracking-tight">
        {isUploading ? "PARSING_DATA..." : "Import Vouchers"}
      </h3>
      <p className="text-slate-400 dark:text-slate-500 text-[10px] mb-8 leading-relaxed px-4 uppercase tracking-widest font-bold opacity-60">
        Drag and drop code lists. Automated engine will parse into database.
      </p>
      
      <button 
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full py-3 rounded-none text-[10px] font-bold tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-2 ${
          isUploading 
          ? "bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed" 
          : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10"
        }`}
      >
        {isUploading ? "PROCESSING" : "Select Batch File"}
      </button>

      {error && (
        <div className="mt-6 flex items-center gap-2 p-3 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono uppercase">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        <ShieldCheck className="w-3 h-3 text-emerald-500" /> SECURE_PARSER_ACTIVE
      </div>
    </div>
  );
}
