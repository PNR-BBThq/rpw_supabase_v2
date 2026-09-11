import {createHmac} from 'node:crypto';
import {getSupabase} from './supabase-client.js';
export async function allowAttempt(req, identity, maximum=10) {
  // Vercel overwrites this trusted proxy header. Never trust a body-supplied IP.
  const ip=String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
  const keys=[`ip:${ip}`,`account:${String(identity).toLowerCase()}`];
  for(const value of keys){
    const key=createHmac('sha256',process.env.PNR_TOKEN_SECRET).update(value).digest('hex');
    const {data,error}=await getSupabase().rpc('pnr_take_auth_attempt',{bucket_key:key,max_attempts:value.startsWith('ip:')?50:maximum});
    if(error) throw new Error('Auth rate limiting unavailable');
    if(data!==true)return false;
  }
  return true;
}
