import {authMiddleware} from '../middleware.js';
import {getSupabase,handleOptions,sendSuccess,sendError} from '../supabase-client.js';
export default async function handler(req,res){
 if(handleOptions(req,res))return;
 if(req.method!=='POST')return sendError(res,'Method not allowed',405);
 const {user,error}=await authMiddleware(req);if(error)return sendError(res,error,401);
 const {error:dbError}=await getSupabase().from('session_logs').update({logout_at:new Date().toISOString()}).eq('session_key',req.auditSession);
 if(dbError)return sendError(res,'Sesi belum berjaya ditamatkan.',503);
 if(user.auth_user_id)await getSupabase().auth.admin.signOut(req.headers.authorization.replace('Bearer ',''),'local');
 return sendSuccess(res,{},'Anda telah log keluar.');
}
