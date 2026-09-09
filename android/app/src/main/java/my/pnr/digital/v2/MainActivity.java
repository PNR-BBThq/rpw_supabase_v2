package my.pnr.digital.v2;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.JSONObject;
import java.io.*;
import java.util.*;

/** Android shell for the V2 system. No database credentials or unrestricted JS interface. */
public class MainActivity extends Activity {
    private static final String ORIGIN="https://rpw-supabase-v2.vercel.app";
    private static final int PICK=11, CAMERA=12, SAVE=13, LOCATION=14, MAX_DOWNLOAD=25*1024*1024;
    private WebView web;
    private ProgressBar progress;
    private LinearLayout errorPanel;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;
    private WebMessagePort downloadPort;
    private ByteArrayOutputStream incoming;
    private int expectedSize;
    private byte[] pendingSave;
    private String downloadName, downloadMime;
    private boolean saving=false;
    private String bridgeScript;

    private boolean trusted(String url) {
        if(url==null)return false;
        Uri uri=Uri.parse(url);
        return "https".equalsIgnoreCase(uri.getScheme()) && "rpw-supabase-v2.vercel.app".equalsIgnoreCase(uri.getHost()) && (uri.getPort()==-1||uri.getPort()==443);
    }
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private void toast(String text){Toast.makeText(this,text,Toast.LENGTH_LONG).show();}
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(20,43,37));
        if(Build.VERSION.SDK_INT>=30)root.setOnApplyWindowInsetsListener((view,insets)->{android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);return insets;});
        LinearLayout toolbar=new LinearLayout(this);toolbar.setGravity(Gravity.CENTER_VERTICAL);toolbar.setPadding(dp(12),0,dp(8),0);
        TextView title=new TextView(this);title.setText("PNR Digital  /  V2");title.setTextColor(Color.rgb(214,239,130));title.setTextSize(16);title.setTypeface(null,1);
        toolbar.addView(title,new LinearLayout.LayoutParams(0,dp(48),1));title.setGravity(Gravity.CENTER_VERTICAL);
        Button menu=new Button(this);menu.setText("Menu");menu.setTextSize(12);menu.setContentDescription("Menu aplikasi");toolbar.addView(menu,new LinearLayout.LayoutParams(dp(80),dp(48)));
        menu.setOnClickListener(v->{PopupMenu popup=new PopupMenu(this,menu);String[] items={"Dashboard PNR","Dashboard RPW","Muat semula","Buka dalam pelayar"};for(String item:items)popup.getMenu().add(item);popup.setOnMenuItemClickListener(item->{String t=item.getTitle().toString();if(t.equals(items[0]))web.loadUrl(ORIGIN+"/");else if(t.equals(items[1]))web.loadUrl(ORIGIN+"/rpw.html");else if(t.equals(items[2]))confirmReload();else external(web.getUrl());return true;});popup.show();});
        root.addView(toolbar);
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);root.addView(progress,new LinearLayout.LayoutParams(-1,dp(3)));
        FrameLayout frame=new FrameLayout(this);root.addView(frame,new LinearLayout.LayoutParams(-1,0,1));
        web=new WebView(this);frame.addView(web,new FrameLayout.LayoutParams(-1,-1));
        errorPanel=new LinearLayout(this);errorPanel.setOrientation(LinearLayout.VERTICAL);errorPanel.setGravity(Gravity.CENTER);errorPanel.setPadding(dp(28),dp(28),dp(28),dp(28));errorPanel.setBackgroundColor(Color.rgb(245,246,243));
        TextView errorText=new TextView(this);errorText.setText("Halaman belum dapat dimuatkan.\n\nSemak sambungan internet. Draf yang telah disimpan oleh sistem tidak dipadam.");errorText.setTextSize(17);errorText.setGravity(Gravity.CENTER);errorPanel.addView(errorText);
        Button retry=new Button(this);retry.setText("Cuba lagi");retry.setOnClickListener(v->{errorPanel.setVisibility(View.GONE);web.reload();});errorPanel.addView(retry);frame.addView(errorPanel,new FrameLayout.LayoutParams(-1,-1));errorPanel.setVisibility(View.GONE);
        setContentView(root);
        try(InputStream input=getAssets().open("downloads.js")){bridgeScript=new String(readAll(input),java.nio.charset.StandardCharsets.UTF_8);}catch(IOException e){bridgeScript="";}
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setGeolocationEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setSupportMultipleWindows(true);settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setUserAgentString(settings.getUserAgentString()+" PNRAndroid/1.0");
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){String url=request.getUrl().toString();if(trusted(url))return false;if(request.isForMainFrame())external(url);return true;}
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){if(downloadPort!=null){downloadPort.close();downloadPort=null;}incoming=null;errorPanel.setVisibility(View.GONE);progress.setVisibility(View.VISIBLE);}
            @Override public void onPageFinished(WebView view,String url){CookieManager.getInstance().flush();if(trusted(url))installDownloadPort();}
            @Override public void onReceivedError(WebView view,WebResourceRequest req,WebResourceError error){if(req.isForMainFrame())errorPanel.setVisibility(View.VISIBLE);}
            @Override public void onReceivedHttpError(WebView view,WebResourceRequest req,WebResourceResponse response){if(req.isForMainFrame()&&response.getStatusCode()>=400)errorPanel.setVisibility(View.VISIBLE);}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onProgressChanged(WebView view,int value){progress.setProgress(value);if(value==100)progress.setVisibility(View.GONE);}
            @Override public boolean onJsAlert(WebView view,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("OK",(d,w)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;}
            @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Teruskan",(d,w)->result.confirm()).setNegativeButton("Batal",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
            @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
                if(!trusted(origin)){callback.invoke(origin,false,false);return;}
                if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED){callback.invoke(origin,true,false);return;}
                if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false);
                locationCallback=callback;locationOrigin=origin;requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION);
            }
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(!trusted(view.getUrl())){callback.onReceiveValue(null);return true;}
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                String[] accept=params.getAcceptTypes();boolean image=accept.length==0||Arrays.stream(accept).anyMatch(t->t.startsWith("image/"));
                if(image)new AlertDialog.Builder(MainActivity.this).setTitle("Gambar bancian").setItems(new String[]{"Ambil gambar","Pilih gambar / fail"},(d,which)->{if(which==0)takePhoto();else pickFile(params);}).setOnCancelListener(d->finishFile(null)).show();else pickFile(params);
                return true;
            }
            @Override public boolean onCreateWindow(WebView view,boolean dialog,boolean userGesture,Message result){
                if(!userGesture)return false;
                WebView popup=new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){String url=request.getUrl().toString();if(trusted(url))web.loadUrl(url);else external(url);v.destroy();return true;}});
                ((WebView.WebViewTransport)result.obj).setWebView(popup);result.sendToTarget();return true;
            }
        });
        web.setDownloadListener((url,agent,disposition,mime,length)->{
            if(url.startsWith("blob:")||url.startsWith("data:")){web.evaluateJavascript("window.__pnrSaveDownload&&window.__pnrSaveDownload("+JSONObject.quote(url)+","+JSONObject.quote(URLUtil.guessFileName(url,disposition,mime))+")",null);return;}
            if(!trusted(url)){external(url);return;}
            try{DownloadManager.Request request=new DownloadManager.Request(Uri.parse(url));request.setTitle(URLUtil.guessFileName(url,disposition,mime));request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,URLUtil.guessFileName(url,disposition,mime));String cookie=CookieManager.getInstance().getCookie(url);if(cookie!=null)request.addRequestHeader("Cookie",cookie);request.addRequestHeader("User-Agent",agent);((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(request);toast("Laporan sedang dimuat turun.");}catch(Exception e){toast("Muat turun gagal. Cuba melalui pelayar.");}
        });
        if(state==null||web.restoreState(state)==null)web.loadUrl(ORIGIN+"/");
    }
    private void confirmReload(){new AlertDialog.Builder(this).setMessage("Muat semula halaman? Simpan draf dahulu jika ada perubahan belum disimpan.").setPositiveButton("Muat semula",(d,w)->web.reload()).setNegativeButton("Batal",null).show();}
    private void external(String url){if(url==null)return;Uri uri=Uri.parse(url);String scheme=uri.getScheme();if(!Arrays.asList("https","mailto","tel","geo").contains(scheme)){toast("Pautan ini tidak disokong.");return;}try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException e){toast("Tiada aplikasi untuk membuka pautan ini.");}}
    private void finishFile(Uri[] uris){if(fileCallback!=null){fileCallback.onReceiveValue(uris);fileCallback=null;}}
    private void pickFile(WebChromeClient.FileChooserParams params){try{Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);String[] types=Arrays.stream(params.getAcceptTypes()).filter(t->t.contains("/")).toArray(String[]::new);intent.setType(types.length==1?types[0]:"*/*");if(types.length>1)intent.putExtra(Intent.EXTRA_MIME_TYPES,types);intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);startActivityForResult(intent,PICK);}catch(Exception e){finishFile(null);toast("Pemilih fail tidak tersedia.");}}
    private void takePhoto(){try{ContentValues values=new ContentValues();values.put(MediaStore.Images.Media.DISPLAY_NAME,"PNR-"+System.currentTimeMillis()+".jpg");values.put(MediaStore.Images.Media.MIME_TYPE,"image/jpeg");values.put(MediaStore.Images.Media.RELATIVE_PATH,"Pictures/PNR");cameraUri=getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);if(cameraUri==null)throw new IOException();Intent intent=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);intent.putExtra(MediaStore.EXTRA_OUTPUT,cameraUri);intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);intent.setClipData(ClipData.newRawUri("Gambar PNR",cameraUri));startActivityForResult(intent,CAMERA);}catch(Exception e){clearCancelledPhoto();finishFile(null);toast("Kamera tidak tersedia. Gunakan pilihan gambar.");}}
    private void clearCancelledPhoto(){if(cameraUri!=null){try{getContentResolver().delete(cameraUri,null,null);}catch(Exception ignored){}cameraUri=null;}}
    private void installDownloadPort(){
        web.evaluateJavascript(bridgeScript,ignored->{if(!trusted(web.getUrl()))return;if(downloadPort!=null)downloadPort.close();WebMessagePort[] ports=web.createWebMessageChannel();downloadPort=ports[0];downloadPort.setWebMessageCallback(new WebMessagePort.WebMessageCallback(){@Override public void onMessage(WebMessagePort port,WebMessage message){receiveDownload(message.getData());}});web.postWebMessage(new WebMessage("PNR_DOWNLOAD_PORT",new WebMessagePort[]{ports[1]}),Uri.parse(ORIGIN));});
    }
    private void receiveDownload(String raw){
        if(!trusted(web.getUrl())||raw==null||raw.length()>100000)return;
        try{JSONObject item=new JSONObject(raw);String type=item.getString("type");
            if(type.equals("begin")){if(saving){toast("Selesaikan simpanan fail sebelumnya dahulu.");return;}expectedSize=item.getInt("size");if(expectedSize<0||expectedSize>MAX_DOWNLOAD)throw new IOException();incoming=new ByteArrayOutputStream();downloadName=item.optString("name","PNR-laporan").replaceAll("[^a-zA-Z0-9._ -]","_");if(downloadName.isEmpty())downloadName="PNR-laporan";downloadName=downloadName.substring(0,Math.min(120,downloadName.length()));downloadMime=item.optString("mime","application/octet-stream");if(!downloadMime.matches("[a-zA-Z0-9.+-]+/[a-zA-Z0-9.+-]+"))downloadMime="application/octet-stream";
            }else if(type.equals("chunk")&&incoming!=null&&!saving){byte[] chunk=Base64.decode(item.getString("data"),Base64.DEFAULT);if(incoming.size()+chunk.length>expectedSize)throw new IOException();incoming.write(chunk);
            }else if(type.equals("end")&&incoming!=null&&!saving){if(incoming.size()!=expectedSize)throw new IOException();pendingSave=incoming.toByteArray();incoming=null;saving=true;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(downloadMime);intent.putExtra(Intent.EXTRA_TITLE,downloadName);startActivityForResult(intent,SAVE);
            }else if(type.equals("cancel")){incoming=null;}
        }catch(Exception e){incoming=null;pendingSave=null;saving=false;toast("Eksport gagal. Cuba lagi dengan tapisan lebih kecil.");}
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);
        if(request==PICK){List<Uri> uris=new ArrayList<>();if(result==RESULT_OK&&data!=null){if(data.getClipData()!=null){for(int i=0;i<Math.min(20,data.getClipData().getItemCount());i++)uris.add(data.getClipData().getItemAt(i).getUri());}else if(data.getData()!=null)uris.add(data.getData());}finishFile(uris.isEmpty()?null:uris.toArray(new Uri[0]));}
        if(request==CAMERA){if(result==RESULT_OK&&cameraUri!=null){finishFile(new Uri[]{cameraUri});cameraUri=null;}else{clearCancelledPhoto();finishFile(null);}}
        if(request==SAVE){byte[] bytes=pendingSave;pendingSave=null;if(result==RESULT_OK&&data!=null&&data.getData()!=null&&bytes!=null){Uri destination=data.getData();new Thread(()->{try(OutputStream out=getContentResolver().openOutputStream(destination)){if(out==null)throw new IOException();out.write(bytes);runOnUiThread(()->toast("Laporan berjaya disimpan."));}catch(IOException e){runOnUiThread(()->toast("Fail tidak dapat disimpan."));}finally{runOnUiThread(()->saving=false);}}).start();}else saving=false;}
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==LOCATION&&locationCallback!=null){boolean allowed=checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED;locationCallback.invoke(locationOrigin,allowed,false);locationCallback=null;if(!allowed)toast("Lokasi tidak dibenarkan. Koordinat masih boleh diisi secara manual.");}}
    @Override public void onBackPressed(){web.evaluateJavascript("(function(){const v=document.getElementById('view-form');return !!v&&v.style.display!=='none';})()",answer->{if("true".equals(answer))new AlertDialog.Builder(this).setMessage("Kembali ke dashboard? Pastikan draf sudah disimpan.").setPositiveButton("Kembali",(d,w)->web.evaluateJavascript("if(typeof ViewManager!=='undefined')ViewManager.switchTab('main',document.querySelector('[data-view=main]'));",null)).setNegativeButton("Batal",null).show();else if(web.canGoBack())web.goBack();else new AlertDialog.Builder(this).setMessage("Tutup PNR Digital?").setPositiveButton("Tutup",(d,w)->finish()).setNegativeButton("Batal",null).show();});}
    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);web.saveState(state);}
    @Override protected void onPause(){super.onPause();web.onPause();CookieManager.getInstance().flush();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){finishFile(null);if(downloadPort!=null)downloadPort.close();if(locationCallback!=null)locationCallback.invoke(locationOrigin,false,false);web.destroy();super.onDestroy();}
    private byte[] readAll(InputStream input)throws IOException{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;while((n=input.read(buffer))!=-1)out.write(buffer,0,n);return out.toByteArray();}
}
