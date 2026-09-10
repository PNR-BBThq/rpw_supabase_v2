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
        NativeStore store=new NativeStore(getTargetContext());store.put("test_account_A","private A");store.put("test_account_B","private B");
        check(store.get("test_account_A").equals("private A"),"Encrypted store roundtrip");
        store.remove("test_account_A");check(store.get("test_account_B").equals("private B"),"Account storage isolation");store.remove("test_account_B");
        result.putString("nativeChecks","passed");finish(-1,result);
    }catch(Throwable e){result.putString("nativeChecks","FAILED: "+e);finish(0,result);}}
}
