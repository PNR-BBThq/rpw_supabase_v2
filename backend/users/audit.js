import {authMiddleware} from '../middleware.js';
import {getSupabase,handleOptions,sendSuccess,sendError} from '../supabase-client.js';
export default async function handler(req,res){
 if(handleOptions(req,res))return;
 if(!['GET','POST'].includes(req.method))return sendError(res,'Method not allowed',405);
 const {user,error}=await authMiddleware(req);if(error)return sendError(res,error,401);
 if(user.role!=='ADMIN')return sendError(res,'Akses ini untuk admin sahaja.',403);
 const input=req.method==='GET'?req.query||{}:req.body||{};
 const page=Math.max(0,Math.min(10000,Number.parseInt(input.page,10)||0));
 const kind=input.kind==='sessions'?'sessions':'activities';
 let q=getSupabase().from(kind==='sessions'?'session_logs':'activity_logs').select(kind==='sessions'?'id,actor_uid,user_name,user_role,auth_provider,login_at,last_seen_at,logout_at,user_agent':'id,actor_uid,occurred_at,event,route,outcome,record_id,http_status',{count:'exact'});
 if(input.uid){if(typeof input.uid!=='string'||input.uid.length>100)return sendError(res,'ID tidak sah.');q=q.eq('actor_uid',input.uid);}
 if(input.from){if(!Number.isFinite(Date.parse(input.from)))return sendError(res,'Tarikh tidak sah.');q=q.gte(kind==='sessions'?'login_at':'occurred_at',new Date(input.from).toISOString());}
 const {data,count,error:dbError}=await q.order(kind==='sessions'?'login_at':'occurred_at',{ascending:false}).order('id',{ascending:false}).range(page*50,page*50+49);
 if(dbError)return sendError(res,'Log belum dapat dimuatkan.',503);
 return sendSuccess(res,{entries:data||[],total:count,page,pageSize:50});
}
