// =========================================================================
// FAIL: api/data/update-entry.js
// FUNGSI: POST /api/data/update-entry — Kemas kini rekod bancian
// Gantikan: updateEntry dari GAS
// NOTA: Upload gambar ke Google Drive masih melalui GAS endpoint berasingan
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  try {
    const body = req.body || {};
    const rowID = body.row;

    if (!rowID) return sendError(res, 'ID rekod diperlukan.');

    const supabase = getSupabase();

    // Gabungkan retained images + new image links
    const GAS_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbwkXRVKJoWfLlUv5NUjtnthJqAV9bSIrr25pwmD2F0k_dbEPINtNs7ziOpH2cB9p3kj/exec";
    let finalImageLinks = '';
    const retained = body.retainedImages || [];
    let newLinks = body.newImageLinks || [];

    // Jika ada gambar baru (Base64) dihantar, kita muat naik ke GAS terlebih dahulu
    if (body.newImages && body.newImages.length > 0) {
      try {
        const gasRes = await fetch(GAS_UPLOAD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'uploadImageOnly',
                images: body.newImages,
                id: `EDIT_${rowID}_${Date.now()}`
            })
        });
        const gasData = await gasRes.json();
        if (gasData.success && gasData.links) {
            newLinks = gasData.links.split(',').map(l => l.trim());
        }
      } catch (err) {
        console.error("Gagal muat naik gambar baru:", err);
      }
    }

    const allLinks = [...retained.filter(l => l), ...newLinks.filter(l => l)];
    finalImageLinks = allLinks.join(', ');

    // Parse pest data (Pastikan sentiasa terima Object JSON, bukan comma separated)
    let luasSeranganObj = body.luasSerangan || {};
    let peratusObj = body.peratusSerangan || {};
    let keterukanObj = body.keterukan || {};
    
    if (typeof luasSeranganObj === 'string') {
        try { luasSeranganObj = JSON.parse(luasSeranganObj); } catch(e) {}
    }
    if (typeof peratusObj === 'string') {
        try { peratusObj = JSON.parse(peratusObj); } catch(e) {}
    }
    if (typeof keterukanObj === 'string') {
        try { keterukanObj = JSON.parse(keterukanObj); } catch(e) {}
    }

    // Dapatkan log sedia ada untuk ditambah rekod kemaskini
    const { data: oldRec } = await supabase.from('Data').select('log').eq('id', rowID).maybeSingle();
    let oldLog = (oldRec && oldRec.log) ? oldRec.log : '';
    
    const now = new Date();
    const ts = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const kemaskiniName = body.namaPegawai || body.pegawai || user.nama || 'Pengguna';
    const newLogMsg = `[${ts}] DIKEMASKINI oleh ${kemaskiniName}`;
    const combinedLog = oldLog ? `${oldLog}\n\n${newLogMsg}` : newLogMsg;

    // Kemas kini rekod
    const updateData = {
      tarikh_bancian: body.tarikhBancian || body.tarikh || null,
      nama: body.namaPegawai || body.pegawai || user.nama,
      negeri: body.negeri || '',
      daerah: body.daerah || '',
      lokasi: body.lokasi || '',
      koordinat: body.koordinat || body.coord || '',
      kategori: body.kategori || '',
      nama_tanaman: body.namaTanaman || body.tanaman || '',
      varieti: body.varieti || '',
      umur_tanaman: body.umurTanaman || body.umurT || '',
      luas_bertanam: parseFloat(body.luasBertanam || body.luasT) || 0,
      luas_serangan: luasSeranganObj,
      peratus_serangan: peratusObj,
      keterukan: keterukanObj,
      syor_kawalan: body.syor || '',
      image_links: finalImageLinks,
      caption: body.captionGambar || body.caption || '',
      status: 'BARU', // Selepas edit, status dikembalikan kepada BARU mengikut legasi asal
      log: combinedLog
    };

    const { error } = await supabase
      .from('Data')
      .update(updateData)
      .eq('id', rowID);

    if (error) {
      console.error('Update entry error:', error);
      return sendError(res, 'Gagal mengemaskini rekod: ' + error.message);
    }

    return sendSuccess(res, { status: 'success' }, '✅ Rekod berjaya dikemaskini dan dihantar untuk pengesahan.');

  } catch (e) {
    console.error('Update entry error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
