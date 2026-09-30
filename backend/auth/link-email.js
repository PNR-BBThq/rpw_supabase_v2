// Prove control of the existing account AND verified email before linking identities.
import {authMiddleware} from '../middleware.js';
import {verifyPassword,validPassword} from '../passwords.js';
import {allowAttempt} from '../rate-limit.js';
import {getSupabase,handleOptions,sendSuccess,sendError} from '../supabase-client.js';
import {openSession} from '../audit.js';
export default async function handler(req,res){
 if(handleOptions(req,res))return;
 if(req.method!=='POST')return sendError(res,'Method not allowed',405);
 const {user,error}=await authMiddleware(req);if(error)return sendError(res,error,401);
 if(user.auth_user_id)return sendError(res,'Akaun anda sudah menggunakan Supabase Auth.',409);
 const {email,password,currentPassword,phase}=req.body||{};
 if(!['start','complete'].includes(phase)||typeof email!=='string'||email.length>250||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!validPassword(password))return sendError(res,'Isi e-mel yang sah dan kata laluan baharu sekurang-kurangnya 12 aksara.');
 try{
  if(!(await allowAttempt(req,user.uid,5)))return sendError(res,'Terlalu banyak cubaan. Cuba semula selepas 15 minit.',429);
  if(!(await verifyPassword(currentPassword,user.pwd)))return sendError(res,'Kata laluan akaun lama tidak sah.',403);
  const db=getSupabase();
  if(phase==='start'){
   if(user.pending_auth_user_id)return sendError(res,'Pengesahan e-mel sudah dimulakan. Sahkan e-mel tersebut, kemudian pilih Selesaikan pautan.',409);
   const {data:conflict,error:lookupError}=await db.from('user').select('id').eq('email',email.trim().toLowerCase()).maybeSingle();
   if(lookupError||conflict)return sendError(res,'E-mel ini tidak boleh dipautkan. Hubungi admin.',409);
   // No pnr_registration metadata: do not create a duplicate application profile.
   const {data,error:signupError}=await getSupabase().auth.signUp({email:email.trim().toLowerCase(),password,options:{emailRedirectTo:'https://rpw-supabase-v2.vercel.app/'}});
   if(signupError||!data.user)return sendError(res,'Pautan belum berjaya dimulakan. Semak e-mel atau hubungi admin.');
   const {data:saved,error:saveError}=await db.from('user').update({pending_auth_user_id:data.user.id}).eq('id',user.id).is('pending_auth_user_id',null).is('auth_user_id',null).select('id').maybeSingle();
   if(saveError||!saved)return sendError(res,'Pautan belum dapat disimpan. Hubungi admin.',409);
   return sendSuccess(res,{},'Semak dan sahkan e-mel anda. Kemudian pilih Selesaikan pautan menggunakan e-mel dan kata laluan baharu yang sama.');
  }
  if(!user.pending_auth_user_id)return sendError(res,'Mulakan pengesahan e-mel dahulu.',409);
  const {data:auth,error:authError}=await getSupabase().auth.signInWithPassword({email:email.trim().toLowerCase(),password});
  if(authError||!auth.session||!auth.user?.email_confirmed_at||auth.user.id!==user.pending_auth_user_id)return sendError(res,'E-mel belum disahkan atau maklumat akaun baharu tidak sepadan.',403);
  const {data:linked,error:linkError}=await db.from('user').update({auth_user_id:auth.user.id,pending_auth_user_id:null,email:auth.user.email.toLowerCase(),pwd:null}).eq('id',user.id).eq('pending_auth_user_id',auth.user.id).is('auth_user_id',null).select('*').maybeSingle();
  if(linkError||!linked)return sendError(res,'Pautan belum berjaya diselesaikan. Hubungi admin.',409);
  // Legacy tokens are invalid immediately because auth_user_id is now present.
  await db.from('session_logs').update({logout_at:new Date().toISOString()}).eq('user_id',user.id).is('logout_at',null);
  await openSession(req,linked,auth.session.access_token,'supabase');
  return sendSuccess(res,{token:auth.session.access_token,refreshToken:auth.session.refresh_token,expiresAt:auth.session.expires_at,authProvider:'supabase',uid:linked.uid,name:linked.nama,role:linked.role,state:linked.negeri,negeri:linked.negeri,jawatan:linked.jawatan},'Akaun dipautkan. Gunakan e-mel untuk log masuk selepas ini.');
 }catch{return sendError(res,'Pautan belum dapat diproses.',503);}
}
