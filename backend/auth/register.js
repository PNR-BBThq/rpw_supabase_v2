import {allowAttempt} from '../rate-limit.js';
import {validPassword} from '../passwords.js';
import {getSupabase,handleOptions,sendSuccess,sendError} from '../supabase-client.js';
export default async function handler(req,res){
 if(handleOptions(req,res))return;
 if(req.method!=='POST')return sendError(res,'Method not allowed',405);
 try{
  const {nama,ic,jawatan,negeri,uid,pwd,email}=req.body||{};
  if(![nama,ic,jawatan,negeri,uid,email].every(v=>typeof v==='string'&&v.trim().length>0&&v.length<=250)||!validPassword(pwd)||!/^[a-z0-9._@-]{1,100}$/i.test(uid)||!/^\d{12}$/.test(ic)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))return sendError(res,'Isi semua maklumat, e-mel yang sah, No. K/P 12 digit dan kata laluan sekurang-kurangnya 12 aksara.');
  if(['ALL','SEMUA'].includes(negeri.trim().toUpperCase()))return sendError(res,'Pilih negeri bertugas.');
  if(!(await allowAttempt(req,email,5)))return sendError(res,'Terlalu banyak cubaan. Cuba semula selepas 15 minit.',429);
  const db=getSupabase();
  const {data:existing,error:lookupError}=await db.from('user').select('id').eq('ic',ic).maybeSingle();
  if(lookupError||existing)return sendError(res,'Maklumat ini tidak boleh didaftarkan. Hubungi pentadbir jika anda sudah mempunyai akaun.');
  const {data,error}=await db.auth.signUp({email:email.trim().toLowerCase(),password:pwd,options:{emailRedirectTo:'https://rpw-supabase-v2.vercel.app/',data:{pnr_registration:true,nama:nama.trim(),ic,jawatan:jawatan.trim(),negeri:negeri.trim(),uid:uid.toLowerCase().trim()}}});
  if(error||!data.user)return sendError(res,'Pendaftaran belum berjaya. Semak maklumat atau hubungi pentadbir.');
  return sendSuccess(res,{},'Sila semak e-mel untuk pengesahan. Selepas itu, tunggu kelulusan admin sebelum menggunakan sistem.');
 }catch{return sendError(res,'Ralat pelayan semasa pendaftaran.',503);}
}
