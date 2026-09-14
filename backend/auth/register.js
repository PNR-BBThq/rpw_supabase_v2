import {allowAttempt} from '../rate-limit.js';
import { hashPassword, validPassword } from '../passwords.js';
// =========================================================================
// FAIL: api/auth/register.js
// FUNGSI: POST /api/auth/register — Daftar pengguna baru
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  try {
    const { nama, ic, jawatan, negeri, uid, pwd, role, status, catatan } = req.body || {};

    if (!nama || !ic || !jawatan || !negeri || !uid || !pwd) {
      return sendError(res, 'Sila isi semua maklumat yang diwajibkan.');
    }

    if (![nama,ic,jawatan,negeri,uid].every(v=>typeof v==='string' && v.trim().length>0 && v.length<=250) || !/^[a-z0-9._@-]{1,100}$/i.test(uid) || !validPassword(pwd)) return sendError(res, 'Maklumat tidak sah. Kata laluan mesti sekurang-kurangnya 12 aksara.');
    if (['ALL','SEMUA'].includes(negeri.trim().toUpperCase())) return sendError(res, 'Pilih negeri sebenar.');
    if (!(await allowAttempt(req,uid))) return sendError(res,'Terlalu banyak cubaan. Cuba semula selepas 15 minit.',429);
    const supabase = getSupabase();

    // Semak jika username sudah wujud
    const { data: existing } = await supabase
      .from('user')
      .select('uid')
      .eq('uid', uid.toLowerCase().trim())
      .single();

    if (existing) {
      return sendError(res, 'Username ini sudah digunakan. Sila pilih yang lain.');
    }

    // Semak jika IC sudah didaftar
    const { data: existingIC } = await supabase
      .from('user')
      .select('ic')
      .eq('ic', ic.trim())
      .single();

    if (existingIC) {
      return sendError(res, 'No. K/P ini sudah didaftarkan dalam sistem.');
    }

    // Masukkan pengguna baru
    const { data, error } = await supabase
      .from('user')
      .insert({
        uid: uid.toLowerCase().trim(),
        pwd: await hashPassword(pwd),
        nama: nama.toUpperCase().trim(),
        ic: ic.trim(),
        jawatan: jawatan.toUpperCase().trim(),
        negeri: negeri,
        role: 'STAFF',
        status: 'MENUNGGU',
        catatan: catatan || 'Didaftar melalui Web PNR'
      })
      .select()
      .single();

    if (error) {
      console.error('Register error:', error);
      return sendError(res, 'Gagal mendaftar: ' + error.message);
    }

    return sendSuccess(res, {}, 'Pendaftaran berjaya! Sila tunggu pengesahan daripada pentadbir.');

  } catch (e) {
    console.error('Register error:', e);
    return sendError(res, 'Ralat pelayan semasa pendaftaran.', 500);
  }
}
