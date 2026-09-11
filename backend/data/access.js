import { stateScope, matchesScope, scoped, normal } from '../rpw/policy.js';
export { stateScope, scoped };
export const supervisor = user => ['ADMIN','PENYELIA'].includes(normal(user.role));
export function canAccess(user, row, action = 'read') {
  if (!row || !matchesScope(row, stateScope(user))) return false;
  if (action === 'verify' || action === 'delete') return supervisor(user);
  const owner = row.uid ? row.uid === user.uid : normal(row.nama) === normal(user.nama);
  if (action === 'edit') return supervisor(user) || (owner && ['BARU','DRAF','DITOLAK','MENUNGGU'].includes(normal(row.status)));
  return supervisor(user) || owner || normal(row.status) === 'DISAHKAN';
}
export async function requireRecord(supabase, user, id, action) {
  const {data,error} = await supabase.from('Data').select('*').eq('id',id).maybeSingle();
  if (error) throw new Error('Gagal menyemak rekod.');
  return canAccess(user,data,action) ? data : null;
}
