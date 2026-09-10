import test from 'node:test';
import assert from 'node:assert/strict';
import { issueToken, readToken, signingReady } from '../backend/token-signing.js';
import { stateScope, matchesScope, validateMutation } from '../backend/rpw/policy.js';
const key = 'test-secret-with-at-least-32-bytes-long';
test('signed token rejects tampering, wrong keys, expiry and legacy sessions', () => {
  const token = issueToken('officer', key, 1000);
  assert.equal(readToken(token, key, 2000).uid, 'officer');
  const [payload, sig] = token.split('.');
  const modified = Buffer.from(JSON.stringify({uid:'admin', exp:900000000})).toString('base64');
  assert.equal(readToken(modified+'.'+sig,key,2000), null);
  assert.equal(readToken(token,key+'wrong',2000),null);
  assert.equal(readToken(token,key,86401000),null);
  assert.equal(readToken(payload,key,2000),null);
  assert.equal(signingReady('short'),false);
});
test('legacy deployment remains readable but cannot enable signed mutation configuration', () => {
  const legacy=issueToken('officer','',1000);
  assert.equal(readToken(legacy,'',2000).uid,'officer');
  assert.equal(readToken(legacy,key,2000),null);
  assert.equal(signingReady(''),false);
});
test('RPW scope handles Cameron Highlands separately and refuses missing scope', () => {
  assert.throws(()=>stateScope({role:'ADMIN'}));
  assert.equal(stateScope({state:'ALL'}),null);
  const cameron={negeri:'PAHANG',daerah:'CAMERON HIGHLANDS'};
  assert.equal(matchesScope(cameron,'PAHANG'),false);
  assert.equal(matchesScope(cameron,'CAMERON HIGHLANDS'),true);
  assert.equal(matchesScope({negeri:'SELANGOR',daerah:'SEPANG'},'PAHANG'),false);
});
test('mutation validator rejects malformed coordinates and unknown actions', () => {
  for(const value of ['',',','2,','NaN,101','91,101','2,181','2,101,4']) assert.throws(()=>validateMutation({action:'UPDATE_GPS',row_id:'R1',value}));
  assert.equal(validateMutation({action:'UPDATE_GPS',row_id:'R1',value:'2.9, 101.7'}).value,'2.9, 101.7');
  assert.throws(()=>validateMutation({action:'INSERT',row_id:'R1'}));
  assert.throws(()=>validateMutation({action:'UPDATE_LOCATION',row_id:'R1',value:' '}));
});
