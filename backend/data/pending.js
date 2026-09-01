// =========================================================================
// FAIL: api/data/pending.js
// FUNGSI: GET /api/data/pending — Ambil rekod menunggu pengesahan
// Gantikan: getPending dari GAS
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  try {
    const supabase = getSupabase();
    const state = req.query?.state || req.body?.state || user.state || 'ALL';

    let query = supabase
      .from('data_bancian')
      .select('*')
      .eq('status', 'MENUNGGU')
      .order('timestamp', { ascending: false });

    if (state && state !== 'ALL' && state !== 'SEMUA') {
      query = query.eq('negeri', state.toUpperCase().trim());
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Pending query error:', error);
      return sendError(res, 'Gagal memuat data menunggu.', 500);
    }

    // Headers untuk frontend (format GAS compatible)
    const headers = [
      'Timestamp', 'Nama', 'Email', 'Tarikh Bancian', 'Negeri', 'Daerah',
      'Lokasi', 'Koordinat', 'Kategori Tanaman', 'Nama Tanaman', 'Varieti',
      'Umur Tanaman', 'Luas Bertanam', 'Luas Serangan', 'Peratus', 'Keterukan',
      'Syor Kawalan', 'IMAGE LINKS (COMMA SEPARATED)', 'Caption', 'Status', 'Log'
    ];

    // Transform ke format row-based (compatible dengan frontend)
    const rows = (records || []).map(r => ({
      row: r.id,
      data: [
        r.timestamp,
        r.nama || '',
        r.email || '',
        r.tarikh_bancian || '',
        r.negeri || '',
        r.daerah || '',
        r.lokasi || '',
        r.koordinat || '',
        r.kategori || '',
        r.nama_tanaman || '',
        r.varieti || '',
        r.umur_tanaman || '',
        r.luas_bertanam || 0,
        r.luas_serangan || {},
        r.peratus_serangan || {},
        r.keterukan || {},
        r.syor_kawalan || '',
        r.image_links || '',
        r.caption || '',
        r.status || '',
        r.log || ''
      ]
    }));

    return sendSuccess(res, { headers, rows });

  } catch (e) {
    console.error('Pending error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
