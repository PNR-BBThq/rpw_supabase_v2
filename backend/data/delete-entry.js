import { requireRecord, stateScope } from './access.js';
import { matchesScope } from '../rpw/policy.js';
import { imageLinks } from '../gdrive/storage.js';
import { scheduleDriveCleanup, runDriveCleanupJobs } from '../gdrive/cleanup.js';
// =========================================================================
// FAIL: api/data/delete-entry.js
// FUNGSI: POST /api/data/delete-entry — Padam rekod bancian
// Gantikan: deleteEntry dari GAS
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST' && req.method !== 'DELETE') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  try {
    const row = req.body?.row || req.query?.row;
    if (!row) return sendError(res, 'ID rekod diperlukan.');

    const supabase = getSupabase();
    const permitted = await requireRecord(supabase, user, row, 'delete');
    if (!permitted) return sendError(res, 'Rekod tidak dijumpai atau di luar kebenaran anda.', 403);
    const cleanupJobs=await scheduleDriveCleanup(supabase,row,imageLinks(permitted.image_links),user.uid);

    // Padam rekod dan juga ignored_redundant yang berkaitan
    await supabase.from('ignored_redundant').delete().eq('record_id', row);

    const { data:deleted,error } = await supabase
      .from('Data')
      .delete()
      .eq('id', row).select('id').maybeSingle();

    if (error) {
      console.error('Delete entry error:', error);
      return sendError(res, 'Gagal memadam rekod.');
    }
    if(!deleted) return sendError(res,'Rekod sudah berubah. Sila muat semula.',409);

    const cleanup=await runDriveCleanupJobs(supabase,cleanupJobs);
    return sendSuccess(res, {cleanupPending:cleanup.pending},cleanup.pending
      ? 'Rekod dipadamkan; fail Drive menunggu percubaan pemadaman semula.'
      : 'Rekod dan fail gambar Drive berjaya dipadamkan.');

  } catch (e) {
    console.error('Delete entry error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
