// Tambah sebagai fail .gs dalam deployment Apps Script PNR yang mempunyai UPLOAD_FOLDER_ID.
// Tambah satu cabang pada processRequest SEBELUM bahagian LALUAN BERKUNCI:
// else if (action === 'deleteStoredImages') { result = pnrDeleteStoredImages_(data); }
// Set Script Property PNR_DRIVE_BRIDGE_SECRET (32+ aksara rawak), dan nilai sama
// sebagai Vercel PNR_DRIVE_BRIDGE_SECRET. Jangan letak nilainya dalam kod/git.

function pnrDeleteStoredImages_(data) {
  try {
    const secret = PropertiesService.getScriptProperties().getProperty('PNR_DRIVE_BRIDGE_SECRET');
    if (!secret || secret.length < 32) return { success:false, message:'Rahsia Drive belum disediakan.' };
    const at = String(data.at || '');
    const recordId = String(data.recordId || '');
    const links = data.links;
    const mode = String(data.mode || '');
    if (!/^\d{13}$/.test(at) || Math.abs(Date.now()-Number(at))>300000 || !recordId ||
        !Array.isArray(links) || links.length<1 || links.length>10 ||
        (mode!=='probe' && mode!=='delete')) return { success:false, message:'Permintaan tidak sah.' };
    const canonical = at+'\n'+recordId+'\n'+mode+'\n'+links.join('\n');
    const expected = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(canonical,secret)).replace(/=+$/,'');
    const actual = String(data.signature || '');
    if (actual.length!==expected.length) return {success:false,message:'Tandatangan tidak sah.'};
    let diff=0;
    for(let i=0;i<actual.length;i++) diff |= actual.charCodeAt(i)^expected.charCodeAt(i);
    if(diff) return {success:false,message:'Tandatangan tidak sah.'};
    const ids = links.map(pnrDriveFileId_);
    ids.forEach(id=>{
      const file=DriveApp.getFileById(id);
      if(!pnrInsideUploadRoot_(file))throw new Error('Gambar di luar folder PNR.');
    });
    if (mode==='probe') return {success:true,checked:ids.length};
    let deleted=0;
    ids.forEach(id => {
      const file=DriveApp.getFileById(id);
      if (!file.isTrashed()) file.setTrashed(true);
      deleted++;
    });
    return {success:true,deleted};
  } catch (e) {
    console.error('Drive image deletion failed:',e);
    return {success:false,message:'Fail Drive belum berjaya dipadam.'};
  }
}

function pnrDriveFileId_(link) {
  const url=String(link||'');
  if(!/^https:\/\/drive\.google\.com\//.test(url)) throw new Error('Pautan bukan Google Drive.');
  const id=url.match(/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{25,})(?:\/|\?|$)/)?.[1]
    || url.match(/^https:\/\/drive\.google\.com\/open\?[^#]*\bid=([A-Za-z0-9_-]{25,})(?:&|$)/)?.[1];
  if(!id) throw new Error('ID Drive tidak sah.');
  return id;
}

function pnrInsideUploadRoot_(file) {
  const root=String(UPLOAD_FOLDER_ID);
  function within(parents,depth) {
    if(depth>3)return false;
    while(parents.hasNext()) {
      const folder=parents.next();
      if(folder.getId()===root) return true;
      if(within(folder.getParents(),depth+1))return true;
    }
    return false;
  }
  return within(file.getParents(),0);
}
