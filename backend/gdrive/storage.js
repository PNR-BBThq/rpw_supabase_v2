import { confirmedLinks, validateImages } from '../data/submission.js';
export async function uploadImages(images, id) {
  validateImages(images);
  if (!images.length) return 'TIADA GAMBAR';
  const url = new URL(process.env.PNR_IMAGE_UPLOAD_URL || 'https://script.google.com/macros/s/AKfycbznIzUO_1G9vhSrD7I2JLAnPmFNbPK5plRjPwbnW9T9rFO-2X5nVAQk0utLSxjSffjY/exec');
  if(url.protocol!=='https:' || url.hostname!=='script.google.com' || !url.pathname.endsWith('/exec')) throw new Error('Konfigurasi storan tidak sah.');
  const response = await fetch(url,{method:'POST',body:JSON.stringify({action:'uploadImageOnly',images,id}),signal:AbortSignal.timeout(25000)});
  if(!response.ok) throw new Error('Storan gambar tidak tersedia.');
  const text=await response.text();
  let result;
  try { result=JSON.parse(text); } catch { result={success:true,links:text}; }
  if(!result.success) throw new Error('Gambar gagal dimuat naik.');
  return confirmedLinks(result.links,images.length);
}
