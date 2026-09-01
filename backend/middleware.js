// =========================================================================
// FAIL: api/middleware.js
// FUNGSI: Auth middleware — semak token untuk endpoint yang memerlukan login
// =========================================================================

import { getSupabase } from './supabase-client.js';

// Senarai endpoint yang TIDAK perlu token (boleh akses tanpa login)
const FREE_ROUTES = ['auth/login', 'auth/register', 'auth/forgot-password', 'auth/update-access'];

/**
 * Semak sama ada endpoint memerlukan pengesahan token
 */
export function isPublicRoute(url) {
  return FREE_ROUTES.some(route => url.includes(route));
}

/**
 * Sahkan token dan kembalikan data pengguna
 * Token format: Simple base64 encoded JSON {uid, exp}
 * 
 * @param {string} token - Token dari header Authorization
 * @returns {object|null} User data jika sah, null jika tidak
 */
export async function verifyToken(token) {
  try {
    if (!token) return null;

    // Decode token (format: base64 encoded JSON)
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    
    if (!decoded.uid || !decoded.exp) return null;
    
    // Semak jika token sudah luput (24 jam)
    if (Date.now() > decoded.exp) return null;

    // Sahkan pengguna masih wujud dan aktif
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('user')
      .select('*')
      .eq('uid', decoded.uid)
      .eq('status', 'AKTIF')
      .single();

    if (error || !user) return null;

    return user;
  } catch (e) {
    console.error('Token verification error:', e);
    return null;
  }
}

/**
 * Cipta token baru untuk pengguna
 * @param {string} uid - User ID
 * @returns {string} Base64 encoded token
 */
export function generateToken(uid) {
  const payload = {
    uid: uid,
    exp: Date.now() + (24 * 60 * 60 * 1000), // Luput selepas 24 jam
    iat: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Middleware untuk extract dan verify token dari request
 */
export async function authMiddleware(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return { user: null, error: 'Token tidak dijumpai' };
  }

  const user = await verifyToken(token);
  if (!user) {
    return { user: null, error: 'Sesi tamat. Sila log masuk semula.' };
  }

  return { user, error: null };
}
