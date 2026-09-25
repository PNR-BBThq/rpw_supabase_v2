import {prepareSubmission,confirmedLinks} from './submission.js';
import { requireRecord, stateScope } from './access.js';
import { matchesScope } from '../rpw/policy.js';
import { uploadImages } from '../gdrive/storage.js';
import { scheduleDriveCleanup, runDriveCleanup } from '../gdrive/cleanup.js';
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
    const permitted = await requireRecord(supabase, user, rowID, 'edit');
    if (!permitted) return sendError(res, 'Rekod tidak dijumpai atau di luar kebenaran anda.', 403);

    if (!matchesScope({negeri:body.negeri,daerah:body.daerah}, stateScope(user))) return sendError(res, 'Lokasi di luar skop akaun.', 403);
    try {
      const normalized=prepareSubmission({...body,
        namaTanaman:body.namaTanaman||body.tanaman,tarikhBancian:body.tarikhBancian||body.tarikh,
        koordinat:body.koordinat||body.coord,email:body.email||permitted.email,
        luasBertanam:body.luasBertanam||body.luasT,syor:body.syor||''
      },user).data;
      Object.assign(body,normalized);
    } catch(e) {return sendError(res,e.message,400);}
    // Gabungkan retained images + new image links
    let finalImageLinks = '';
    const retained = body.retainedImages || [];
    let newLinks = body.newImageLinks || [];

    if(!Array.isArray(retained)||!Array.isArray(newLinks)) return sendError(res,'Senarai gambar tidak sah.');
    const existing = String(permitted.image_links || '').split(',').map(link => link.trim()).filter(link => link && link !== 'TIADA GAMBAR');
    if(retained.some(link => !existing.includes(link)) || newLinks.length) return sendError(res,'Senarai gambar tidak sepadan dengan rekod.',400);
    if(new Set(retained).size !== retained.length) return sendError(res,'Senarai gambar berulang.',400);
    const removed=existing.filter(link=>!retained.includes(link));
    const cleanupJob=await scheduleDriveCleanup(supabase,rowID,removed,user.uid);
    newLinks = body.images?.length ? (await uploadImages(body.images, rowID,{tanaman:body.namaTanaman,negeri:body.negeri})).split(',').map(link=>link.trim()) : [];
    const allLinks = [...retained.filter(l => l), ...newLinks.filter(l => l)];
    finalImageLinks = allLinks.length ? confirmedLinks(allLinks,allLinks.length) : 'TIADA GAMBAR';

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
    const kemaskiniName = user.nama;
    const newLogMsg = `[${ts}] DIKEMASKINI oleh ${kemaskiniName}`;
    const combinedLog = oldLog ? `${oldLog}\n\n${newLogMsg}` : newLogMsg;

    // Kemas kini rekod
    const updateData = {
      tarikh_bancian: body.tarikhBancian || body.tarikh || null,
      nama: permitted.nama,
      negeri: body.negeri || '',
      daerah: body.daerah || '',
      lokasi: body.lokasi || '',
      koordinat: body.koordinat || body.coord || '',
      kategori: body.kategori || '',
      nama_tanaman: body.namaTanaman || body.tanaman || '',
      varieti: body.varieti || '',
      umur_tanaman: body.umurTanaman || body.umurT || '',
      luas_bertanam: parseFloat(body.luasBertanam || body.luasT) || 0,
      luas_serangan: JSON.stringify(luasSeranganObj),
      senarai_perosak: body.senaraiPerosak,
      peratus_serangan: peratusObj,
      keterukan: keterukanObj,
      syor_kawalan: body.syor || '',
      catatan: body.catatan || '',
      image_links: finalImageLinks,
      caption: body.captionGambar || body.caption || '',
      status: 'BARU', // Selepas edit, status dikembalikan kepada BARU mengikut legasi asal
      log: combinedLog
    };

    let updateQuery = supabase
      .from('Data')
      .update(updateData)
      .eq('id', rowID);
    updateQuery = permitted.image_links == null
      ? updateQuery.is('image_links',null) : updateQuery.eq('image_links',permitted.image_links);
    const { data:updated,error } = await updateQuery.select('id').maybeSingle();

    if (error) {
      console.error('Update entry error:', error);
      return sendError(res, 'Gagal mengemaskini rekod: ' + error.message);
    }
    if(!updated) return sendError(res,'Rekod berubah semasa penyuntingan. Muat semula sebelum cuba lagi.',409);

    const cleanup=await runDriveCleanup(supabase,cleanupJob);
    return sendSuccess(res, {status:'success',cleanupPending:cleanup.pending},cleanup.pending
      ? 'Rekod disimpan. Pemadaman fail Drive menunggu percubaan semula.'
      : 'Rekod berjaya dikemaskini dan gambar dibuang daripada Drive.');

  } catch (e) {
    console.error('Update entry error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
