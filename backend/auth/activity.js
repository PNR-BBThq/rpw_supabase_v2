import {authMiddleware} from '../middleware.js';
import {handleOptions,sendSuccess,sendError} from '../supabase-client.js';
export default async function handler(req,res){
 if(handleOptions(req,res))return;
 if(req.method!=='POST')return sendError(res,'Method not allowed',405);
 const {user,error}=await authMiddleware(req);if(error)return sendError(res,error,401);
 const {event,module}=req.body||{};
 const modules=['main','form','verify','tasks','sku','users','efficiency','redundant','tumpuan','rpw'];
 if(!['VIEW_MODULE','EXPORT_EXCEL','EXPORT_PDF'].includes(event)||!modules.includes(module))return sendError(res,'Aktiviti tidak sah.');
 if(['users','efficiency','redundant'].includes(module)&&user.role!=='ADMIN')return sendError(res,'Akses tidak dibenarkan.',403);
 req.auditEvent='CLIENT_'+event+'_'+module.toUpperCase();
 return sendSuccess(res,{},'Aktiviti diterima.');
}
