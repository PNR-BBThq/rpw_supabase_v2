import {createHash} from 'node:crypto';
import {getSupabase} from './supabase-client.js';
export function sessionKey(token) {
 // JWT claims are used only as a correlation key, never as proof of authentication.
 let identity=token;
 if(token.split('.').length===3){try{const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());if(typeof claims.session_id==='string')identity='supabase:'+claims.session_id;}catch{}}
 return createHash('sha256').update(identity).digest('hex');
}
export async function openSession(req,user,token,provider) {
 const key=sessionKey(token),db=getSupabase();
 const {error}=await db.from('session_logs').insert({session_key:key,user_id:user.id,actor_uid:user.uid,user_name:user.nama,user_role:user.role,auth_provider:provider,user_agent:String(req.headers['user-agent']||'').slice(0,300)});
 if(error)throw new Error('Session audit unavailable');
 req.auditUser=user;req.auditSession=key;
}
export async function checkSession(token,user) {
 const key=sessionKey(token),db=getSupabase();
 const {data,error}=await db.from('session_logs').select('session_key,logout_at').eq('session_key',key).maybeSingle();
 if(error||data?.logout_at)return false;
 // Sessions issued before this release continue until their existing expiry.
 if(!data){const {error:insertError}=await db.from('session_logs').insert({session_key:key,user_id:user.id,actor_uid:user.uid,user_name:user.nama,user_role:user.role,auth_provider:'restored'});if(insertError&&insertError.code!=='23505')return false;}
 return true;
}
export function auditEvent(route) {
 const names={'auth/login':'LOGIN','auth/logout':'LOGOUT','auth/log-session':'SESSION_RESUMED','users/update':'USER_REVIEW_OR_UPDATE','users/delete':'USER_DELETE','data/submit-bancian':'SURVEY_SUBMIT','data/update-entry':'SURVEY_UPDATE','data/delete-entry':'SURVEY_DELETE','data/verify':'SURVEY_REVIEW','gdrive/upload':'IMAGE_UPLOAD','export/pdf':'PDF_EXPORT','rpw/mutate':'RPW_UPDATE'};
 const path=route.replace(/^\/api\//,'');return names[path]||path.toUpperCase().replaceAll('/','_');
}
export async function recordActivity(req,route,status) {
 if(!req.auditUser||route==='/api/users/audit')return;
 const db=getSupabase();
 await db.from('session_logs').update({last_seen_at:new Date().toISOString()}).eq('session_key',req.auditSession);
 const {error}=await db.from('activity_logs').insert({user_id:req.auditUser.id,actor_uid:req.auditUser.uid,session_key:req.auditSession,event:req.auditEvent||auditEvent(route),route,outcome:status>=500?'FAILED':status>=400?'DENIED':'SUCCESS',http_status:status,record_id:String(req.auditRecord||req.body?.row_id||req.body?.row||'').slice(0,100)||null});
 if(error)throw new Error('Activity audit unavailable');
}
