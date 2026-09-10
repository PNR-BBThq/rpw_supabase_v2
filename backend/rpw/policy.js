export const normal = value => String(value || '').trim().toUpperCase();
export function stateScope(user) {
  const state = normal(user.state || user.negeri);
  // Missing scope must not silently grant nationwide access.
  if (!state) throw new Error('Skop negeri akaun belum ditetapkan.');
  return ['ALL', 'SEMUA'].includes(state) ? null : state;
}
export function matchesScope(row, scope) {
  if (!scope) return true;
  if (scope === 'CAMERON HIGHLANDS') return normal(row.daerah) === scope;
  if (scope === 'PAHANG' && normal(row.daerah) === 'CAMERON HIGHLANDS') return false;
  return normal(row.negeri) === scope;
}
export function scoped(query, scope) {
  if (!scope) return query;
  if (scope === 'CAMERON HIGHLANDS') return query.eq('daerah', scope);
  query = query.eq('negeri', scope);
  return scope === 'PAHANG' ? query.or('daerah.is.null,daerah.neq.CAMERON HIGHLANDS') : query;
}
export function validateMutation(body) {
  const action = body?.action;
  if (!['UPDATE_GPS', 'UPDATE_LOCATION', 'DELETE'].includes(action)) throw new Error('Tindakan tidak sah.');
  const id = String(body.row_id || '').trim();
  if (!id || id.length > 120) throw new Error('ID rekod tidak sah.');
  const value = String(body.value || '').trim();
  if (action === 'UPDATE_LOCATION' && (!value || value.length > 250)) throw new Error('Nama lokasi tidak sah.');
  if (action === 'UPDATE_GPS') {
    const parts = value.split(',').map(s => s.trim());
    const nums = parts.map(Number);
    if (parts.length !== 2 || parts.some(s => !s) || !nums.every(Number.isFinite) || Math.abs(nums[0]) > 90 || Math.abs(nums[1]) > 180) throw new Error('Koordinat tidak sah.');
  }
  return {action, id, value};
}
