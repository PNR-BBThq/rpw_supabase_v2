import { getSupabase, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';
import { signingReady } from '../token-signing.js';
import { stateScope, scoped } from './policy.js';

export function mutationReady() {
  try { const url = new URL(process.env.PNR_RPW_CRUD_URL); return signingReady() && url.protocol === 'https:' && url.hostname === 'script.google.com' && url.pathname.endsWith('/exec') && Boolean(process.env.PNR_RPW_CRUD_TICKET); } catch { return false; }
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);
  const {user, error} = await authMiddleware(req);
  if (error) return sendError(res, error, 401);
  try {
    const offset = Number(req.body?.offset || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 20000) return sendError(res, 'Halaman tidak sah.');
    const scope = stateScope(user);
    let query = getSupabase().from('tangkapan_rpw').select('row_id,tarikh_kutip,negeri,daerah,lokasi_pemasangan,jenis_komoditi,total_catch_rf,bil_tangkapan_rv_jantan,bil_tangkapan_rv_betina,status_rtd_rf,lat_long,bil_pokok_diserang,bil_pokok_ditebang').order('row_id', {ascending:true}).range(offset, offset + 499);
    query = scoped(query, scope);
    const {data, error: dbError} = await query;
    if (dbError) throw dbError;
    res.setHeader('Cache-Control', 'private, no-store');
    return sendSuccess(res, {records:data || [], hasMore:data?.length === 500, canEdit:mutationReady() && ['ADMIN', 'PENYELIA'].includes(String(user.role).toUpperCase())});
  } catch (e) { console.error('RPW read failed', e.message); return sendError(res, 'Data RPW tidak dapat dimuatkan. Semak skop akaun dan konfigurasi pelayan.', 500); }
}
