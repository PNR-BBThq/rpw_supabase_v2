import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
let profile={id:1,uid:'pegawai',nama:'Pegawai',role:'STAFF',status:'AKTIF',auth_user_id:'auth-1',email:'pegawai@example.com'};
let verified=true,closed=false,events=[],sessions=[],signupCall=null;
let verifiedPassword=true;
const client={auth:{getUser:async()=>({data:{user:verified?{id:'auth-1',email_confirmed_at:'2026-09-30'}:null},error:null}),signUp:async body=>{signupCall=body;return {data:{user:{id:'auth-2'}},error:null};},admin:{getUserById:async()=>({data:{user:verified?{email_confirmed_at:'2026-09-30'}:{}},error:null})}},from(table){let values=null,filters=[];const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},update(v){values=v;return q;},insert(v){values=v;if(table==='activity_logs')events.push(v);if(table==='session_logs')sessions.push(v);return q;},async maybeSingle(){if(table==='session_logs')return {data:{session_key:'key',logout_at:closed?'2026-09-30':null},error:null};if(filters.some(([k])=>k==='ic'))return {data:null,error:null};return {data:profile&&filters.every(([k,v])=>profile[k]===v)?profile:null,error:null};},async single(){return q.maybeSingle();},then(resolve){resolve({data:null,error:null});}};return q;}};
mock.module('../backend/supabase-client.js',{namedExports:{getSupabase:()=>client,handleOptions:()=>false,sendError:(res,message,status=400)=>res.status(status).json({success:false,message}),sendSuccess:(res,data={},message='OK')=>res.status(200).json({success:true,...data,message})}});
mock.module('../backend/rate-limit.js',{namedExports:{allowAttempt:async()=>true}});
mock.module('../backend/passwords.js',{namedExports:{validPassword:p=>typeof p==='string'&&p.length>=12,verifyPassword:async()=>verifiedPassword,hashPassword:async()=>''}});
const {verifyToken,authMiddleware}=await import('../backend/middleware.js');
const {sessionKey,recordActivity}=await import('../backend/audit.js');
const register=(await import('../backend/auth/register.js')).default;
const update=(await import('../backend/users/update.js')).default;
const jwt=sid=>'header.'+Buffer.from(JSON.stringify({session_id:sid,role:'ADMIN'})).toString('base64url')+'.signature';
const req=body=>({method:'POST',headers:{authorization:'Bearer '+jwt('s1')},body});
const response=()=>({statusCode:200,status(n){this.statusCode=n;return this;},json(v){return {status:this.statusCode,...v};}});
test('authentication checks verified identity, current approval and logout; JWT metadata grants no admin role',async()=>{
 assert.equal((await verifyToken(jwt('s1'))).role,'STAFF');
 verified=false;assert.equal(await verifyToken(jwt('s1')),null);verified=true;
 profile.status='MENUNGGU';assert.equal(await verifyToken(jwt('s1')),null);profile.status='AKTIF';
 closed=true;assert.equal(await verifyToken(jwt('s1')),null);closed=false;
 assert.equal((await update(req({row:1,field:'status',value:'AKTIF'}),response())).status,403);
});
test('audit survives JWT rotation and records server identity without credentials or image data',async()=>{
 const a=jwt('s1'),b='changed.'+a.split('.')[1]+'.changed';assert.equal(sessionKey(a),sessionKey(b));
 const request=req({pwd:'do-not-log',images:'do-not-log',row:'R1'});await authMiddleware(request);
 await recordActivity(request,'/api/data/update-entry',200);
 assert.equal(events.at(-1).actor_uid,'pegawai');assert.equal(events.at(-1).record_id,'R1');
 assert.equal(events.at(-1).event,'SURVEY_UPDATE');assert.ok(!JSON.stringify(events).includes('do-not-log'));
});
test('registration requires email and routes passwords solely to Supabase Auth',async()=>{
 const input={nama:'Nama',ic:'900101011234',jawatan:'Pegawai',negeri:'Selangor',uid:'baru',pwd:'valid-long-password',role:'ADMIN',status:'AKTIF'};
 assert.equal((await register(req(input),response())).success,false);
 assert.equal((await register(req({...input,email:'invalid'}),response())).success,false);
 assert.equal((await register(req({...input,email:'BARU@example.com'}),response())).success,true);
 assert.equal(signupCall.email,'baru@example.com');assert.equal(signupCall.options.data.role,undefined);assert.equal(signupCall.options.data.status,undefined);
 assert.equal(signupCall.password,input.pwd);
});
