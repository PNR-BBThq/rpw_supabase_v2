import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('report follows sample: record count, four KPIs, per-record pest and syor row',async()=>{
  const capture={};
  const button={innerHTML:'PDF',disabled:false};
  class PDF {
    constructor(config) {capture.config=config;}
    setProperties(x){capture.properties=x;}
    setTextColor(){} setDrawColor(){} setLineWidth(){} setFont(){} setFontSize(){}
    line(){} roundedRect(){}
    text(value){(capture.text ||= []).push(value);}
    addImage(){}
    autoTable(config){capture.table=config;}
    save(name){capture.name=name;}
  }
  const ctx={window:{jspdf:{jsPDF:PDF}},document:{getElementById:id=>id==='btnDlPDF'?button:null},
    AppState:{uProf:{state:'ALL',name:'PEGAWAI UJIAN'},fData:[
      {t:'2026-08-20',d:'JASIN',l:'KEBUN',tn:'PADI',lt:2,ls:1,p:{'PEROSAK A':0.4,'PEROSAK B':0.6},s:'Syor ujian',catatan:'Catatan ujian'},
      {t:'2026-08-21',d:'JASIN',l:'TAPAK',tn:'PADI',lt:1,ls:0,p:{},s:'-'}
    ]},console,Intl,Date,Image:class{},alert:()=>{throw Error('unexpected alert')}};
  const source=readFileSync(new URL('../js/exports.js',import.meta.url),'utf8');
  runInNewContext(`${source}; globalThis.exportsForTest=ExportManager;`,ctx);
  ctx.exportsForTest.reportLogo=async()=>null;
  await ctx.exportsForTest.dlPDF();
  assert.equal(capture.config.orientation,'landscape');
  assert.equal(capture.table.head[0].length,9);
  assert.equal(capture.table.body.length,4);
  assert.equal(capture.table.body[0][0],'1');
  assert.equal(capture.table.body[0][6],'PEROSAK A\nPEROSAK B');
  assert.match(capture.table.body[1][0].content,/SYOR: Syor ujian\nCATATAN: Catatan ujian/);
  assert.match(capture.text.join(' '),/3\.00 Ha/);
  assert.match(capture.text.join(' '),/1\.00 Ha/);
  assert.match(capture.text.join(' '),/33\.33%/);
  assert.match(capture.name,/DATA PNR SEMUA/);
  assert.equal(button.disabled,false);
});
