// =========================================================================
// FAIL: api/gdrive/upload.js
// FUNGSI: POST /api/gdrive/upload — Upload gambar ke Google Drive (HYBRID)
// NOTA: Ini akan menghantar request ke Google Apps Script (GAS) asal yang 
// mengekalkan logic upload Google Drive, menjimatkan storage Supabase.
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

// URL Google Apps Script yang mengandungi fungsi simpan gambar
// Anda perlu pastikan GAS ada fungsi 'uploadImageOnly'
const GAS_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbwmlorXpSkvDx_PJT4eRYcWc0MGii7nyeafpSIDPdD-z_At1hY8leUzFyvAKy5kLrrA/exec";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  try {
    const { images, id } = req.body || {};
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return sendError(res, 'Tiada gambar untuk dimuat naik.');
    }

    // Panggil GAS untuk simpan gambar di GDrive
    // GAS perlu diubahsuai sedikit untuk menerima action=uploadImageOnly
    const response = await fetch(GAS_UPLOAD_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'uploadImageOnly',
        images: images,
        id: id || 'UPLOAD'
      }),
      // Jangan guna Content-Type json jika GAS tidak menyokongnya tanpa preflight
    });

    // Baca respons dari GAS (biasanya string URL comma separated)
    const result = await response.text();

    try {
      // Cuba parse JSON jika respons dari GAS adalah JSON
      const jsonResult = JSON.parse(result);
      if (jsonResult.success) {
        return sendSuccess(res, { links: jsonResult.links }, 'Gambar berjaya dimuat naik.');
      } else {
        return sendError(res, 'Gagal memuat naik gambar: ' + jsonResult.message);
      }
    } catch (e) {
      // Jika respons bukan JSON, kita anggap string respons adalah pautan gambar
      return sendSuccess(res, { links: result }, 'Gambar berjaya dimuat naik.');
    }

  } catch (e) {
    console.error('GDrive upload error:', e);
    return sendError(res, 'Ralat semasa berhubung dengan storan GDrive.', 500);
  }
}
