// Self-contained Vercel serverless handler (plain JS/CommonJS compatible)
// This avoids all ESM/CJS/tsconfig conflicts from the Vite-targeted tsconfig

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// ── Supabase ──────────────────────────────────────────────────────────────────
let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    let url = process.env.SUPABASE_URL || 'https://xzkxqatkhxeclmuzfhmc.supabase.co';
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6a3hxYXRraHhlY2xtdXpmaG1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ5MTI0NiwiZXhwIjoyMTAwMDY3MjQ2fQ.LU5aAP4_zaDbZawNTOLqJURtCNqR54HhPTgB6Hs80z8';

    if (url && !url.startsWith('http')) {
      url = `https://${url.trim()}.supabase.co`;
    }

    try {
      supabaseClient = createClient(url, key);
    } catch (e) {
      console.error('Supabase init error:', e);
      throw new Error(`Failed to initialize Supabase: ${e.message}`);
    }
  }
  return supabaseClient;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeDuration(d) {
  if (!d) return '';
  const n = d.toLowerCase().trim();
  const hr = n.match(/(\d+)\s*(?:h|hr|hour|hours)/);
  if (hr) return `${hr[1]}h`;
  const day = n.match(/(\d+)\s*(?:d|day|days)/);
  if (day) return `${day[1]}d`;
  const min = n.match(/(\d+)\s*(?:m|min|minute|minutes)/);
  if (min) return `${min[1]}m`;
  return n;
}

function normalizePriceStr(p) {
  if (!p) return '';
  const clean = p.replace(/,/g, '');
  const m = clean.match(/\d+(?:\.\d{2})?/);
  if (m) {
    const val = parseFloat(m[0]);
    if (!isNaN(val)) return `Php ${val.toFixed(2)}`;
  }
  return p;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Supabase config (for frontend settings page)
app.get('/api/supabase-config', (_req, res) => {
  res.json({
    url: process.env.SUPABASE_URL || 'https://xzkxqatkhxeclmuzfhmc.supabase.co',
    anonKey:
      process.env.SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6a3hxYXRraHhlY2xtdXpmaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTEyNDYsImV4cCI6MjEwMDA2NzI0Nn0.vhdZSSbgw-KGm3vaa27jEPXSDbc2al838rAGyqpm32k',
    serviceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6a3hxYXRraHhlY2xtdXpmaG1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ5MTI0NiwiZXhwIjoyMTAwMDY3MjQ2fQ.LU5aAP4_zaDbZawNTOLqJURtCNqR54HhPTgB6Hs80z8',
  });
});

// Voucher stats
app.get('/api/vouchers/stats', async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { count: availableCount, error: e1 } = await supabase
      .from('vouchers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available');
    if (e1) throw e1;

    const { count: usedCount, error: e2 } = await supabase
      .from('vouchers')
      .select('*', { count: 'exact', head: true })
      .in('status', ['used', 'redeemed']);
    if (e2) throw e2;

    res.json({ available: availableCount || 0, used: usedCount || 0 });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get all vouchers (handles >1000 by looping)
app.get('/api/vouchers', async (_req, res) => {
  try {
    const supabase = getSupabase();
    let allData = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + step - 1);
      
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      allData.push(...data);
      if (data.length < step) break;
      from += step;
    }
    
    res.json({ vouchers: allData });
  } catch (err) {
    console.error('Vouchers error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Save vouchers
app.post('/api/vouchers/save', async (req, res) => {
  try {
    const { vouchers } = req.body;
    if (!vouchers || !Array.isArray(vouchers)) {
      return res.status(400).json({ error: 'Invalid vouchers data' });
    }

    const seen = new Set();
    const formatted = vouchers
      .map(v => ({
        code: v.code ? v.code.trim() : '',
        duration: normalizeDuration(v.duration),
        price: v.price ? normalizePriceStr(v.price) : '',
        status: 'available',
      }))
      .filter(v => {
        if (!v.code || v.code.length < 3) return false;
        const up = v.code.toUpperCase();
        if (seen.has(up)) return false;
        seen.add(up);
        return true;
      });

    if (formatted.length === 0) {
      return res.json({ success: true, count: 0, message: 'No new valid vouchers.' });
    }

    // Check for duplicates in chunks to avoid URL length limits
    const supabase = getSupabase();
    const existingCodes = new Set();
    const chunkSize = 500;
    const codeList = formatted.map(v => v.code);
    
    for (let i = 0; i < codeList.length; i += chunkSize) {
      const chunk = codeList.slice(i, i + chunkSize);
      const { data: existing, error: fetchErr } = await supabase
        .from('vouchers')
        .select('code')
        .in('code', chunk);
      if (fetchErr) throw fetchErr;
      if (existing) {
        existing.forEach(e => existingCodes.add(e.code.toUpperCase()));
      }
    }

    const toInsert = formatted.filter(v => !existingCodes.has(v.code.toUpperCase()));

    if (toInsert.length === 0) {
      return res.json({ success: true, count: 0, message: 'All vouchers already exist.' });
    }

    // Insert in chunks to avoid payload limits
    let insertedCount = 0;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const { data, error } = await supabase.from('vouchers').insert(chunk).select();
      if (error) throw error;
      if (data) insertedCount += data.length;
    }

    res.json({ success: true, count: insertedCount });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Redeem a voucher
app.post('/api/vouchers/redeem', async (req, res) => {
  try {
    const { durationId } = req.body;
    const normalizedId = normalizeDuration(durationId);

    const supabase = getSupabase();
    const { data: voucher, error: fetchErr } = await supabase
      .from('vouchers')
      .select('*')
      .eq('status', 'available')
      .eq('duration', normalizedId)
      .limit(1)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (!voucher) {
      return res.status(404).json({ error: `No available vouchers for ${durationId}` });
    }

    const { error: updateErr } = await supabase
      .from('vouchers')
      .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
      .eq('id', voucher.id);
    if (updateErr) throw updateErr;

    res.json({ code: voucher.code, duration: voucher.duration });
  } catch (err) {
    console.error('Redeem error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Update voucher status
app.patch('/api/vouchers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const dbStatus = status === 'used' ? 'redeemed' : status;

    const supabase = getSupabase();
    let { error } = await supabase
      .from('vouchers')
      .update({ status: dbStatus })
      .eq('id', id);
      
    if (error) {
      const { error: codeError } = await supabase
        .from('vouchers')
        .update({ status: dbStatus })
        .eq('code', id);
      if (codeError) throw codeError;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Delete a voucher
app.delete('/api/vouchers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();
    let { error } = await supabase.from('vouchers').delete().eq('id', id);
    
    if (error) {
      const { error: codeError } = await supabase.from('vouchers').delete().eq('code', id);
      if (codeError) throw codeError;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Clear all vouchers
app.post('/api/vouchers/clear', async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('vouchers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Clear error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Get logs
app.get('/api/logs', async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const supabase = getSupabase();

    // Auto-clean old logs (ignore errors if table doesn't exist)
    await supabase.from('hotspot_import_logs').delete().lt('date', thirtyDaysAgo).catch(() => {});

    const { data, error } = await supabase
      .from('hotspot_import_logs')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;

    const logs = (data || []).map(log => ({
      id: log.id,
      filename: log.filename,
      count: log.count,
      date: log.date,
      actionType: log.action_type || log.actionType,
      details: log.details,
    }));

    res.json({ logs });
  } catch (err) {
    console.error('Logs error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Save log
app.post('/api/logs', async (req, res) => {
  try {
    const { id, filename, count, date, actionType, details } = req.body;

    const logItem = {
      id: id || crypto.randomUUID(),
      filename: filename || 'System Event',
      count: count || 0,
      date: date || new Date().toISOString(),
      action_type: actionType,
      details: details || '',
    };

    const supabase = getSupabase();
    const { error } = await supabase.from('hotspot_import_logs').insert([logItem]);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Save log error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Extract Excel
app.post('/api/vouchers/extract-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const xlsx = require('xlsx');
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const vouchers = data.map(row => {
      let code = '', duration = '', price = '';
      for (const key of Object.keys(row)) {
        const lk = key.toLowerCase().replace(/[\s_-]/g, '');
        const val = String(row[key] !== undefined ? row[key] : '').trim();
        if (!code && (lk.includes('code') || lk.includes('kode') || lk.includes('pin') || lk === 'username' || lk === 'user' || lk === 'voucher')) code = val;
        else if (!duration && (lk.includes('dur') || lk.includes('time') || lk.includes('limit'))) duration = val;
        else if (!price && (lk.includes('price') || lk.includes('harga') || lk === 'rate' || lk === 'amount')) price = val;
      }
      return { code, duration, price };
    }).filter(v => v.code && v.code.length >= 3);

    res.json({ vouchers: vouchers.map(v => ({ code: v.code.trim(), duration: normalizeDuration(v.duration), price: normalizePriceStr(v.price) })) });
  } catch (err) {
    console.error('Excel error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Extract PDF
app.post('/api/vouchers/extract-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(req.file.buffer);
    // Basic extraction: find alphanumeric tokens 3-16 chars
    const tokens = (data.text || '').match(/\b[a-zA-Z0-9_-]{4,16}\b/g) || [];
    const uiWords = new Set(['code','pin','user','pass','wifi','hotspot','internet','status','time','date','price','duration','voucher','vouchers','page','admin','support']);
    const codes = [...new Set(tokens.filter(t => !uiWords.has(t.toLowerCase())))];
    res.json({ vouchers: codes.map(c => ({ code: c, duration: '', price: '' })) });
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'PDF parsing failed on this server. Please use Excel format instead.' });
  }
});

// 404 catch-all for unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

module.exports = app;

// Disable Vercel's default body parser to allow multer to work for file uploads
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
