// =========================================================================
// FAIL: api/data/verify.js
// FUNGSI: POST /api/data/verify — Sahkan atau tolak rekod
// Gantikan: submitVerify dari GAS
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  try {
    const { row, act, reason, name } = req.body || {};

    if (!row || !act) {
      return sendError(res, 'Maklumat tidak lengkap.');
    }

    const supabase = getSupabase();
    const now = new Date().toISOString();
    const verifierName = name || user.nama;

    if (act === 'APPROVE') {
      // Sahkan rekod
      const logMsg = `DISAHKAN oleh ${verifierName} | ${now}`;
      const { error } = await supabase
        .from('Data')
        .update({
          status: 'DISAHKAN',
          log: logMsg
        })
        .eq('id', row);

      if (error) {
        console.error('Verify approve error:', error);
        return sendError(res, 'Gagal mengesahkan rekod.');
      }

      return sendSuccess(res, {}, '✅ Rekod berjaya disahkan.');

    } else if (act === 'REJECT') {
      // Tolak rekod
      const logMsg = `DITOLAK oleh ${verifierName} | Sebab: ${reason || 'Tiada sebab diberikan'} | ${now}`;
      const { data: updatedRec, error } = await supabase
        .from('Data')
        .update({
          status: 'DITOLAK',
          log: logMsg
        })
        .eq('id', row)
        .select('email, lokasi');

      if (error) {
        console.error('Verify reject error:', error);
        return sendError(res, 'Gagal menolak rekod.');
      }

      // Hantar notifikasi email menggunakan GAS
      if (updatedRec && updatedRec.length > 0) {
        const uEmail = updatedRec[0].email;
        const uLokasi = updatedRec[0].lokasi;
        if (uEmail && String(uEmail).includes('@')) {
           const gasUrl = "https://script.google.com/macros/s/AKfycbwmlorXpSkvDx_PJT4eRYcWc0MGii7nyeafpSIDPdD-z_At1hY8leUzFyvAKy5kLrrA/exec";
           // Jangan 'await' supaya respon ke frontend pantas
           fetch(gasUrl, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               action: 'sendRejectEmail',
               email: uEmail,
               lokasi: uLokasi,
               reason: reason || 'Tiada sebab',
               name: verifierName
             })
           }).catch(err => console.error("Gagal panggil GAS email:", err));
        }
      }

      return sendSuccess(res, {}, '❌ Rekod telah ditolak.');
    }

    return sendError(res, 'Arahan tidak sah.');

  } catch (e) {
    console.error('Verify error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
