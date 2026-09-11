// =========================================================================
// FAIL: api/middleware.js
// FUNGSI: Auth middleware — semak token untuk endpoint yang memerlukan login
// =========================================================================

import { getSupabase } from './supabase-client.js';
import { issueToken, readToken, credentialVersion } from './token-signing.js';

// Senarai endpoint yang TIDAK perlu token (boleh akses tanpa login)
const FREE_ROUTES = ['auth/login', 'auth/register', 'auth/forgot-password'];

/**
 * Semak sama ada endpoint memerlukan pengesahan token
 */
export function isPublicRoute(url) {
  return FREE_ROUTES.some(route => url.includes(route));
}

/**
 * Sahkan token dan kembalikan data pengguna
 * Token format: HMAC-SHA256 signed JSON {uid, exp}
 * 
 * @param {string} token - Token dari header Authorization
 * @returns {object|null} User data jika sah, null jika tidak
 */
export async function verifyToken(token) {
  try {
    if (!token) return null;

    const decoded = readToken(token);
    if (!decoded) return null;

    // Sahkan pengguna masih wujud dan aktif
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('user')
      .select('*')
      .eq('uid', decoded.uid)
      .eq('status', 'AKTIF')
      .single();

    if (error || !user || decoded.cv !== credentialVersion(user.pwd)) return null;

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
export function generateToken(uid, pwd) {
  return issueToken(uid, process.env.PNR_TOKEN_SECRET, Date.now(), credentialVersion(pwd));
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
