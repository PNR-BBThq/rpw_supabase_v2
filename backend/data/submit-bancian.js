// ==========================================
// FAIL: api/data/submit-bancian.js
// FUNGSI: POST /api/data/submit-bancian — Daftar laporan pemantauan baru
// NOTA: Imej akan dihantar ke GAS (GDrive) untuk penjimatan storan
// ==========================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';

// URL Proxy AppScript untuk muat naik gambar ke GDrive
const GAS_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbznIzUO_1G9vhSrD7I2JLAnPmFNbPK5plRjPwbnW9T9rFO-2X5nVAQk0utLSxjSffjY/exec";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  try {
    const supabase = getSupabase();
    const data = req.body;
    
    // 1. Dapatkan uid berdasarkan namaPegawai jika boleh, atau default kepada 'N/A'
    // form.html hanya menghantar namaPegawai. Kita cuba match dengan pengguna berdaftar.
    let userId = 'N/A';
    if (data.namaPegawai) {
        const { data: userData } = await supabase
            .from('user')
            .select('uid')
            .ilike('nama', data.namaPegawai.trim())
            .single();
        if (userData) userId = userData.uid;
    }

    // 2. Upload imej ke Google Drive (Hybrid Storage)
    let finalImageLinks = "TIADA GAMBAR";
    if (data.images && data.images !== "[]") {
        try {
            const imagesArray = JSON.parse(data.images);
            if (imagesArray.length > 0) {
                // Hantar ke proxy GAS (uploadImageOnly)
                const gasRes = await fetch(GAS_UPLOAD_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'uploadImageOnly',
                        images: imagesArray,
                        id: `NEW_BANCIAN_${Date.now()}`
                    })
                });
                
                const gasText = await gasRes.text();
                try {
                    const gasJson = JSON.parse(gasText);
                    if (gasJson.success) finalImageLinks = gasJson.links;
                    else finalImageLinks = gasText;
                } catch(e) {
                    finalImageLinks = gasText; // fallback jika bukan JSON (return string link terus)
                }
            }
        } catch(e) {
            console.error("Gagal muat naik gambar:", e);
            finalImageLinks = "RALAT_GAMBAR";
        }
    }

    // 3. Simpan ke Supabase
    // Cipta ID Unik (contoh R-timestamp)
    const recordId = `R-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const insertPayload = {
        id: recordId, // Simpan RECORD_ID asal
        uid: userId,
        nama: data.namaPegawai || "N/A",
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
        status: data.statusRekod || "MENUNGGU",
        log: "",
        created_at: timestamp,
        timestamp: timestamp
    };

    const { error } = await supabase.from('Data').insert([insertPayload]);
    if (error) throw error;

    return sendSuccess(res, { rowId: recordId }, 'Laporan berjaya dihantar ke Supabase.');

  } catch (error) {
    console.error('Submit Bancian Error:', error);
    return sendError(res, 'Gagal menyimpan data.', 500);
  }
}
