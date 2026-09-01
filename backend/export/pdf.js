// =========================================================================
// FAIL: api/export/pdf.js
// FUNGSI: POST /api/export/pdf — Endpoint untuk PDF Export
// NOTA: Ini adalah placeholder. Biasanya jspdf akan dijalankan di frontend,
// tetapi jika perlu server-side PDF generation, boleh diletakkan di sini.
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  try {
    // Pada masa ini, penjanaan PDF dibuat di bahagian klien (frontend) melalui fail js/exports.js 
    // menggunakan jspdf dan html2canvas untuk menjimatkan kos Vercel Serverless Function execution.
    // Jika perlukan Server-side PDF generation (contoh: puppeteer/pdfkit), ia boleh ditambah di sini.
    
    return sendSuccess(res, { message: 'Gunakan client-side export' }, 'OK');

  } catch (e) {
    console.error('PDF export error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
