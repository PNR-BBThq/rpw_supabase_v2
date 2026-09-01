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
    let finalImageLinks = '';
    const retained = body.retainedImages || [];
    const newLinks = body.newImageLinks || []; // Links dari GAS upload
    const allLinks = [...retained.filter(l => l), ...newLinks.filter(l => l)];
    finalImageLinks = allLinks.join(', ');

    // Parse pest data
    let luasSeranganObj = {};
    let peratusObj = {};
    let keterukanObj = {};
    let totalLuasSerangan = 0;
    let maxKeterukan = 0;

    if (body.senaraiPerosak) {
      const pestNames = body.senaraiPerosak.split(',').map(s => s.trim()).filter(s => s);
      const luasValues = body.luasSerangan ? String(body.luasSerangan).split(',').map(s => parseFloat(s.trim()) || 0) : [];
      const pctValues = body.peratusSerangan ? String(body.peratusSerangan).split(',').map(s => parseFloat(s.trim()) || 0) : [];
      const sevValues = body.keterukan ? String(body.keterukan).split(',').map(s => parseInt(s.trim()) || 0) : [];

      pestNames.forEach((name, i) => {
        const luas = luasValues[i] || 0;
        const pct = pctValues[i] || 0;
        const sev = sevValues[i] || 0;
        luasSeranganObj[name] = luas;
        peratusObj[name] = pct;
        keterukanObj[name] = sev;
        totalLuasSerangan += luas;
        if (sev > maxKeterukan) maxKeterukan = sev;
      });
    }

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
      keterukan_max: maxKeterukan,
      luas_serangan_total: totalLuasSerangan,
      syor_kawalan: body.syor || '',
      image_links: finalImageLinks,
      caption: body.captionGambar || body.caption || '',
      status: 'MENUNGGU' // Selepas edit, hantar semula untuk pengesahan
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
