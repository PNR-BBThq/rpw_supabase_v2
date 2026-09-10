package my.pnr.digital.v2;
import android.content.Context;
import android.security.keystore.*;
import android.util.Base64;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import java.security.KeyStore;
import java.nio.charset.StandardCharsets;
final class NativeStore {
    private final Context context;
    private final java.util.Set<String> unreadable=new java.util.HashSet<>();
    NativeStore(Context c){context=c;}
    private javax.crypto.SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias("pnr-native")){
            KeyGenerator generator=KeyGenerator.getInstance("AES","AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder("pnr-native",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());generator.generateKey();
        }
        return (javax.crypto.SecretKey)store.getKey("pnr-native",null);
    }
    synchronized void put(String name,String value)throws Exception{
        if(context.getSharedPreferences("pnr-native",0).contains(name))get(name);
        if(unreadable.contains(name))throw new java.io.IOException("Salinan asal tidak dapat dibaca; simpanan tidak ditindih.");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
        String encrypted=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
        if(!context.getSharedPreferences("pnr-native",0).edit().putString(name,encrypted).commit())throw new java.io.IOException("Simpanan gagal");
    }
    synchronized String get(String name){try{
        String value=context.getSharedPreferences("pnr-native",0).getString(name,"");if(value.isEmpty())return "";
        String[] parts=value.split(":",2);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8);
    }catch(Exception e){if(unreadable.add(name))new android.os.Handler(android.os.Looper.getMainLooper()).post(()->android.widget.Toast.makeText(context,"Simpanan tersulit tidak dapat dibaca. Salinan asal dikekalkan; jangan kosongkan data aplikasi.",android.widget.Toast.LENGTH_LONG).show());return "";}}
    synchronized void remove(String name){unreadable.remove(name);context.getSharedPreferences("pnr-native",0).edit().remove(name).apply();}
}
