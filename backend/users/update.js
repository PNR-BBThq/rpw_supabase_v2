import { hashPassword, validPassword } from '../passwords.js';
// =========================================================================
// FAIL: api/users/update.js
// FUNGSI: POST /api/users/update — Kemas kini pengguna
// Gantikan: updateUser dari GAS
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  if (user.role !== 'ADMIN') {
    return sendError(res, 'Kebenaran tidak mencukupi.', 403);
  }

  try {
    const body = req.body || {};
    const { row, field } = body;

    if (!row) return sendError(res, 'ID pengguna diperlukan.');

    if (body.role && !['STAFF','PENYELIA','ADMIN'].includes(body.role)) return sendError(res, 'Peranan tidak sah.');
    const status = field === 'status' ? body.value : body.status;
    if (status && !['AKTIF','MENUNGGU','DITOLAK','DIGANTUNG'].includes(status)) return sendError(res, 'Status tidak sah.');
    if (body.pwd && !validPassword(body.pwd)) return sendError(res, 'Kata laluan mesti sekurang-kurangnya 12 aksara.');
    const supabase = getSupabase();

    // Mod 1: Kemas kini satu field (status sahaja)
    if (field === 'status') {
      const { error } = await supabase
        .from('user')
        .update({ status: body.value })
        .eq('id', row);

      if (error) return sendError(res, 'Gagal mengemaskini status.');
      return sendSuccess(res, {}, 'Status pengguna dikemaskini.');
    }

    // Mod 2: Kemas kini penuh (full_edit)
    if (field === 'full_edit') {
      const updateData = {};
      // Stable identities own records and sessions.
      if (body.uid) {
        if (typeof body.uid !== 'string') return sendError(res,'ID pengguna tidak sah.');
        const {data: target,error} = await supabase.from('user').select('uid').eq('id',row).maybeSingle();
        if (error || !target) return sendError(res,'Pengguna tidak dijumpai.',404);
        if (body.uid.trim().toLowerCase() !== target.uid.trim().toLowerCase()) return sendError(res,'ID pengguna dipautkan kepada rekod dan tidak boleh ditukar di sini.',409);
      }
      if (body.pwd) updateData.pwd = await hashPassword(body.pwd);
      if (body.nama) updateData.nama = body.nama.toUpperCase().trim();
      if (body.ic) updateData.ic = body.ic.trim();
      if (body.jawatan) updateData.jawatan = body.jawatan.toUpperCase().trim();
      if (body.negeri) {
        updateData.negeri = body.negeri;
      }
      if (body.role) updateData.role = body.role;
      if (body.status) updateData.status = body.status;

      const { error } = await supabase
        .from('user')
        .update(updateData)
        .eq('id', row);

      if (error) {
        console.error('Update user error:', error);
        return sendError(res, 'Gagal mengemaskini pengguna: ' + error.message);
      }

      return sendSuccess(res, {}, 'Maklumat pengguna dikemaskini.');
    }

    return sendError(res, 'Jenis kemaskini tidak sah.');

  } catch (e) {
    console.error('Update user error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
