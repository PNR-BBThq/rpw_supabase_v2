import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
let user={uid:'officer',nama:'Pegawai',state:'SELANGOR',role:'STAFF'};
let dbRows=[],inserted=[],missingMigration=false;
const client={from(table){
  const filters=[];return {select(){return this;},eq(k,v){filters.push([k,v]);return this;},
    async maybeSingle(){return {data:dbRows.find(r=>filters.every(([k,v])=>r[k]===v))||null,error:missingMigration?{code:'42703'}:null};},
    async insert(rows){const row=rows[0];if(dbRows.some(r=>r.id===row.id))return {error:{code:'23505'}};dbRows.push(row);inserted.push(row);return {error:null};}
  };
}};
mock.module('../backend/supabase-client.js',{namedExports:{getSupabase:()=>client,handleOptions:()=>false,sendSuccess:(res,data={},message='OK')=>res.status(200).json({success:true,...data,message}),sendError:(res,message,status=400)=>res.status(status).json({success:false,message})}});
mock.module('../backend/middleware.js',{namedExports:{authMiddleware:async()=>user?{user,error:null}:{user:null,error:'Unauthorized'}}});
const submit=(await import('../backend/data/submit-bancian.js')).default;
const status=(await import('../backend/data/submission-status.js')).default;
const forgot=(await import('../backend/auth/forgot-password.js')).default;
const body={submissionId:'6849b850-c16b-4ae3-bb19-e1f9f57824f8',email:'a@example.com',tarikhBancian:'2026-01-01',negeri:'SELANGOR',daerah:'SEPANG',lokasi:'Kebun',koordinat:'2.9,101.7',kategori:'BUAH',namaTanaman:'MANGGA',luasBertanam:4,images:'[]'};
function call(handler,payload=body){const res={code:0,status(n){this.code=n;return this;},json(value){return {code:this.code,...value};}};return handler({method:'POST',headers:{},body:structuredClone(payload)},res);}
test('real submission handlers: unauthorized, concurrent retry, conflict, cross-state and missing migration',async()=>{
 const officer=user;user=null;assert.equal((await call(submit)).code,401);assert.equal(inserted.length,0);user=officer;
 const replies=await Promise.all([call(submit),call(submit)]);assert.ok(replies.every(r=>r.success));assert.equal(inserted.length,1);assert.equal(replies[0].rowId,replies[1].rowId);
 assert.equal((await call(submit,{...body,lokasi:'Changed'})).code,409);assert.equal(inserted.length,1);
 assert.equal((await call(submit,{...body,negeri:'JOHOR'})).code,403);
 assert.equal((await call(submit,{...body,luasBertanam:0})).code,400);
 assert.equal((await call(status)).received,true);
 user={...officer,uid:'other'};assert.equal((await call(status)).received,false);user=officer;
 missingMigration=true;assert.equal((await call(status)).code,503);assert.equal((await call(submit)).code,503);missingMigration=false;
 assert.equal((await call(forgot,{nama:'Someone',ic:'123'})).code,403);
});
