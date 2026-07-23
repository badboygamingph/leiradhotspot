import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
// Removed static vite import
import { GoogleGenAI } from "@google/genai";
import * as xlsx from "xlsx";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");
const pdf = typeof pdfParseModule === "function" ? pdfParseModule : (pdfParseModule.default || pdfParseModule);
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// Initialize Supabase client lazily
let supabaseClient: any = null;
function getSupabase() {
  if (!supabaseClient) {
    let supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || supabaseUrl === "" || !supabaseKey || supabaseKey === "") {
      const error = new Error("SUPABASE_CONFIGURATION_MISSING: Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Settings menu.");
      (error as any).code = "ERR_MISSING_CONFIG";
      throw error;
    }

    // Auto-format if only the project ref was provided
    if (!supabaseUrl.startsWith('http')) {
      supabaseUrl = `https://${supabaseUrl.trim()}.supabase.co`;
    }
    
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
    } catch (e: any) {
      console.error("Failed to initialize Supabase client:", e.message);
      throw new Error(`SUPABASE_INITIALIZATION_ERROR: ${e.message}`);
    }
  }
  return supabaseClient;
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

function normalizeDuration(d: string): string {
  if (!d) return "";
  const normalized = d.toLowerCase().trim();
  
  // Look for standard hour indicators
  const hrMatch = normalized.match(/(\d+)\s*(?:h|hr|hour|hours)/);
  if (hrMatch) return `${hrMatch[1]}h`;
  
  // Look for standard day indicators
  const dayMatch = normalized.match(/(\d+)\s*(?:d|day|days)/);
  if (dayMatch) return `${dayMatch[1]}d`;
  
  // Look for standard minute indicators
  const minMatch = normalized.match(/(\d+)\s*(?:m|min|minute|minutes)/);
  if (minMatch) return `${minMatch[1]}m`;

  return normalized;
}

function getMostFrequent(arr: string[]): string {
  if (arr.length === 0) return "";
  const counts: Record<string, number> = {};
  let maxCount = 0;
  let mostFrequent = arr[0];
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
    if (counts[item] > maxCount) {
      maxCount = counts[item];
      mostFrequent = item;
    }
  }
  return mostFrequent;
}

function normalizePriceStr(p: string): string {
  if (!p) return "";
  const clean = p.replace(/,/g, '');
  const m = clean.match(/\d+(?:\.\d{2})?/);
  if (m) {
    const val = parseFloat(m[0]);
    if (!isNaN(val)) {
      return `Php ${val.toFixed(2)}`;
    }
  }
  return p;
}

function parseVoucherText(text: string): { code: string; duration: string; price: string }[] {
  const vouchers: { code: string; duration: string; price: string }[] = [];
  if (!text) return vouchers;

  console.log("Deterministic Proximity Parser: Received text with length:", text.length);

  // Match durations like 1h, 3h, 1hr, 3hr, 1d, 30d, etc.
  const durationRegex = /\b(\d+)\s*(?:h|hr|hour|hours|d|day|days|mo|month|months|m|min|mins|minute|minutes|HR|D|H|M|DAY|HOUR)\b/gi;
  // Match prices like Php 5.00, 5.00, ₱10, Php20 etc.
  const priceRegex = /(?:Php|PHP|₱|\$|Price|Harga)\s*[:=]?\s*(\d+(?:\.\d{2})?)\b|\b(\d+\.\d{2})\s*(?:Php|PHP|₱|pesos)?\b/gi;

  const uiWords = new Set([
    "code", "kode", "pin", "user", "username", "pass", "password", "login", "logout", 
    "wifi", "hotspot", "internet", "status", "time", "date", "price", "harga", "duration", 
    "durasi", "speed", "limit", "active", "masa", "aktif", "member", "voucher", "vouchers", 
    "page", "site", "portal", "access", "network", "address", "ip", "dns", "gateway", 
    "net", "system", "admin", "support", "phone", "contact", "welcome", "connect", 
    "connection", "select", "type", "valid", "validity", "expired", "expiry", "bytes", 
    "traffic", "download", "upload", "leirad", "hotspot", "voucher", "profile", "pesos", 
    "peso", "php", "usd", "gb", "mb", "kb", "hours", "hour", "days", "day", "months", 
    "month", "minutes", "minute", "mins", "min", "sec", "seconds", "second", "card", "cards", 
    "limit-uptime", "uptime", "limit-bytes", "bytes-out", "bytes-in", "session", "id", 
    "serial", "number", "no", "qty", "total", "subtotal", "tax", "payment", "cash", 
    "change", "receipt", "invoice", "date", "created", "by", "mikhmon", "userman", "user-manager"
  ]);

  const isCandidateCode = (word: string): boolean => {
    const cleaned = word.replace(/[:=,\s-]+/g, '').trim();
    if (cleaned.length < 3 || cleaned.length > 20) return false;
    if (uiWords.has(cleaned.toLowerCase())) return false;
    
    // Check if it matches a duration format
    if (cleaned.toLowerCase().match(/^\d+\s*(?:h|hr|d|m)$/)) return false;
    
    // If it's pure number, let's allow it if it's 4 to 12 digits (like numeric PINs)
    if (/^\d+$/.test(cleaned)) {
      return cleaned.length >= 4 && cleaned.length <= 12;
    }
    
    // Alphanumeric with at least some letters or letters and numbers
    return /^[a-zA-Z0-9_-]+$/.test(cleaned);
  };

  const durations: { value: string; index: number }[] = [];
  const prices: { value: string; index: number }[] = [];
  const codes: { value: string; index: number; confidence: number }[] = [];

  // 1. Extract all durations
  let match;
  durationRegex.lastIndex = 0;
  while ((match = durationRegex.exec(text)) !== null) {
    durations.push({
      value: match[0],
      index: match.index
    });
  }

  // 2. Extract all prices
  priceRegex.lastIndex = 0;
  while ((match = priceRegex.exec(text)) !== null) {
    prices.push({
      value: match[0],
      index: match.index
    });
  }

  // Standalone numbers with decimal like 5.00, 10.00
  const standalonePriceRegex = /\b\d+\.\d{2}\b/g;
  while ((match = standalonePriceRegex.exec(text)) !== null) {
    const val = match[0];
    const idx = match.index;
    const alreadyCaptured = prices.some(p => idx >= p.index && idx < p.index + p.value.length) ||
                            durations.some(d => idx >= d.index && idx < d.index + d.value.length);
    if (!alreadyCaptured) {
      prices.push({
        value: val,
        index: idx
      });
    }
  }

  // Calculate default values based on frequencies
  const normalizedDurations = durations.map(d => normalizeDuration(d.value)).filter(Boolean);
  const defaultDuration = getMostFrequent(normalizedDurations) || "1h";

  const normalizedPrices = prices.map(p => normalizePriceStr(p.value)).filter(Boolean);
  const defaultPrice = getMostFrequent(normalizedPrices) || "Php 5.00";

  // 3. Extract codes based on word boundary matching in the entire text
  const wordRegex = /[a-zA-Z0-9_-]+/g;
  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0];
    const idx = match.index;

    if (!isCandidateCode(word)) continue;

    const isDurationPart = durations.some(d => idx >= d.index && idx < d.index + d.value.length);
    const isPricePart = prices.some(p => idx >= p.index && idx < p.index + p.value.length);
    if (isDurationPart || isPricePart) continue;

    // Preceding search for "code" or "pin" label
    const startIdx = Math.max(0, idx - 25);
    const precedingText = text.substring(startIdx, idx);
    const isLabeled = /(?:code|kode|pin|username|user|voucher|pass|password|upin|p\s*i\s*n)\s*[:=-]?\s*$/i.test(precedingText);

    codes.push({
      value: word,
      index: idx,
      confidence: isLabeled ? 2 : 1
    });
  }

  // 4. Pair codes with closest durations/prices
  const seenCodes = new Set<string>();
  const finalVouchers: { code: string; duration: string; price: string }[] = [];

  for (const code of codes) {
    const normCode = code.value.toUpperCase();
    if (seenCodes.has(normCode)) continue;
    seenCodes.add(normCode);

    // Find closest duration within proximity threshold
    let closestDuration = defaultDuration;
    let minDurDist = Infinity;
    for (const d of durations) {
      const dist = Math.abs(code.index - d.index);
      if (dist < minDurDist && dist < 300) {
        minDurDist = dist;
        closestDuration = d.value;
      }
    }

    // Find closest price within proximity threshold
    let closestPrice = defaultPrice;
    let minPriceDist = Infinity;
    for (const p of prices) {
      const dist = Math.abs(code.index - p.index);
      if (dist < minPriceDist && dist < 300) {
        minPriceDist = dist;
        closestPrice = p.value;
      }
    }

    const finalDur = normalizeDuration(closestDuration) || defaultDuration;
    const finalPrice = normalizePriceStr(closestPrice) || defaultPrice;

    finalVouchers.push({
      code: code.value,
      duration: finalDur,
      price: finalPrice
    });
  }

  console.log(`Deterministic Parser: Extracted ${finalVouchers.length} unique vouchers with defaults (${defaultDuration}, ${defaultPrice})`);
  return finalVouchers;
}

// API Routes
app.post("/api/vouchers/extract-pdf", upload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Parse PDF directly to text
    const data = await pdf(req.file.buffer);
    const parsedVouchers = parseVoucherText(data.text || "");

    res.json({ vouchers: parsedVouchers });
  } catch (error: any) {
    console.error("PDF Deterministic Extraction Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/vouchers/extract-excel", upload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    let vouchers: { code: string; duration: string; price: string }[] = [];

    // Phase 1: Header-based extraction with flexible keyword detection
    const data: any[] = xlsx.utils.sheet_to_json(worksheet);
    if (data.length > 0) {
      vouchers = data.map((row: any) => {
        let code = "";
        let duration = "";
        let price = "";

        for (const key of Object.keys(row)) {
          const lowerKey = key.toLowerCase().replace(/[\s_-]/g, "");
          const val = String(row[key] !== undefined && row[key] !== null ? row[key] : "").trim();

          if (!code && (
            lowerKey === "code" || 
            lowerKey === "voucher" || 
            lowerKey === "vouchercode" || 
            lowerKey === "username" || 
            lowerKey === "user" || 
            lowerKey === "pin" || 
            lowerKey === "password" || 
            lowerKey === "pass" || 
            lowerKey === "kode" || 
            lowerKey === "kodevoucher" ||
            lowerKey.includes("code") ||
            lowerKey.includes("kode") ||
            lowerKey.includes("pin")
          )) {
            code = val;
          } else if (!duration && (
            lowerKey === "duration" || 
            lowerKey === "durasi" || 
            lowerKey === "time" || 
            lowerKey === "limit" || 
            lowerKey === "limituptime" || 
            lowerKey === "uptime" ||
            lowerKey.includes("dur") ||
            lowerKey.includes("time") ||
            lowerKey.includes("limit")
          )) {
            duration = val;
          } else if (!price && (
            lowerKey === "price" || 
            lowerKey === "harga" || 
            lowerKey === "rate" || 
            lowerKey === "amount" ||
            lowerKey.includes("price") ||
            lowerKey.includes("harga")
          )) {
            price = val;
          }
        }
        return { code, duration, price };
      }).filter(v => v.code && v.code.trim().length >= 3);
    }

    // Phase 2: Fallback to a 2D row array for sheets without standard headers
    if (vouchers.length === 0) {
      const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      for (const row of rows) {
        if (!row || row.length === 0) continue;
        const rowVals = row.map(cell => String(cell !== undefined && cell !== null ? cell : "").trim());

        let foundCode = "";
        let foundDuration = "";
        let foundPrice = "";

        for (const val of rowVals) {
          if (!val) continue;
          if (val.toLowerCase().match(/\b(\d+)\s*(?:h|hr|hour|hours|d|day|days|m|min|mins|minute|minutes)\b/)) {
            foundDuration = val;
          } else if (val.toLowerCase().match(/(?:php|₱|\$)\s*\d+|\b\d+\.\d{2}\b/)) {
            foundPrice = val;
          } else if (val.length >= 3 && val.length <= 16 && /^[a-zA-Z0-9_-]+$/.test(val)) {
            const low = val.toLowerCase();
            const uiWords = ["code", "kode", "pin", "user", "pass", "time", "date", "name", "price", "wifi", "rate", "limit", "voucher"];
            if (!uiWords.includes(low)) {
              foundCode = val;
            }
          }
        }

        if (foundCode) {
          vouchers.push({
            code: foundCode,
            duration: foundDuration,
            price: foundPrice
          });
        }
      }
    }

    // Normalize duration and price strings inside extracted list
    const normalizedVouchers = vouchers.map(v => ({
      code: v.code.trim(),
      duration: normalizeDuration(v.duration),
      price: normalizePriceStr(v.price)
    }));

    console.log(`Excel Extractor: Extracted ${normalizedVouchers.length} vouchers from spreadsheet.`);
    res.json({ vouchers: normalizedVouchers });
  } catch (error: any) {
    console.error("Excel Extraction Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for local vouchers fallback
const LOCAL_VOUCHERS_FILE = path.join(process.cwd(), "vouchers.json");

function getLocalVouchers(): any[] {
  try {
    if (fs.existsSync(LOCAL_VOUCHERS_FILE)) {
      const content = fs.readFileSync(LOCAL_VOUCHERS_FILE, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.warn("Failed to read local vouchers:", e);
  }
  return [];
}

function saveLocalVouchers(vouchers: any[]) {
  try {
    fs.writeFileSync(LOCAL_VOUCHERS_FILE, JSON.stringify(vouchers, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to save local vouchers:", e);
  }
}

// Helper functions for import logs local fallback
const LOCAL_LOGS_FILE = path.join(process.cwd(), "hotspot_import_logs.json");

function getLocalLogs(): any[] {
  try {
    if (fs.existsSync(LOCAL_LOGS_FILE)) {
      const content = fs.readFileSync(LOCAL_LOGS_FILE, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.warn("Failed to read local fallback logs:", e);
  }
  return [];
}

function saveLocalLogs(logs: any[]) {
  try {
    fs.writeFileSync(LOCAL_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to save local fallback logs:", e);
  }
}

function cleanExpiredLogs(logs: any[]): any[] {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return logs.filter((log: any) => {
    const logTime = new Date(log.date).getTime();
    return !isNaN(logTime) && logTime >= thirtyDaysAgo;
  });
}

// Supabase API Routes
app.get("/api/vouchers/stats", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: availableData, error: availableError, count: availableCount } = await supabase
      .from('vouchers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available');

    const { data: redeemedData, error: redeemedError, count: redeemedCount } = await supabase
      .from('vouchers')
      .select('*', { count: 'exact', head: true })
      .in('status', ['used', 'redeemed']);

    if (availableError || redeemedError) throw availableError || redeemedError;

    res.json({
      available: availableCount || 0,
      used: redeemedCount || 0
    });
  } catch (error: any) {
    console.warn("Voucher Stats Fallback Triggered (using local storage):", error.message || error);
    const local = getLocalVouchers();
    const available = local.filter(v => v.status === 'available').length;
    const used = local.filter(v => v.status === 'redeemed' || v.status === 'used').length;
    res.json({ available, used });
  }
});

app.post("/api/vouchers/save", async (req, res) => {
  try {
    const { vouchers } = req.body;
    if (!vouchers || !Array.isArray(vouchers)) {
      return res.status(400).json({ error: "Invalid vouchers data" });
    }

    // Filter, clean, and deduplicate locally first
    const seenLocal = new Set<string>();
    const formattedVouchers = vouchers
      .map(v => ({
        code: v.code ? v.code.trim() : "",
        duration: normalizeDuration(v.duration),
        price: v.price ? v.price.trim() : "",
        status: 'available'
      }))
      .filter(v => {
        if (!v.code || v.code.length < 3) return false;
        const upperCode = v.code.toUpperCase();
        if (seenLocal.has(upperCode)) return false;
        seenLocal.add(upperCode);
        return true;
      });

    if (formattedVouchers.length === 0) {
      return res.json({ success: true, count: 0, message: "No new valid vouchers to save." });
    }

    // Always mirror to local file for dual-write and robustness
    const local = getLocalVouchers();
    const existingLocalCodes = new Set(local.map(v => v.code.toUpperCase()));
    const finalToInsertLocal = formattedVouchers.filter(v => !existingLocalCodes.has(v.code.toUpperCase()));
    
    const nowStr = new Date().toISOString();
    const newLocalVouchers = finalToInsertLocal.map(v => ({
      id: crypto.randomUUID(),
      code: v.code,
      duration: v.duration,
      price: v.price,
      status: 'available',
      created_at: nowStr,
      redeemed_at: null
    }));
    
    if (newLocalVouchers.length > 0) {
      local.push(...newLocalVouchers);
      saveLocalVouchers(local);
    }

    try {
      const codesToInsert = formattedVouchers.map(v => v.code);
      const supabase = getSupabase();

      // Fetch existing vouchers to prevent duplicates
      const { data: existing, error: fetchError } = await supabase
        .from('vouchers')
        .select('code')
        .in('code', codesToInsert);

      if (fetchError) throw fetchError;

      const existingCodes = new Set(existing?.map(e => e.code.toUpperCase()) || []);
      const finalToInsert = formattedVouchers.filter(v => !existingCodes.has(v.code.toUpperCase()));

      if (finalToInsert.length === 0) {
        return res.json({ success: true, count: 0, message: "All vouchers already exist in the database." });
      }

      const { data, error } = await supabase
        .from('vouchers')
        .insert(finalToInsert)
        .select();

      if (error) throw error;

      const insertedCount = data ? data.length : finalToInsert.length;
      return res.json({ success: true, count: insertedCount, source: 'Supabase' });
    } catch (dbError: any) {
      console.warn("Supabase Save Fallback Triggered (saved locally):", dbError.message || dbError);
      return res.json({ success: true, count: newLocalVouchers.length, source: 'local_fallback' });
    }
  } catch (error: any) {
    console.warn("Save Error Fallback Triggered:", error.message || error);
    res.json({ success: true, count: 0, error: error.message });
  }
});

app.get("/api/vouchers", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ vouchers: data });
  } catch (error: any) {
    console.warn("Fetch Vouchers Fallback Triggered (using local storage):", error.message || error);
    const local = getLocalVouchers();
    // Sort descending by created_at
    const sortedLocal = [...local].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ vouchers: sortedLocal, source: 'local_fallback' });
  }
});

app.post("/api/vouchers/redeem", async (req, res) => {
  try {
    const { durationId, turnstileToken } = req.body;

    // Turnstile Validation
    if (!turnstileToken) {
      return res.status(400).json({ error: "Turnstile token is required" });
    }

    const formData = new URLSearchParams();
    formData.append('secret', '0x4AAAAAAD71a2Fi0R2Pl-SdKTIrxk9JvsY');
    formData.append('response', turnstileToken);

    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });

    const turnstileOutcome = await turnstileRes.json();
    if (!turnstileOutcome.success) {
      return res.status(403).json({ error: "Turnstile validation failed" });
    }

    const normalizedId = normalizeDuration(durationId);

    try {
      const supabase = getSupabase();
      
      // Find an available voucher for the duration
      const { data: voucher, error: fetchError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('status', 'available')
        .eq('duration', normalizedId)
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (voucher) {
        // Mark as used
        const { error: updateError } = await supabase
          .from('vouchers')
          .update({ 
            status: 'redeemed',
            redeemed_at: new Date().toISOString()
          })
          .eq('id', voucher.id);

        if (updateError) throw updateError;

        // Sync to local fallback
        const local = getLocalVouchers();
        const foundLocal = local.find(v => v.code.toUpperCase() === voucher.code.toUpperCase());
        if (foundLocal) {
          foundLocal.status = 'redeemed';
          foundLocal.redeemed_at = new Date().toISOString();
          saveLocalVouchers(local);
        }

        return res.json({ code: voucher.code, duration: voucher.duration, source: 'Supabase' });
      }
    } catch (dbError: any) {
      console.warn("Supabase Redemption Fallback Triggered (using local storage):", dbError.message || dbError);
    }

    // Local fallback redemption
    const local = getLocalVouchers();
    const foundLocalIndex = local.findIndex(v => v.status === 'available' && normalizeDuration(v.duration) === normalizedId);
    
    if (foundLocalIndex === -1) {
      return res.status(404).json({ error: `No available vouchers for ${durationId}` });
    }

    const localVoucher = local[foundLocalIndex];
    localVoucher.status = 'redeemed';
    localVoucher.redeemed_at = new Date().toISOString();
    saveLocalVouchers(local);

    res.json({ code: localVoucher.code, duration: localVoucher.duration, source: 'local_fallback' });
  } catch (error: any) {
    console.warn("Redemption Error Fallback Triggered:", error.message || error);
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/vouchers/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const dbStatus = status === 'used' ? 'redeemed' : status;

    // Update locally first
    const local = getLocalVouchers();
    const foundLocal = local.find(v => v.id.toString() === id.toString() || v.code.toUpperCase() === id.toUpperCase());
    if (foundLocal) {
      foundLocal.status = dbStatus;
      if (dbStatus === 'redeemed') {
        foundLocal.redeemed_at = new Date().toISOString();
      }
      saveLocalVouchers(local);
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('vouchers')
        .update({ status: dbStatus })
        .eq('id', id);

      if (error) {
        // If ID is not UUID (like in local file fallback), we can try matching by code
        const { error: codeError } = await supabase
          .from('vouchers')
          .update({ status: dbStatus })
          .eq('code', id);
        if (codeError) throw codeError;
      }
    } catch (dbError: any) {
      console.warn("Supabase Update Status Fallback Triggered (updated locally):", dbError.message || dbError);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.warn("Update Status Error Fallback Triggered:", error.message || error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/vouchers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Delete locally first
    let local = getLocalVouchers();
    local = local.filter(v => v.id.toString() !== id.toString() && v.code.toUpperCase() !== id.toUpperCase());
    saveLocalVouchers(local);

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', id);

      if (error) {
        const { error: codeError } = await supabase
          .from('vouchers')
          .delete()
          .eq('code', id);
        if (codeError) throw codeError;
      }
    } catch (dbError: any) {
      console.warn("Supabase Delete Fallback Triggered (deleted locally):", dbError.message || dbError);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.warn("Delete Voucher Error Fallback Triggered:", error.message || error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/vouchers/clear", async (req, res) => {
  try {
    // Clear locally first
    saveLocalVouchers([]);

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
    } catch (dbError: any) {
      console.warn("Supabase Clear Fallback Triggered (cleared locally):", dbError.message || dbError);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.warn("Clear Vouchers Error Fallback Triggered:", error.message || error);
    res.status(500).json({ error: error.message });
  }
});

// Supabase Hotspot Import Logs API endpoints
app.get("/api/logs", async (req, res) => {
  try {
    const supabase = getSupabase();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Trigger automatic database deletion of logs older than 30 days
    try {
      await supabase
        .from('hotspot_import_logs')
        .delete()
        .lt('date', thirtyDaysAgo);
    } catch (e: any) {
      console.warn("Auto-cleanup of old logs in Supabase failed or table does not exist yet:", e.message || e);
    }

    // 2. Fetch active logs from Supabase hotspot_import_logs table
    const { data, error } = await supabase
      .from('hotspot_import_logs')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn("Supabase table 'hotspot_import_logs' query failed, falling back to local file:", error.message || error);
      const localLogs = cleanExpiredLogs(getLocalLogs());
      saveLocalLogs(localLogs);
      return res.json({ logs: localLogs, source: 'local_fallback', notice: "Supabase table 'hotspot_import_logs' query failed. Falling back to local file." });
    }

    // Format logs from DB to match system interface
    const formattedLogs = (data || []).map((log: any) => ({
      id: log.id,
      filename: log.filename,
      count: log.count,
      date: log.date,
      actionType: log.action_type || log.actionType,
      details: log.details
    }));

    res.json({ logs: formattedLogs, source: 'Supabase' });
  } catch (error: any) {
    console.warn("Fetch Logs Fallback Triggered (Supabase unconfigured or connection issue):", error.message || error);
    const localLogs = cleanExpiredLogs(getLocalLogs());
    saveLocalLogs(localLogs);
    res.json({ logs: localLogs, source: 'local_fallback', error: error.message });
  }
});

app.post("/api/logs", async (req, res) => {
  try {
    const { id, filename, count, date, actionType, details } = req.body;
    
    const logItem = {
      id: id || crypto.randomUUID(),
      filename: filename || "System Event",
      count: count || 0,
      date: date || new Date().toISOString(),
      action_type: actionType,
      details: details || ""
    };

    // Save to local fallback file for synchronization/durability
    const localLogs = getLocalLogs();
    localLogs.unshift({
      id: logItem.id,
      filename: logItem.filename,
      count: logItem.count,
      date: logItem.date,
      actionType: logItem.action_type,
      details: logItem.details
    });
    saveLocalLogs(cleanExpiredLogs(localLogs));

    // Try inserting into Supabase
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('hotspot_import_logs')
        .insert([logItem]);

      if (error) {
        console.warn("Supabase hotspot_import_logs insert failed, saved to local fallback:", error.message || error);
        return res.json({ success: true, source: 'local_fallback', notice: "Saved to local fallback file." });
      }
    } catch (dbError: any) {
      console.warn("Supabase not available for insert, saved to local fallback:", dbError.message || dbError);
      return res.json({ success: true, source: 'local_fallback', notice: "Saved to local fallback file." });
    }

    res.json({ success: true, source: 'Supabase' });
  } catch (error: any) {
    console.warn("Save Log Fallback Triggered (Saved to local fallback):", error.message || error);
    res.json({ success: true, source: 'local_fallback', error: error.message });
  }
});

// GET endpoint to securely fetch Supabase environment variables for the Settings page
app.get("/api/supabase-config", (req, res) => {
  try {
    res.json({
      url: process.env.SUPABASE_URL || "",
      anonKey: process.env.SUPABASE_ANON_KEY || "",
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Route Catch-all (must be after all API routes and before Vite)
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Vite Middleware for Dev/Prod
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

if (process.env.VERCEL !== "1") {
  setupVite().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;
