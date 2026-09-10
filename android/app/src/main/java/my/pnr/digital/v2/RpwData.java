package my.pnr.digital.v2;

import org.json.*;
import java.util.*;

/** RPW calculations shared by the native screens. Missing readings are never classified as zero. */
final class RpwData {
    static String value(JSONObject r,String key){return r.optString(key,"").trim();}
    static String normalized(JSONObject r,String key){return value(r,key).toUpperCase(Locale.ROOT);}
    static String trap(JSONObject r){return normalized(r,"negeri")+"\u001f"+normalized(r,"daerah")+"\u001f"+normalized(r,"lokasi_pemasangan");}
    static String day(JSONObject r){String s=value(r,"tarikh_kutip");return s.length()>=10?s.substring(0,10):s;}
    static boolean validDate(JSONObject r){try{java.text.SimpleDateFormat f=new java.text.SimpleDateFormat("yyyy-MM-dd",Locale.US);f.setLenient(false);String d=day(r);return d.matches("\\d{4}-\\d{2}-\\d{2}")&&f.format(f.parse(d)).equals(d);}catch(Exception e){return false;}}
    static double count(JSONObject r,String key){double n=r.optDouble(key,0);return Double.isFinite(n)?Math.max(0,n):0;}
    static double rv(JSONObject r){return count(r,"bil_tangkapan_rv_jantan")+count(r,"bil_tangkapan_rv_betina");}
    static String status(JSONObject r){String s=normalized(r,"status_rtd_rf").replace(" ","");return Arrays.asList("RTD=0","RTD<1","RTD=1","RTD>1").contains(s)?s:"BELUM DINILAI";}
    static double[] coordinates(JSONObject r){try{String[] p=value(r,"lat_long").split(",",-1);if(p.length!=2)return null;double lat=Double.parseDouble(p[0].trim()),lon=Double.parseDouble(p[1].trim());if(!Double.isFinite(lat)||!Double.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;return new double[]{lat,lon};}catch(Exception e){return null;}}
    static boolean malaysia(JSONObject r){double[] p=coordinates(r);return p!=null&&((p[0]>=1&&p[0]<=7&&p[1]>=99&&p[1]<=105)||(p[0]>=.8&&p[0]<=7.5&&p[1]>=109&&p[1]<=120));}
    static List<JSONObject> filter(JSONArray source,String year,String state,String district,String query){List<JSONObject> out=new ArrayList<>();for(int i=0;i<source.length();i++){JSONObject r=source.optJSONObject(i);if(r==null)continue;if(!year.isEmpty()&&!day(r).startsWith(year+"-"))continue;if(!state.isEmpty()&&!normalized(r,"negeri").equals(state))continue;if(!district.isEmpty()&&!normalized(r,"daerah").equals(district))continue;String hay=trap(r)+" "+value(r,"row_id")+" "+value(r,"jenis_komoditi");if(!hay.toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT)))continue;out.add(r);}out.sort((a,b)->{int d=day(b).compareTo(day(a));return d!=0?d:value(a,"row_id").compareTo(value(b,"row_id"));});return out;}
    static List<JSONObject> latest(List<JSONObject> history){Map<String,JSONObject> result=new LinkedHashMap<>();for(JSONObject r:history){String key=trap(r);if(value(r,"lokasi_pemasangan").isEmpty())key+="\u001f"+value(r,"row_id");JSONObject old=result.get(key);if(old==null||day(r).compareTo(day(old))>0)result.put(key,r);}return new ArrayList<>(result.values());}
    static Map<String,Integer> duplicates(List<JSONObject> rows){Map<String,Integer> out=new HashMap<>();for(JSONObject r:rows){String k=trap(r)+"\u001f"+day(r);out.put(k,out.getOrDefault(k,0)+1);}return out;}
    static boolean duplicate(JSONObject r,Map<String,Integer> map){return map.getOrDefault(trap(r)+"\u001f"+day(r),0)>1;}
    static List<JSONObject> withStatus(List<JSONObject> rows,String status){List<JSONObject> out=new ArrayList<>();for(JSONObject r:rows)if(status.isEmpty()||status(r).equals(status))out.add(r);return out;}
}
