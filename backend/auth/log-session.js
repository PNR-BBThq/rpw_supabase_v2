// =========================================================================
// FAIL: api/auth/log-session.js
// FUNGSI: POST /api/auth/log-session — Log sesi masuk ke pangkalan data
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  try {
    const { name, role } = req.body || {};

    const supabase = getSupabase();

    // Masukkan log sesi
    await supabase
      .from('session_logs')
      .insert({
        user_name: name || 'Unknown',
        user_role: role || 'STAFF',
        ip_address: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'Unknown'
      });

    return sendSuccess(res, {}, 'Sesi dilog.');

  } catch (e) {
    // Tidak perlu error handling kritikal untuk logging
    console.error('Log session error:', e);
    return sendSuccess(res, {}, 'OK');
  }
}
