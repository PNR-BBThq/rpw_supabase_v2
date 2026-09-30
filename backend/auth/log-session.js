import { authMiddleware } from '../middleware.js';
// =========================================================================
// FAIL: api/auth/log-session.js
// FUNGSI: POST /api/auth/log-session — Log sesi masuk ke pangkalan data
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const {user,error:authError}=await authMiddleware(req);
  if(authError)return sendError(res,authError,401);
  try {
    const {error}=await getSupabase().from('session_logs').update({last_seen_at:new Date().toISOString()}).eq('session_key',req.auditSession);
    if(error)return sendError(res,'Log sesi belum berjaya direkod.',503);

    return sendSuccess(res, {}, 'Sesi dilog.');

  } catch (e) {
    // Tidak perlu error handling kritikal untuk logging
    console.error('Log session error:', e);
    return sendError(res, 'Log sesi belum berjaya direkod.',503);
  }
}
