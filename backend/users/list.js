// =========================================================================
// FAIL: api/users/list.js
// FUNGSI: GET /api/users/list — Senarai semua pengguna (Admin sahaja)
// Gantikan: getUserList dari GAS
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  // Semak peranan — hanya ADMIN boleh akses
  if (user.role !== 'ADMIN') {
    return sendError(res, 'Anda tidak mempunyai kebenaran untuk akses modul ini.', 403);
  }

  try {
    const supabase = getSupabase();

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get users error:', error);
      return sendError(res, 'Gagal memuat senarai pengguna.', 500);
    }

    // Transform ke format yang frontend jangkakan
    const userList = (users || []).map(u => ({
      row: u.id,
      nama: u.nama,
      ic: u.ic,
      jawatan: u.jawatan,
      negeri: u.negeri,
      uid: u.uid,
      pwd: u.pwd, // Plaintext — Admin perlu lihat
      role: u.role,
      status: u.status
    }));

    return sendSuccess(res, { users: userList });

  } catch (e) {
    console.error('Get users error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
