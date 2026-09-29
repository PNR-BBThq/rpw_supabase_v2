import {handleOptions,sendSuccess,sendError,getSupabase} from '../supabase-client.js';
import {authMiddleware} from '../middleware.js';
import {requireRecord} from '../data/access.js';
import {uploadImages} from './storage.js';
export default async function handler(req,res) {
  if(handleOptions(req,res)) return;
  if(req.method!=='POST') return sendError(res,'Method not allowed',405);
  const {user,error}=await authMiddleware(req);
  if(error) return sendError(res,error,401);
  try {
    const {images,id}=req.body||{};
    if(!id || !(await requireRecord(getSupabase(),user,id,'edit'))) return sendError(res,'Rekod di luar kebenaran anda.',403);
    return sendSuccess(res,{links:await uploadImages(images,id)});
  } catch { return sendError(res,'Gambar gagal dimuat naik. Draf dikekalkan.',502); }
}
