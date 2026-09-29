package my.pnr.digital.v2;
import org.json.*;
import java.util.*;
final class RecordQuery {
    static boolean matches(JSONObject row,String query,String field){StringBuilder value=new StringBuilder();String[] keys=field.isEmpty()?new String[]{"id","t","n","d","l","tn","kt","pg","p"}:new String[]{field};for(String key:keys)value.append(' ').append(row.optString(key,""));String haystack=value.toString().toLowerCase(Locale.ROOT);for(String term:query.trim().toLowerCase(Locale.ROOT).split("\\s+"))if(!term.isEmpty()&&!haystack.contains(term))return false;return true;}
    static Comparator<JSONObject> order(String order){Comparator<JSONObject> primary;if(order.equals("Luas serangan"))primary=(x,y)->Double.compare(y.optDouble("ls",0),x.optDouble("ls",0));else if(order.equals("Tanaman A–Z"))primary=Comparator.comparing(x->x.optString("tn").toLowerCase(Locale.ROOT));else if(order.equals("Tarikh terawal"))primary=Comparator.comparing(x->x.optString("t"));else primary=(x,y)->y.optString("t").compareTo(x.optString("t"));return primary.thenComparing(x->x.optString("id"));}
}
