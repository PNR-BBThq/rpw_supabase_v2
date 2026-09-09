package my.pnr.digital.v2;
import org.json.*;
import javax.net.ssl.HttpsURLConnection;
import java.net.URL;
import java.io.*;
import java.nio.charset.StandardCharsets;
final class ApiClient {
    static final String ORIGIN="https://rpw-supabase-v2.vercel.app";
    static class ApiError extends Exception {final int status;ApiError(int code,String text){super(text);status=code;}}
    static JSONObject post(String route,JSONObject payload,String token,String uid)throws Exception{
        HttpsURLConnection connection=(HttpsURLConnection)new URL(ORIGIN+"/api/"+route).openConnection();
        connection.setRequestMethod("POST");connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(20000);connection.setReadTimeout(60000);connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");
        if(!token.isEmpty())connection.setRequestProperty("Authorization","Bearer "+token);
        if(!uid.isEmpty()&&!route.equals("auth/login"))payload.put("u",uid);
        try{
            byte[] body=payload.toString().getBytes(StandardCharsets.UTF_8);connection.setFixedLengthStreamingMode(body.length);
            try(OutputStream out=connection.getOutputStream()){out.write(body);}
            int code=connection.getResponseCode();InputStream stream=code<400?connection.getInputStream():connection.getErrorStream();
            if(stream==null)throw new ApiError(code,"Pelayan tidak memberi respons. Cuba lagi.");
            ByteArrayOutputStream buffer=new ByteArrayOutputStream();byte[] chunk=new byte[8192];int n;try(InputStream in=stream){while((n=in.read(chunk))!=-1){if(buffer.size()+n>40*1024*1024)throw new IOException("Respons terlalu besar");buffer.write(chunk,0,n);}}
            JSONObject result;try{result=new JSONObject(new String(buffer.toByteArray(),StandardCharsets.UTF_8));}catch(JSONException e){throw new ApiError(code,"Respons pelayan tidak dapat dibaca.");}
            if(code>=300||!result.optBoolean("success",false))throw new ApiError(code,result.optString("message","Permintaan gagal."));
            return result;
        }finally{connection.disconnect();}
    }
}
