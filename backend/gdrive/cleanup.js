import { deleteDriveImages, driveId } from './storage.js';

export async function scheduleDriveCleanup(supabase, recordId, links, uid) {
  if (!links.length) return [];
  links.forEach(driveId);
  await deleteDriveImages(links,recordId,'probe');
  const {data,error}=await supabase.from('pnr_drive_cleanup_jobs')
    .insert(links.map(link=>({record_id:recordId,links:[link],requested_by:uid}))).select('*');
  if(error || data?.length!==links.length) throw new Error('Gagal merekod tugasan pemadaman gambar. Rekod tidak diubah.');
  return data;
}

export async function runDriveCleanupJobs(supabase,jobs) {
  let pending=false;
  for(const job of jobs) if((await runDriveCleanup(supabase,job)).pending) pending=true;
  return {pending};
}

export async function runDriveCleanup(supabase,job) {
  if (!job) return {pending:false};
  try {
    for(const link of job.links) {
      const id=driveId(link);
      // A shared or still-referenced image must never be trashed.
      const escaped=id.replace(/[\\%_]/g,'\\$&');
      const {data,error}=await supabase.from('Data').select('id').ilike('image_links',`%${escaped}%`).limit(1);
      if(error) throw new Error('Gagal menyemak rujukan gambar.');
      if(data?.length) throw new Error('Gambar masih dirujuk oleh rekod lain atau perubahan belum disimpan.');
    }
    await deleteDriveImages(job.links,job.record_id);
    const {error}=await supabase.from('pnr_drive_cleanup_jobs')
      .update({completed_at:new Date().toISOString(),attempts:job.attempts+1,last_error:null})
      .eq('id',job.id);
    if(error) throw new Error('Gagal mengesahkan tugasan pemadaman.');
    return {pending:false};
  } catch(e) {
    await supabase.from('pnr_drive_cleanup_jobs')
      .update({attempts:job.attempts+1,last_error:String(e.message).slice(0,200)})
      .eq('id',job.id);
    return {pending:true};
  }
}
