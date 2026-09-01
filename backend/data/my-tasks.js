// =========================================================================
// FAIL: api/data/my-tasks.js
// FUNGSI: GET /api/data/my-tasks — Ambil tugasan sendiri (DRAF/DITOLAK)
// Gantikan: getMyTasks dari GAS
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
    const name = req.query?.name || req.body?.name || user.nama;

    const { data: records, error } = await supabase
      .from('data_bancian')
      .select('*')
      .eq('nama', name.toUpperCase().trim())
      .in('status', ['DRAF', 'DITOLAK'])
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('My tasks error:', error);
      return sendError(res, 'Gagal memuat tugasan.', 500);
    }

    // Headers yang frontend perlukan
    const headers = [
      'Timestamp', 'Nama', 'Email', 'Tarikh Bancian', 'Negeri', 'Daerah',
      'Lokasi', 'Koordinat', 'Kategori Tanaman', 'Nama Tanaman', 'Varieti',
      'Umur Tanaman', 'Luas Bertanam', 'Luas Serangan', 'Peratus', 'Keterukan',
      'Syor Kawalan', 'IMAGE LINKS (COMMA SEPARATED)', 'Caption', 'Status', 'Log'
    ];

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
    console.error('My tasks error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
