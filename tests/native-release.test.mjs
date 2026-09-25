import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,hashLegacy,verifyPassword} from '../backend/passwords.js';
import {canAccess} from '../backend/data/access.js';
import {prepareSubmission,confirmedLinks} from '../backend/data/submission.js';
const user={uid:'officer',nama:'Pegawai',role:'STAFF',state:'SELANGOR'};
const body={submissionId:'6849b850-c16b-4ae3-bb19-e1f9f57824f8',email:'a@example.com',tarikhBancian:'2026-01-01',negeri:'SELANGOR',daerah:'SEPANG',lokasi:'Kebun',koordinat:'2.9,101.7',kategori:'BUAH',namaTanaman:'MANGGA',luasBertanam:4,luasSerangan:{ulat:1},keterukan:{ulat:2},images:[]};
test('salted password hashing, legacy upgrade, malformed hash and maximum input',async()=>{
 const a=await hashPassword('long-passphrase!');const b=await hashPassword('long-passphrase!');
 assert.notEqual(a,b);assert.equal(await verifyPassword('long-passphrase!',a),true);
 assert.equal(await verifyPassword('wrong',a),false);assert.equal(await verifyPassword('old','old'),true);
 assert.equal(await verifyPassword('old',await hashLegacy('old')),true);
 assert.equal(await verifyPassword('x','scrypt$broken$hash'),false);
 await assert.rejects(()=>hashPassword('short'));assert.equal(await verifyPassword('x'.repeat(257),'x'),false);
});
test('state, ownership and supervisor authority enforced independently',()=>{
 const row={uid:user.uid,negeri:'SELANGOR',status:'BARU'};
 assert.equal(canAccess(user,row,'edit'),true);
 assert.equal(canAccess(user,{...row,uid:'other'},'edit'),false);
 assert.equal(canAccess(user,{...row,uid:null,nama:user.nama},'edit'),false);
 assert.equal(canAccess(user,row,'verify'),false);
 assert.equal(canAccess({...user,role:'ADMIN'},{...row,negeri:'JOHOR'},'delete'),false);
 assert.equal(canAccess({...user,role:'PENYELIA'},row,'verify'),true);
 assert.equal(canAccess(user,{...row,status:'DISAHKAN'},'edit'),false);
 assert.throws(()=>canAccess({...user,state:''},row));
});
test('retry IDs and hashes are stable, account-bound and ignore client identity/status',()=>{
 const a=prepareSubmission(body,user),b=prepareSubmission({...body,namaPegawai:'ADMIN',statusRekod:'DISAHKAN'},user);
 assert.equal(a.recordId,b.recordId);assert.equal(a.hash,b.hash);assert.equal(a.data.namaPegawai,user.nama);
 assert.equal(a.data.peratusSerangan.ulat,25);
 assert.notEqual(a.recordId,prepareSubmission(body,{...user,uid:'other'}).recordId);
 assert.notEqual(a.hash,prepareSubmission({...body,lokasi:'Lain'},user).hash);
});
test('invalid forms and failed image upload cannot become a successful report',()=>{
 for(const overrides of [{koordinat:'NaN,101'},{tarikhBancian:'2026-02-30'},{luasBertanam:0},{luasSerangan:{ulat:9}},{images:[{dataUrl:'<html>error</html>'}]},{submissionId:'invalid'}])assert.throws(()=>prepareSubmission({...body,...overrides},user));
 assert.throws(()=>confirmedLinks('<html>Permission denied</html>',1));
 assert.throws(()=>confirmedLinks('https://drive.google.com/file/d/a',2));
 assert.throws(()=>confirmedLinks('https://attacker.test/file',1));
 assert.equal(confirmedLinks('https://drive.google.com/file/d/a',1),'https://drive.google.com/file/d/a');
});
