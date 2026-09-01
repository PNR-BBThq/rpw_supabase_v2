// =========================================================================
// FAIL: api/data/kpi.js
// FUNGSI: GET /api/data/kpi — Ambil data sasaran KPI + senarai tanaman
// Gantikan: getKPIData dari GAS
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

    // Ambil data sasaran KPI
    const { data: sasaranData, error: sasaranError } = await supabase
      .from('sasaran_kpi')
      .select('*')
      .order('negeri', { ascending: true });

    if (sasaranError) {
      console.error('KPI sasaran error:', sasaranError);
      return sendError(res, 'Gagal memuat data sasaran KPI.', 500);
    }

    // Ambil senarai tanaman tumpuan
    const { data: senaraiData, error: senaraiError } = await supabase
      .from('tanaman_tumpuan')
      .select('*')
      .eq('aktif', true)
      .order('negeri', { ascending: true });

    if (senaraiError) {
      console.error('KPI senarai error:', senaraiError);
    }

    // Transform sasaran ke format yang frontend jangkakan
    // Format: { negeri: { tanaman: sasaran_ha, ... }, ... }
    const dataSasaran = {};
    (sasaranData || []).forEach(s => {
      if (!dataSasaran[s.negeri]) dataSasaran[s.negeri] = {};
      dataSasaran[s.negeri][s.tanaman] = parseFloat(s.sasaran_ha) || 0;
    });

    // Transform senarai ke format: { negeri: [tanaman1, tanaman2, ...] }
    const dataSenarai = {};
    (senaraiData || []).forEach(s => {
      if (!dataSenarai[s.negeri]) dataSenarai[s.negeri] = [];
      dataSenarai[s.negeri].push(s.tanaman);
    });

    return sendSuccess(res, { dataSasaran, dataSenarai });

  } catch (e) {
    console.error('KPI error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
