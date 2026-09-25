import { confirmedLinks, validateImages } from '../data/submission.js';
import { createHmac } from 'node:crypto';

const driveUrl = () => {
  if(!process.env.PNR_IMAGE_UPLOAD_URL) throw new Error('URL Apps Script belum disahkan.');
  const url = new URL(process.env.PNR_IMAGE_UPLOAD_URL);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !url.pathname.endsWith('/exec')) throw new Error('Konfigurasi storan tidak sah.');
  return url;
};
export const imageLinks = value => String(value || '').split(',').map(s => s.trim()).filter(s => s && s !== 'TIADA GAMBAR');
export const driveId = link => {
  const url = new URL(link);
  if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com') throw new Error('Pautan gambar Drive tidak sah.');
  const id = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{25,})(?:\/|$)/)?.[1]
    || (url.pathname === '/open' ? url.searchParams.get('id') : null);
  if (!id || !/^[A-Za-z0-9_-]{25,}$/.test(id)) throw new Error('ID gambar Drive tidak sah.');
  return id;
};
export function driveDeletionReady() {
  return !!process.env.PNR_DRIVE_BRIDGE_SECRET && process.env.PNR_DRIVE_BRIDGE_SECRET.length >= 32;
}
export async function deleteDriveImages(links, recordId, mode='delete') {
  if (!links.length) return;
  if (!driveDeletionReady()) throw new Error('Sambungan pemadaman Drive belum disediakan.');
  if (links.length > 10 || !recordId || !['probe','delete'].includes(mode)) throw new Error('Permintaan pemadaman gambar tidak sah.');
  links.forEach(driveId);
  const at = String(Date.now());
  const canonical = `${at}\n${recordId}\n${mode}\n${links.join('\n')}`;
  const signature = createHmac('sha256',process.env.PNR_DRIVE_BRIDGE_SECRET).update(canonical).digest('base64url');
  const response = await fetch(driveUrl(),{method:'POST',body:JSON.stringify({action:'deleteStoredImages',recordId,links,mode,at,signature}),signal:AbortSignal.timeout(25000)});
  if (!response.ok) throw new Error('Sambungan Drive tidak tersedia.');
  let body;
  try { body = await response.json(); } catch { throw new Error('Respons Drive tidak sah.'); }
  if (body.success !== true || (mode === 'delete' && body.deleted !== links.length)) throw new Error('Pemadaman gambar Drive belum disahkan.');
}

export async function uploadImages(images, id, meta={}) {
  validateImages(images);
  if (!images.length) return 'TIADA GAMBAR';
  // Existing Apps Script expects imgName/imgType/imgData; API validates name/dataUrl.
  const driveImages=images.map(image=>({
    imgName:image.name, imgType:image.dataUrl.slice(5,image.dataUrl.indexOf(';')),
    imgData:image.dataUrl.slice(image.dataUrl.indexOf(',')+1)
  }));
  const response = await fetch(driveUrl(),{method:'POST',body:JSON.stringify({action:'uploadImageOnly',images:driveImages,id,tanaman:meta.tanaman,negeri:meta.negeri}),signal:AbortSignal.timeout(25000)});
  if(!response.ok) throw new Error('Storan gambar tidak tersedia.');
  const text=await response.text();
  let result;
  try { result=JSON.parse(text); } catch { throw new Error('Respons storan gambar tidak sah.'); }
  if(result.success!==true) throw new Error('Gambar gagal dimuat naik.');
  return confirmedLinks(result.links,images.length);
}
