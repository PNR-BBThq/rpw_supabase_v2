import {openSession} from '../audit.js';
import {allowAttempt} from '../rate-limit.js';
// =========================================================================
// FAIL: api/auth/login.js
// FUNGSI: POST /api/auth/login — Log masuk pengguna
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError, setCorsHeaders } from '../supabase-client.js';
import { verifyPassword, hashLegacy } from '../passwords.js';
import { signingReady } from '../token-signing.js';
import { generateToken } from '../middleware.js';

export default async function handler(req, res) {

  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  try {
    const { u, p } = req.body || {};

    if (!signingReady()) return sendError(res, 'Log masuk belum diaktifkan oleh pentadbir pelayan.', 503);
    // Akaun import lama boleh mengandungi ruang di antara perkataan ID pengguna.
    if (typeof u !== 'string' || u.trim().length > 100 || !/^[a-zA-Z0-9._@-]+(?: [a-zA-Z0-9._@-]+)*$/.test(u.trim()) || typeof p !== 'string' || !p || Buffer.byteLength(p)>256) {
      return sendError(res, 'Sila isi ID dan Kata Laluan.');
    }

    if (!(await allowAttempt(req,u))) return sendError(res,'Terlalu banyak cubaan. Cuba semula selepas 15 minit.',429);
    const supabase = getSupabase();
    const searchUid = u.trim();
    if(searchUid.includes('@')) {
      const {data:auth,error:authError}=await getSupabase().auth.signInWithPassword({email:searchUid.toLowerCase(),password:p});
      if(authError || !auth.session || !auth.user?.email_confirmed_at)return sendError(res,'E-mel atau kata laluan tidak sah, atau e-mel belum disahkan.');
      const {data:profile,error:profileError}=await supabase.from('user').select('*').eq('auth_user_id',auth.user.id).maybeSingle();
      if(profileError || !profile || profile.status!=='AKTIF')return sendError(res,'Akaun belum diluluskan atau telah digantung. Sila hubungi pentadbir.',403);
      await openSession(req,profile,auth.session.access_token,'supabase');
      return sendSuccess(res,{token:auth.session.access_token,refreshToken:auth.session.refresh_token,expiresAt:auth.session.expires_at,authProvider:'supabase',uid:profile.uid,name:profile.nama,role:profile.role,state:profile.negeri,negeri:profile.negeri,jawatan:profile.jawatan},'Log masuk berjaya');
    }

    // Cari pengguna berdasarkan username (case-insensitive)
    const { data: user, error } = await supabase
      .from('user')
      .select('*')
      .ilike('uid', searchUid)
      .maybeSingle();

    if (error) {
      return sendError(res, 'Log masuk tidak berjaya.');
    }
    if (!user || user.auth_user_id) {
      return sendError(res, 'ID atau kata laluan tidak sah.');
    }

    // Semak kata laluan (plaintext comparison)
    if (!(await verifyPassword(p, user.pwd))) {
      return sendError(res, 'ID atau kata laluan tidak sah.');
    }

    // Semak status akaun
    if (user.status !== 'AKTIF') {
      return sendError(res, `Akaun anda masih berstatus "${user.status}". Sila hubungi pentadbir.`);
    }

    if (!user.pwd.startsWith('scrypt$')) {
      const hashed = await hashLegacy(p);
      const { data: migrated, error: migrationError } = await supabase.from('user').update({pwd: hashed}).eq('uid', user.uid).eq('pwd', user.pwd).select('uid').maybeSingle();
      if (migrationError || !migrated) return sendError(res, 'Sila cuba log masuk semula.', 503);
      user.pwd = hashed;
    }

    // Jana token
    const token = generateToken(user.uid, user.pwd);

    await openSession(req,user,token,'legacy');

    // Return data dalam format yang frontend jangkakan
    return sendSuccess(res, {
      token: token,
      uid: user.uid,
      name: user.nama,
      role: user.role,
      state: user.state || user.negeri || '',
      negeri: user.negeri,
      jawatan: user.jawatan
    }, 'Log masuk berjaya');

  } catch (e) {
    console.error('Login error:', e);
    return sendError(res, 'Log masuk tidak berjaya.', 500);
  }
}
