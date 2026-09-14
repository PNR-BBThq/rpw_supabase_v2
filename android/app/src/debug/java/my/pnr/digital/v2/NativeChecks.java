package my.pnr.digital.v2;

import android.app.Instrumentation;
import android.os.Bundle;
import org.json.*;
import java.util.*;

/** Runs against Android's real org.json implementation, without production accounts or network. */
public final class NativeChecks extends Instrumentation {
    private void check(boolean value,String message){if(!value)throw new AssertionError(message);}
    @Override public void onCreate(Bundle args){super.onCreate(args);start();}
    @Override public void onStart(){Bundle result=new Bundle();try{
        JSONObject old=new JSONObject("{\"row_id\":\"1\",\"negeri\":\"SELANGOR\",\"daerah\":\"SEPANG\",\"lokasi_pemasangan\":\"A\",\"tarikh_kutip\":\"2025-12-31\",\"lat_long\":\"2.9,101.7\"}");
        JSONObject current=new JSONObject(old.toString());current.put("row_id","2").put("tarikh_kutip","2026-01-03");
        JSONArray source=new JSONArray().put(old).put(current);
        check(RpwData.latest(RpwData.filter(source,"2025","","","")).get(0).getString("row_id").equals("1"),"Year-scoped latest record");
        check(RpwData.latest(RpwData.filter(source,"","","","")).size()==1,"Trap identity");
        check(RpwData.status(old).equals("BELUM DINILAI"),"Missing RTD is not zero");
        check(RpwData.malaysia(old),"Valid Malaysia coordinate");
        check(RpwData.coordinates(new JSONObject().put("lat_long","NaN,101"))==null,"NaN coordinate rejected");
        check(!RpwData.validDate(new JSONObject().put("tarikh_kutip","2026-02-30")),"Invalid calendar date rejected");
        JSONObject otherState=new JSONObject(current.toString()).put("negeri","PAHANG");
        List<JSONObject> duplicates=Arrays.asList(current,otherState);
        check(!RpwData.duplicate(current,RpwData.duplicates(duplicates)),"Cross-state locations are not duplicate traps");
        JSONObject report=new JSONObject().put("tn","Padi").put("n","SELANGOR").put("l","Plot Utara").put("t","2026-09-01").put("ls",1.5).put("id","A").put("p",new JSONObject().put("Ulat batang",1.5));
        check(RecordQuery.matches(report,"padi SELANGOR",""),"AND search across fields, case insensitive");
        check(!RecordQuery.matches(report,"padi johor",""),"Every search term must match");
        check(!RecordQuery.matches(report,"selangor","tn"),"Selected search field is enforced");
        check(RecordQuery.matches(report,"ulat batang","p"),"Nested pest search");
        JSONObject earlier=new JSONObject(report.toString()).put("id","B").put("t","2025-12-01").put("ls",3);
        List<JSONObject> ordered=new ArrayList<>(Arrays.asList(earlier,report));ordered.sort(RecordQuery.order("Tarikh terkini"));check(ordered.get(0)==report,"Newest date sorting");ordered.sort(RecordQuery.order("Luas serangan"));check(ordered.get(0)==earlier,"Numeric attack-area sorting");
        NativeStore store=new NativeStore(getTargetContext());store.put("test_account_A","private A");store.put("test_account_B","private B");
        check(store.get("test_account_A").equals("private A"),"Encrypted store roundtrip");
        store.remove("test_account_A");check(store.get("test_account_B").equals("private B"),"Account storage isolation");store.remove("test_account_B");
        List<JSONObject> pdfRows=new ArrayList<>();for(int i=0;i<17;i++)pdfRows.add(new JSONObject().put("t","2026-09-11").put("l","Sawah contoh "+i).put("tn","Padi").put("d","SEPANG").put("n","SELANGOR").put("lt",12.5));
        byte[] pdf=ReportPdf.create(pdfRows,"Pegawai ujian","2026-09-11");
        java.io.File pdfFile=new java.io.File(getTargetContext().getFilesDir(),"sample-report.pdf");
        try(java.io.FileOutputStream out=new java.io.FileOutputStream(pdfFile)){out.write(pdf);}
        try(android.graphics.pdf.PdfRenderer renderer=new android.graphics.pdf.PdfRenderer(android.os.ParcelFileDescriptor.open(pdfFile,android.os.ParcelFileDescriptor.MODE_READ_ONLY))){check(renderer.getPageCount()==2,"Native PDF pagination and readability");}
        result.putString("nativeChecks","passed");finish(-1,result);
    }catch(Throwable e){result.putString("nativeChecks","FAILED: "+e);finish(0,result);}}
}
