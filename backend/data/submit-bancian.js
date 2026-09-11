// ==========================================
// FAIL: api/data/submit-bancian.js
// FUNGSI: POST /api/data/submit-bancian — Daftar laporan pemantauan baru
// NOTA: Imej akan dihantar ke GAS (GDrive) untuk penjimatan storan
// ==========================================

import { authMiddleware } from '../middleware.js';
import { prepareSubmission } from './submission.js';
import { uploadImages } from '../gdrive/storage.js';
import { matchesScope, stateScope } from '../rpw/policy.js';
import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';

// URL Proxy AppScript untuk muat naik gambar ke GDrive
const GAS_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbznIzUO_1G9vhSrD7I2JLAnPmFNbPK5plRjPwbnW9T9rFO-2X5nVAQk0utLSxjSffjY/exec";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const {user,error:authError}=await authMiddleware(req);
  if(authError) return sendError(res,authError,401);
  try {
    const supabase = getSupabase();
    const data = {...req.body};
    
    let prepared;
    try { prepared=prepareSubmission(data,user); } catch(e) { return sendError(res,e.message,400); }
    const {data: form, submissionId, hash, recordId} = prepared;
    if (!matchesScope({negeri:form.negeri,daerah:form.daerah}, stateScope(user))) return sendError(res,'Lokasi di luar skop akaun.',403);
    const previous = await supabase.from('Data').select('id,submission_hash').eq('uid',user.uid).eq('submission_id',submissionId).maybeSingle();
    if (previous.error) return sendError(res,'Penghantaran belum tersedia. Pentadbir perlu semak migrasi pangkalan data.',503);
    if (previous.data) {
      if(previous.data.submission_hash!==hash) return sendError(res,'ID penghantaran telah digunakan dengan kandungan lain.',409);
      return sendSuccess(res,{rowId:previous.data.id},'Laporan telah diterima sebelum ini.');
    }
    const finalImageLinks = await uploadImages(form.images, recordId);
    Object.assign(data,form);
    const userId = user.uid;
    const timestamp = new Date().toISOString();

    const insertPayload = {
        id: recordId,
        submission_id: submissionId,
        submission_hash: hash,
        uid: userId,
        nama: user.nama,
        email: data.email || "",
        tarikh_bancian: data.tarikhBancian || new Date().toISOString().split('T')[0],
        negeri: data.negeri || "N/A",
        daerah: data.daerah || "N/A",
        lokasi: data.lokasi || "N/A",
        koordinat: data.koordinat || "N/A",
        kategori: data.kategori || "N/A",
        nama_tanaman: data.namaTanaman || "N/A",
        varieti: data.varieti || "N/A",
        umur_tanaman: data.umurTanaman || "N/A",
        luas_bertanam: parseFloat(data.luasBertanam) || 0,
        senarai_perosak: data.senaraiPerosak || "TIADA",
        luas_serangan: data.luasSerangan || {},
        peratus_serangan: data.peratusSerangan || {},
        keterukan: data.keterukan || {},
        syor_kawalan: data.syor || "TIADA",
        image_links: finalImageLinks,
        caption: data.captionGambar || "TIADA",
        status: "BARU",
        log: "",
        created_at: timestamp,
        timestamp: timestamp
    };

    const { error } = await supabase.from('Data').insert([insertPayload]);
    if (error?.code === '23505') {
      const retry = await supabase.from('Data').select('id,submission_hash').eq('uid',user.uid).eq('submission_id',submissionId).maybeSingle();
      if(!retry.error && retry.data?.submission_hash===hash) return sendSuccess(res,{rowId:retry.data.id},'Laporan telah diterima.');
      return sendError(res,'Konflik penghantaran. Draf dikekalkan.',409);
    }
    if (error) throw error;

    return sendSuccess(res, { rowId: recordId }, 'Laporan berjaya dihantar ke Supabase.');

  } catch (error) {
    console.error('Submit Bancian Error:', error);
    return sendError(res, 'Gagal menyimpan data.', 500);
  }
}
