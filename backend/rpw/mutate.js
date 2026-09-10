import { getSupabase, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';
import { mutationReady } from './records.js';
import { stateScope, matchesScope, validateMutation } from './policy.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);
  // A legacy unsigned PNR token must NEVER enable native RPW mutations.
  if (!mutationReady()) return sendError(res, 'Pembetulan RPW belum diaktifkan oleh pentadbir.', 503);
  const {user, error} = await authMiddleware(req);
  if (error) return sendError(res, error, 401);
  if (!['ADMIN', 'PENYELIA'].includes(String(user.role).toUpperCase())) return sendError(res, 'Akses pembetulan tidak dibenarkan.', 403);
  let change;
  try { change = validateMutation(req.body); } catch (e) { return sendError(res, e.message); }
  try {
    const scope = stateScope(user);
    const {data: row, error: dbError} = await getSupabase().from('tangkapan_rpw').select('row_id,negeri,daerah').eq('row_id', change.id).maybeSingle();
    if (dbError) throw dbError;
    if (!row || !matchesScope(row, scope)) return sendError(res, 'Rekod tidak dijumpai dalam skop akaun.', 404);
    const response = await fetch(process.env.PNR_RPW_CRUD_URL, {
      method:'POST', signal:AbortSignal.timeout(25000),
      body:JSON.stringify({action:change.action, row_id:change.id, val_baru:change.value, u:user.nama, neg:scope || 'ALL', tiket:process.env.PNR_RPW_CRUD_TICKET})
    });
    if (!response.ok) throw new Error('Source unavailable');
    const result = await response.json();
    if (result.success !== true) return sendError(res, 'Sumber pusat menolak perubahan. Semak rekod dan akses.', 409);
    return sendSuccess(res, {}, 'Perubahan diterima oleh sumber pusat.');
  } catch (e) {
    console.error('RPW mutation failed', e.message);
    return sendError(res, 'Status perubahan belum dapat dipastikan. Segerakkan dan semak rekod sebelum mencuba semula.', 502);
  }
}
