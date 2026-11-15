package pro.educart.gestao;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;

/**
 * Cliente REST com chave PUBLICÁVEL e JWT individual. Sem service_role, sem SQL
 * embutido e sem escrita automática. O Supabase DEV aplica RLS e RPC auditada.
 */
final class SupabaseGateway {
    private static final String BASE="https://esjrjzyvyhtzwgihcbsc.supabase.co";
    private static final String KEY="sb_publishable_7hJp5v_mFazWyj9gga0Uig_TyfJI_VK";
    private Object requisicao(String metodo,String caminho,String token,JSONObject payload)throws Exception{
        URL url=new URL(BASE+caminho);
        if(!"https".equals(url.getProtocol())||!"esjrjzyvyhtzwgihcbsc.supabase.co".equals(url.getHost()))
            throw new SecurityException("Host não autorizado");
        HttpURLConnection conn=(HttpURLConnection)url.openConnection();
        conn.setConnectTimeout(12000);conn.setReadTimeout(25000);
        conn.setInstanceFollowRedirects(false);
        conn.setRequestMethod(metodo);
        conn.setRequestProperty("apikey",KEY);
        conn.setRequestProperty("Accept","application/json");
        if(token!=null&&!token.isEmpty())conn.setRequestProperty("Authorization","Bearer "+token);
        try{
            if(payload!=null){
                byte[] bytes=payload.toString().getBytes(StandardCharsets.UTF_8);
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type","application/json");
                conn.setFixedLengthStreamingMode(bytes.length);
                try(OutputStream out=conn.getOutputStream()){out.write(bytes);}
            }
            int status=conn.getResponseCode();
            if(status<200||status>=300)throw new Exception("Supabase DEV recusou a solicitação (HTTP "+status+"). Revise login, permissão e conexão.");
            try(InputStream input=conn.getInputStream()){
                ByteArrayOutputStream baos=new ByteArrayOutputStream();
                byte[] buf=new byte[8192];int n;
                while((n=input.read(buf))!=-1){
                    if(baos.size()+n>3_000_000)throw new Exception("Resposta acima do limite seguro");
                    baos.write(buf,0,n);
                }
                String texto=baos.toString("UTF-8").trim();
                return texto.length()==0?new JSONObject():new JSONTokener(texto).nextValue();
            }
        }finally{conn.disconnect();}
    }
    JSONObject entrar(String email,String senha)throws Exception{
        JSONObject corpo=new JSONObject();corpo.put("email",email);corpo.put("password",senha);
        JSONObject sessao=(JSONObject)requisicao("POST","/auth/v1/token?grant_type=password",null,corpo);
        String token=sessao.getString("access_token");
        JSONObject user=(JSONObject)requisicao("GET","/auth/v1/user",token,null);
        if(user.optBoolean("is_anonymous",false))throw new Exception("Acesso anônimo não é aceito.");
        String uid=user.getString("id");
        autorizar(token,uid);
        sessao.put("uid",uid);sessao.put("email",user.optString("email",email));
        sessao.put("expira_em",System.currentTimeMillis()+sessao.optLong("expires_in",300)*1000L);
        return sessao;
    }
    JSONObject renovar(String refresh)throws Exception{
        if(refresh==null||refresh.length()<10)throw new Exception("Sessão expirada. Entre novamente quando houver internet.");
        JSONObject corpo=new JSONObject();corpo.put("refresh_token",refresh);
        JSONObject sessao=(JSONObject)requisicao("POST","/auth/v1/token?grant_type=refresh_token",null,corpo);
        sessao.put("expira_em",System.currentTimeMillis()+sessao.optLong("expires_in",300)*1000L);
        return sessao;
    }
    void autorizar(String token,String uid)throws Exception{
        JSONObject user=(JSONObject)requisicao("GET","/auth/v1/user",token,null);
        if(!uid.equals(user.optString("id"))||user.optBoolean("is_anonymous",false))
            throw new Exception("Identidade divergente.");
        JSONArray admins=(JSONArray)requisicao("GET","/rest/v1/portal_admins?select=user_id&user_id=eq."+uid,token,null);
        JSONArray papeis=(JSONArray)requisicao("GET","/rest/v1/equipe_papeis?select=papel&user_id=eq."+uid,token,null);
        boolean autorizada=false;
        for(int i=0;i<papeis.length();i++){
            String papel=papeis.getJSONObject(i).optString("papel");
            if("coordenacao".equals(papel)||"secretaria".equals(papel))autorizada=true;
        }
        if(admins.length()==0||!autorizada)throw new Exception("Conta sem papel institucional autorizado no DEV.");
    }
    JSONArray listar(String tabela,String colunas,String token)throws Exception{
        if(!("turmas".equals(tabela)||"pessoas".equals(tabela)||"matriculas".equals(tabela)))
            throw new SecurityException("Tabela fora do escopo DEV");
        String ordenacao="pessoas".equals(tabela)?"&order=nome_completo.asc":"";
        return (JSONArray)requisicao("GET","/rest/v1/"+tabela+"?select="+colunas+"&limit=1000"+ordenacao,token,null);
    }
    String vincularPendente(JSONObject draft,String token)throws Exception{
        JSONObject params=new JSONObject();
        params.put("p_turma_id",draft.getString("turma_id"));
        params.put("p_pessoa_existente_id",JSONObject.NULL);
        params.put("p_nome_completo",draft.getString("nome"));
        params.put("p_email",draft.optString("email"));
        params.put("p_telefone",draft.optString("telefone"));
        params.put("p_nascimento",JSONObject.NULL);
        params.put("p_tipo_vinculo","novo_pendente");
        params.put("p_ingresso_em",JSONObject.NULL);
        params.put("p_referencia_conferencia",draft.getString("referencia"));
        params.put("p_confirmei_identidade",true);
        params.put("p_confirmei_documentos",false);
        Object retorno=requisicao("POST","/rest/v1/rpc/educart_r12_vincular_estudante_turma_dev",token,params);
        JSONArray itens=retorno instanceof JSONArray?(JSONArray)retorno:new JSONArray().put(retorno);
        JSONObject row=itens.length()>0?itens.optJSONObject(0):null;
        if(row==null||row.optString("matricula_id").isEmpty())
            throw new Exception("Resposta de gravação inconclusiva; conferir manualmente no painel.");
        return row.getString("matricula_id");
    }
}