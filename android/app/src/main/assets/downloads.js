(function(){
  if(window.__pnrDownloadReady)return;
  window.__pnrDownloadReady=true;
  const blobs=new Map();let port=null,busy=false;
  const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=function(blob){const url=create(blob);blobs.set(url,blob);return url;};
  URL.revokeObjectURL=function(url){setTimeout(()=>{blobs.delete(url);revoke(url);},30000);};
  window.addEventListener('message',event=>{
    if(event.data==='PNR_DOWNLOAD_PORT'&&event.ports.length===1){port=event.ports[0];port.start();}
  });
  async function save(url,name){
    if(busy){alert('Selesaikan simpanan laporan sebelumnya dahulu.');return;}
    if(!port){alert('Eksport belum tersedia. Muat semula halaman dan cuba lagi.');return;}
    busy=true;
    try{
      const blob=blobs.get(url)||await(await fetch(url)).blob();
      if(blob.size>25*1024*1024)throw new Error('Laporan melebihi 25 MB. Kecilkan tapisan dan eksport semula.');
      port.postMessage(JSON.stringify({type:'begin',name:name||'PNR-laporan',mime:blob.type||'application/octet-stream',size:blob.size}));
      const bytes=new Uint8Array(await blob.arrayBuffer());
      for(let i=0;i<bytes.length;i+=49152){
        let binary='';for(const value of bytes.subarray(i,i+49152))binary+=String.fromCharCode(value);
        port.postMessage(JSON.stringify({type:'chunk',data:btoa(binary)}));
      }
      port.postMessage(JSON.stringify({type:'end'}));
    }catch(error){port.postMessage(JSON.stringify({type:'cancel'}));alert(error.message||'Eksport gagal. Cuba lagi.');}
    finally{busy=false;}
  }
  function intercept(anchor){
    if(anchor&&/^(blob:|data:)/.test(anchor.href)){save(anchor.href,anchor.download);return true;}return false;
  }
  const nativeClick=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){if(!intercept(this))return nativeClick.call(this);};
  document.addEventListener('click',event=>{const anchor=event.target.closest?.('a');if(intercept(anchor)){event.preventDefault();event.stopImmediatePropagation();}},true);
  window.__pnrSaveDownload=save;
})();
