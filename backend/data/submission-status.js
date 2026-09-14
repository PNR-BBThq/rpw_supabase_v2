import {handleOptions,sendError,sendSuccess,getSupabase} from '../supabase-client.js';
import {authMiddleware} from '../middleware.js';
export default async function handler(req,res) {
  if(handleOptions(req,res)) return;
  if(req.method!=='POST') return sendError(res,'Method not allowed',405);
  const {user,error}=await authMiddleware(req);
  if(error) return sendError(res,error,401);
  const id=req.body?.submissionId;
  if(typeof id!=='string' || id.length>100) return sendError(res,'ID penghantaran diperlukan.');
  try {
    const result=await getSupabase().from('Data').select('id,submission_hash').eq('uid',user.uid).eq('submission_id',id).maybeSingle();
    if(result.error) return sendError(res,'Migrasi penghantaran belum tersedia.',503);
    return sendSuccess(res,{protocol:1,received:!!result.data,rowId:result.data?.id || ''});
  } catch {return sendError(res,'Semakan penghantaran gagal.',503);}
}
