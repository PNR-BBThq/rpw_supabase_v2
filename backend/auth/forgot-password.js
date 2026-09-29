import { handleOptions, sendError } from '../supabase-client.js';
export default async function handler(req,res) {
  if(handleOptions(req,res)) return;
  return sendError(res, 'Untuk pemulihan akses, hubungi pentadbir PNR bagi pengesahan identiti dan penetapan kata laluan baharu.', 403);
}
