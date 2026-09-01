// =========================================================================
// FAIL: api/supabase-client.js
// FUNGSI: Helper untuk inisialisasi Supabase client (digunakan oleh semua API)
// =========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Ambil rahsia dari Vercel Environment Variables
const SUPABASE_URL = process.env.RAHSIA_URL_SUPABASE;
const SUPABASE_KEY = process.env.RAHSIA_KEY_SUPABASE; // service_role key

/**
 * Cipta Supabase client dengan service_role key
 * PENTING: Guna service_role key SAHAJA di server-side (Vercel Functions)
 * JANGAN sekali-kali dedahkan key ini ke frontend!
 */
export function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase credentials tidak dijumpai dalam environment variables.');
  }

  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Set CORS headers untuk semua API responses
 * Membenarkan frontend dari mana-mana origin (atau spesifik domain)
 */
export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Handle preflight OPTIONS request
 */
export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Wrapper respons berjaya
 */
export function sendSuccess(res, data = {}, message = 'Berjaya') {
  setCorsHeaders(res);
  return res.status(200).json({ success: true, message, ...data });
}

/**
 * Wrapper respons gagal
 */
export function sendError(res, message = 'Ralat pelayan', status = 400) {
  setCorsHeaders(res);
  return res.status(status).json({ success: false, message });
}
