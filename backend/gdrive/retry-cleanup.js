import {getSupabase,handleOptions,sendSuccess,sendError} from '../supabase-client.js';
import {authMiddleware} from '../middleware.js';
import {runDriveCleanup} from './cleanup.js';

// Admin-only repair after a temporary Drive/Apps Script outage.
export default async function handler(req,res) {
  if(handleOptions(req,res)) return;
  if(req.method!=='POST') return sendError(res,'Method not allowed',405);
  const {user,error}=await authMiddleware(req);
  if(error) return sendError(res,error,401);
  if(String(user.role).toUpperCase()!=='ADMIN') return sendError(res,'Akses pentadbir diperlukan.',403);
  try {
    const supabase=getSupabase();
    const {data:jobs,error:dbError}=await supabase.from('pnr_drive_cleanup_jobs')
      .select('*').is('completed_at',null).order('created_at',{ascending:true}).limit(20);
    if(dbError) throw dbError;
    let completed=0;
    for(const job of jobs) if(!(await runDriveCleanup(supabase,job)).pending) completed++;
    return sendSuccess(res,{checked:jobs.length,completed,pending:jobs.length-completed});
  } catch(e) {
    console.error('Drive cleanup retry error:',e);
    return sendError(res,'Semakan pemadaman Drive belum berjaya.',503);
  }
}
