package pro.educart.gestao;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONArray;
import org.json.JSONObject;

/** Cache local e sessões criptografados por AES-GCM com chave não exportável no Android Keystore. */
final class LocalStore {
    private static final String ALIAS="educart_gestao_dev_local_v1";
    private final SharedPreferences prefs;
    LocalStore(Context ctx){prefs=ctx.getSharedPreferences("educart_dev_cifrado",Context.MODE_PRIVATE);}
    private SecretKey chave() throws Exception {
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
        if(!ks.containsAlias(ALIAS)){
            KeyGenerator kg=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            kg.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true).build());
            kg.generateKey();
        }
        return ((KeyStore.SecretKeyEntry)ks.getEntry(ALIAS,null)).getSecretKey();
    }
    private String criptografar(String texto)throws Exception{
        byte[] nonce=new byte[12];new SecureRandom().nextBytes(nonce);
        Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,chave(),new GCMParameterSpec(128,nonce));
        byte[] cifra=c.doFinal(texto.getBytes(StandardCharsets.UTF_8));
        byte[] pacote=new byte[nonce.length+cifra.length];
        System.arraycopy(nonce,0,pacote,0,nonce.length);
        System.arraycopy(cifra,0,pacote,nonce.length,cifra.length);
        return Base64.encodeToString(pacote,Base64.NO_WRAP);
    }
    private String decifrar(String dado)throws Exception{
        byte[] raw=Base64.decode(dado,Base64.DEFAULT);
        if(raw.length<29)throw new SecurityException("Cache cifrado inválido");
        byte[] nonce=java.util.Arrays.copyOfRange(raw,0,12);
        byte[] cifra=java.util.Arrays.copyOfRange(raw,12,raw.length);
        Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,chave(),new GCMParameterSpec(128,nonce));
        return new String(c.doFinal(cifra),StandardCharsets.UTF_8);
    }
    JSONObject getObject(String nome){
        String raw=prefs.getString(nome,null);
        if(raw==null)return new JSONObject();
        try{return new JSONObject(decifrar(raw));}catch(Exception e){throw new IllegalStateException("Cache indisponível",e);}
    }
    JSONArray getArray(String nome){
        String raw=prefs.getString(nome,null);
        if(raw==null)return new JSONArray();
        try{return new JSONArray(decifrar(raw));}catch(Exception e){throw new IllegalStateException("Rascunhos indisponíveis",e);}
    }
    void putObject(String nome,JSONObject dado)throws Exception{
        if(!prefs.edit().putString(nome,criptografar(dado.toString())).commit())
            throw new Exception("Não foi possível persistir com segurança.");
    }
    void putArray(String nome,JSONArray dado)throws Exception{
        if(!prefs.edit().putString(nome,criptografar(dado.toString())).commit())
            throw new Exception("Não foi possível persistir com segurança.");
    }
    void clear(){prefs.edit().clear().commit();}
}