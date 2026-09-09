const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function element(dataset={}) {return {dataset,hidden:false,value:'',checked:false,style:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;},classList:{toggle(){},remove(){}},resize(){}};}
const ids=new Map();const get=id=>{if(!ids.has(id))ids.set(id,element());return ids.get(id);};
const tabs=['overview','geo','records'].map(x=>element({dashboardTab:x}));
const panels=['overview','geo','records'].map(x=>element({dashboardPanel:x}));
const document={getElementById:get,addEventListener(){},querySelectorAll:s=>s==='[data-dashboard-tab]'?tabs:s==='[data-dashboard-panel]'?panels:[]};
let filterCalls=0;
const data={fData:[{t:'2026-01-01'},{t:'2026-01-22'},{t:'2026-03-10'},{t:'invalid'},{t:'2026-13-01'}]};
const context=vm.createContext({document,AppState:data,FilterManager:{v:id=>get(id).value,runFilter:()=>filterCalls++},Chart:function(el,config){Object.assign(this,config);this.update=()=>{};},requestAnimationFrame:cb=>cb(),Date});
vm.runInContext(fs.readFileSync('js/workspace.js','utf8')+'\nthis.workspace=Workspace;',context);
const w=context.workspace;w.resize=()=>{};
w.setTab('records');assert.equal(panels[2].hidden,false);assert.equal(panels[0].hidden,true);assert.equal(tabs[2].attributes['aria-selected'],'true');assert.equal(tabs[0].tabIndex,-1);
w.setPeriod('all');assert.equal(get('dS').value,'');assert.equal(get('dE').value,'');assert.equal(filterCalls,1);
w.setPeriod('90');const days=(new Date(get('dE').value)-new Date(get('dS').value))/86400000;assert.equal(days,89);assert.equal(get('modeJulat').checked,true);
w.setPeriod('month');assert.match(get('dS').value,/-01$/);
w.updateData();assert.deepEqual(Array.from(w.trend.data.datasets[0].data),[2,1]);assert.equal(w.trend.data.labels.length,2);
const chart=w.trend;data.fData=[];w.updateData();assert.equal(w.trend,chart);assert.equal(get('trendEmpty').hidden,false);assert.equal(chart.data.labels.length,0);
console.log('PASS: tab state, period presets, valid monthly aggregation, empty state, chart reuse');
