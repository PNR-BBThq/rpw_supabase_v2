import { createHash, randomUUID } from 'node:crypto';
export function canonical(value) {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value && typeof value === 'object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export function prepareSubmission(body, user) {
  if (!body || typeof body !== 'object') throw new Error('Borang tidak sah.');
  const data = {};
  for (const k of ['email','tarikhBancian','negeri','daerah','lokasi','koordinat','kategori','namaTanaman','varieti','umurTanaman','syor','catatan','captionGambar','senaraiPerosak']) {
    data[k] = String(body[k] || '').trim();
    if (data[k].length > 2000) throw new Error('Maklumat terlalu panjang.');
  }
  for (const k of ['email','tarikhBancian','negeri','daerah','lokasi','koordinat','kategori','namaTanaman']) if (!data[k]) throw new Error('Lengkapkan maklumat wajib.');
  const coords=data.koordinat.split(',').map(s=>s.trim());
  if(coords.length!==2 || coords.some(s=>!s || !Number.isFinite(Number(s))) || Math.abs(Number(coords[0]))>90 || Math.abs(Number(coords[1]))>180) throw new Error('Koordinat tidak sah.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data.tarikhBancian) || !Number.isFinite(Date.parse(data.tarikhBancian)) || new Date(data.tarikhBancian).toISOString().slice(0,10)!==data.tarikhBancian || data.tarikhBancian>new Date().toISOString().slice(0,10)) throw new Error('Tarikh tidak sah.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('E-mel tidak sah.');
  data.luasBertanam=Number(body.luasBertanam);
  if(!Number.isFinite(data.luasBertanam) || data.luasBertanam<=0) throw new Error('Luas bertanam mesti melebihi sifar.');
  data.luasSerangan=typeof body.luasSerangan==='string'?JSON.parse(body.luasSerangan):body.luasSerangan||{};
  const severity=typeof body.keterukan==='string'?JSON.parse(body.keterukan):body.keterukan||{};
  if(Array.isArray(data.luasSerangan) || typeof data.luasSerangan!=='object' || !data.luasSerangan || Object.keys(data.luasSerangan).length>50) throw new Error('Maklumat perosak tidak sah.');
  data.peratusSerangan={}; data.keterukan={};
  for(const [name,value] of Object.entries(data.luasSerangan)) {
    const area=Number(value),level=Number(severity[name]);
    if(!name.trim() || name.length>200 || ['__proto__','constructor','prototype'].includes(name) || !Number.isFinite(area) || area<0 || area>data.luasBertanam || !Number.isInteger(level) || level<1 || level>5) throw new Error('Luas atau tahap serangan tidak sah.');
    data.luasSerangan[name]=area;data.peratusSerangan[name]=100*area/data.luasBertanam;data.keterukan[name]=level;
  }
  data.senaraiPerosak=Object.keys(data.luasSerangan).join(', ') || 'TIADA';
  data.images=validateImages(typeof body.images==='string'?JSON.parse(body.images):body.images||[]);
  data.namaPegawai=user.nama;
  data.statusRekod=body.statusRekod==='DRAF'?'DRAF':'BARU';
  const submissionId=body.submissionId || randomUUID();
  if(typeof submissionId!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(submissionId)) throw new Error('ID penghantaran tidak sah.');
  const hash=createHash('sha256').update(canonical(data)).digest('hex');
  const recordId='R-'+createHash('sha256').update(user.uid+'\n'+submissionId).digest('hex');
  return {data,submissionId,hash,recordId};
}
export function validateImages(images) {
  if(!Array.isArray(images) || images.length>4) throw new Error('Maksimum empat gambar.');
  for(const image of images) if(!image || typeof image.dataUrl!=='string' || image.dataUrl.length>700000 || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(image.dataUrl)) throw new Error('Gambar tidak sah atau terlalu besar.');
  return images.map(image=>({name:String(image.name||'PNR.jpg').slice(0,100),dataUrl:image.dataUrl}));
}
export function confirmedLinks(value, count) {
  const links=Array.isArray(value)?value:String(value||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(links.length!==count || links.some(link=>{try { const u=new URL(link);return u.protocol!=='https:' || !['drive.google.com','lh3.googleusercontent.com','drive.usercontent.google.com'].includes(u.hostname); } catch {return true;}})) throw new Error('Storan gambar belum mengesahkan semua gambar. Draf dikekalkan.');
  return links.join(', ');
}
