import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {driveId,deleteDriveImages} from '../backend/gdrive/storage.js';
import {scheduleDriveCleanup,runDriveCleanup} from '../backend/gdrive/cleanup.js';

const fileId='A'.repeat(30);
const link=`https://drive.google.com/file/d/${fileId}/view`;

test('only canonical Drive links can identify a file to delete',()=>{
  assert.equal(driveId(link),fileId);
  for(const url of ['https://evil.example/'+fileId,'javascript:alert(1)',
    'https://drive.google.com.evil.example/file/d/'+fileId+'/view',
    'https://drive.google.com/file/d/no/view']) assert.throws(()=>driveId(url));
});

test('Drive bridge requires signed proof and exact deletion receipt',async()=>{
  const oldSecret=process.env.PNR_DRIVE_BRIDGE_SECRET;
  const oldUrl=process.env.PNR_IMAGE_UPLOAD_URL;
  const oldFetch=globalThis.fetch;
  process.env.PNR_DRIVE_BRIDGE_SECRET='test-secret-with-at-least-32-bytes-long';
  process.env.PNR_IMAGE_UPLOAD_URL='https://script.google.com/macros/s/TEST/exec';
  const calls=[];
  globalThis.fetch=async(_url,options)=>{
    const body=JSON.parse(options.body);
    const canonical=`${body.at}\n${body.recordId}\n${body.mode}\n${body.links.join('\n')}`;
    assert.equal(body.signature,createHmac('sha256',process.env.PNR_DRIVE_BRIDGE_SECRET).update(canonical).digest('base64url'));
    calls.push(body);
    return {ok:true,json:async()=>({success:true,checked:1,deleted:body.mode==='delete'?1:undefined})};
  };
  try {
    await deleteDriveImages([link],'R-123','probe');
    await deleteDriveImages([link],'R-123');
    assert.deepEqual(calls.map(c=>c.mode),['probe','delete']);
    globalThis.fetch=async()=>({ok:true,json:async()=>({success:true,deleted:0})});
    await assert.rejects(deleteDriveImages([link],'R-123'),/belum disahkan/);
  } finally {
    globalThis.fetch=oldFetch;
    if(oldSecret===undefined) delete process.env.PNR_DRIVE_BRIDGE_SECRET;
    else process.env.PNR_DRIVE_BRIDGE_SECRET=oldSecret;
    if(oldUrl===undefined) delete process.env.PNR_IMAGE_UPLOAD_URL;
    else process.env.PNR_IMAGE_UPLOAD_URL=oldUrl;
  }
});

test('a still-referenced file remains queued and is never sent to Drive',async()=>{
  const oldSecret=process.env.PNR_DRIVE_BRIDGE_SECRET;
  const oldFetch=globalThis.fetch;
  process.env.PNR_DRIVE_BRIDGE_SECRET='test-secret-with-at-least-32-bytes-long';
  let fetches=0;
  globalThis.fetch=async()=>{fetches++;return {ok:true,json:async()=>({success:true})};};
  const queue={id:'job',links:[link],record_id:'R-123',attempts:0};
  const supabase={from(table){return table==='Data'
    ? {select:()=>({ilike:()=>({limit:async()=>({data:[{id:'other'}],error:null})})})}
    : {update:()=>({eq:async()=>({error:null})})};}};
  try {
    assert.deepEqual(await runDriveCleanup(supabase,queue),{pending:true});
    assert.equal(fetches,0);
  } finally {
    globalThis.fetch=oldFetch;
    if(oldSecret===undefined)delete process.env.PNR_DRIVE_BRIDGE_SECRET;
    else process.env.PNR_DRIVE_BRIDGE_SECRET=oldSecret;
  }
});

test('Apps Script checks the PNR folder before permanently deleting an image',()=>{
  const secret='test-secret-with-at-least-32-bytes-long';
  const root='PNR_FOLDER';
  const one=folder=>{let left=true;return {hasNext:()=>left,next:()=>{left=false;return folder;}};};
  const file={getParents:()=>one({getId:()=>root})};
  let deleted=0;
  const ctx={PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},
    Utilities:{computeHmacSha256Signature:(payload,key)=>[...createHmac('sha256',key).update(payload).digest()],
      base64EncodeWebSafe:bytes=>Buffer.from(bytes).toString('base64url')},
    DriveApp:{getFileById:()=>file},UPLOAD_FOLDER_ID:root,Date,console:{error:()=>{}},
    ScriptApp:{getOAuthToken:()=> 'test-token'},
    UrlFetchApp:{fetch:(url,options)=>{
      assert.equal(url,`https://www.googleapis.com/drive/v3/files/${fileId}`);
      assert.equal(options.method,'delete');
      assert.equal(options.headers.Authorization,'Bearer test-token');
      deleted++;
      return {getResponseCode:()=>204};
    }}};
  const source=readFileSync(new URL('../gas/drive-image-bridge.gs',import.meta.url),'utf8');
  runInNewContext(`${source};globalThis.bridge=pnrDeleteStoredImages_;`,ctx);
  const at=String(Date.now());
  const signature=createHmac('sha256',secret).update(`${at}\nR-123\ndelete\n${link}`).digest('base64url');
  const request={links:[link],at,recordId:'R-123',mode:'delete',signature};
  assert.equal(ctx.bridge(request).success,true);
  assert.equal(deleted,1);
  assert.equal(ctx.bridge({...request,signature:'wrong'}).success,false);
  assert.equal(deleted,1);
  ctx.UrlFetchApp.fetch=()=>({getResponseCode:()=>403});
  assert.equal(ctx.bridge(request).success,false);
  file.getParents=()=>one({getId:()=> 'OTHER_FOLDER',getParents:()=>({hasNext:()=>false})});
  assert.equal(ctx.bridge(request).success,false);
  assert.equal(deleted,1);
});
