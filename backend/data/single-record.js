// =========================================================================
// FAIL: api/data/single-record.js
// FUNGSI: GET /api/data/single-record — Ambil satu rekod untuk edit
// Gantikan: getSingleRecord dari GAS
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  try {
    const row = req.query?.row || req.body?.row;
    if (!row) return sendError(res, 'ID rekod diperlukan.');

    const supabase = getSupabase();

    const { data: record, error } = await supabase
      .from('Data')
      .select('*')
      .eq('id', row)
      .single();

    if (error || !record) {
      return sendError(res, 'Rekod tidak dijumpai.');
    }

    // Headers
    const headers = [
      'Timestamp', 'Nama', 'Email', 'Tarikh Bancian', 'Negeri', 'Daerah',
      'Lokasi', 'Koordinat', 'Kategori Tanaman', 'Nama Tanaman', 'Varieti',
      'Umur Tanaman', 'Luas Bertanam', 'Luas Serangan', 'Peratus', 'Keterukan',
      'Syor Kawalan', 'IMAGE LINKS (COMMA SEPARATED)', 'Caption', 'Status', 'Log'
    ];

    const rowData = [
      record.timestamp,
      record.nama || '',
      record.email || '',
      record.tarikh_bancian || '',
      record.negeri || '',
      record.daerah || '',
      record.lokasi || '',
      record.koordinat || '',
      record.kategori || '',
      record.nama_tanaman || '',
      record.varieti || '',
      record.umur_tanaman || '',
      record.luas_bertanam || 0,
      record.luas_serangan || {},
      record.peratus_serangan || {},
      record.keterukan || {},
      record.syor_kawalan || '',
      record.image_links || '',
      record.caption || '',
      record.status || '',
      record.log || ''
    ];

    return sendSuccess(res, { headers, rowData });

  } catch (e) {
    console.error('Single record error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
