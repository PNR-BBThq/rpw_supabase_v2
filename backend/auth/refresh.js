import {getSupabase,handleOptions,sendSuccess,sendError} from '../supabase-client.js';
import {checkSession,sessionKey} from '../audit.js';
import {allowAttempt} from '../rate-limit.js';
export default async function handler(req,res){
 if(handleOptions(req,res))return;
 if(req.method!=='POST')return sendError(res,'Method not allowed',405);
 const refresh=req.body?.refreshToken;
 if(typeof refresh!=='string'||!refresh||refresh.length>4096)return sendError(res,'Sesi tidak sah.',401);
 try{
  if(!(await allowAttempt(req,sessionKey(refresh),50)))return sendError(res,'Terlalu banyak cubaan.',429);
  const {data,error}=await getSupabase().auth.refreshSession({refresh_token:refresh});
  if(error||!data.session||!data.user?.email_confirmed_at)return sendError(res,'Sesi tamat.',401);
  const {data:profile,error:profileError}=await getSupabase().from('user').select('*').eq('auth_user_id',data.user.id).eq('status','AKTIF').maybeSingle();
  if(profileError||!profile||!(await checkSession(data.session.access_token,profile)))return sendError(res,'Sesi tamat atau akaun tidak aktif.',401);
  return sendSuccess(res,{token:data.session.access_token,refreshToken:data.session.refresh_token,expiresAt:data.session.expires_at});
 }catch{return sendError(res,'Sesi belum dapat disemak.',503);}
}
