package pro.educart.gestao;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * EducART 1.1 — primeira frente local-first ADITIVA.
 * Interface executada no Android, sem servidor de frontend. Leitura DEV via
 * Supabase com JWT/RLS; cache e rascunhos cifrados no Android Keystore.
 * A gestão web aprovada permanece intacta em GestaoOnlineActivity.
 */
public final class MainActivity extends Activity {
    private static final int BG=Color.rgb(11,15,25),FG=Color.WHITE,BLUE=Color.rgb(40,110,225);
    private LinearLayout tela;
    private LocalStore store;
    private SupabaseGateway api;
    private JSONObject session,cache;
    private JSONArray drafts;
    private boolean ocupado=false;
    private TextView status;

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        store=new LocalStore(this);
        api=new SupabaseGateway();
        try{
            session=store.getObject("session");
            cache=store.getObject("cache");
            drafts=store.getArray("drafts");
        }catch(Exception e){
            // Não sobrescrever conteúdo que não pôde ser decifrado.
            new AlertDialog.Builder(this).setTitle("Armazenamento local protegido")
              .setMessage("Não foi possível abrir os dados cifrados. Nenhum dado foi sobrescrito.")
              .setPositiveButton("Fechar", (d,w)->finish()).show();
            return;
        }
        inicio();
    }
    private void base(String subtitulo){
        ScrollView sc=new ScrollView(this);
        sc.setFillViewport(true);
        sc.setBackgroundColor(BG);
        tela=new LinearLayout(this);
        tela.setOrientation(LinearLayout.VERTICAL);
        int pad=dp(20);tela.setPadding(pad,dp(28),pad,dp(35));
        sc.addView(tela);setContentView(sc);
        texto("EducART Gestão 1.1",25,true);
        texto("APLICATIVO LOCAL · SUPABASE DEV",12,false);
        texto(subtitulo,16,false);
        status=texto("",13,false);
    }
    private int dp(int n){return (int)(n*getResources().getDisplayMetrics().density);}
    private TextView texto(String value,int size,boolean forte){
        TextView tv=new TextView(this);tv.setText(value);tv.setTextSize(size);
        tv.setTextColor(forte?FG:Color.rgb(196,208,225));
        tv.setTypeface(null,forte?1:0);tv.setPadding(0,dp(7),0,dp(7));
        tela.addView(tv,new LinearLayout.LayoutParams(-1,-2));return tv;
    }
    private EditText campo(String rotulo,String valor,int type){
        texto(rotulo,14,true);
        EditText e=new EditText(this);e.setSingleLine(true);e.setTextColor(FG);e.setHintTextColor(0xff8494a9);
        e.setText(valor);e.setInputType(type);e.setTextSize(16);
        tela.addView(e,new LinearLayout.LayoutParams(-1,-2));return e;
    }
    private Button botao(String titulo,Runnable acao){
        Button b=new Button(this);b.setText(titulo);b.setAllCaps(false);
        b.setTextColor(FG);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(BLUE));
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(52));p.topMargin=dp(10);
        tela.addView(b,p);b.setOnClickListener(v->{if(!ocupado)acao.run();});return b;
    }
    private void erro(String msg){new AlertDialog.Builder(this).setTitle("Não concluído")
      .setMessage(msg).setPositiveButton("Entendi",null).show();}
    private interface Trabalho { void executar() throws Exception; }
    private void executar(String aviso,Trabalho trabalho,Runnable sucesso){
        if(ocupado)return;ocupado=true;
        if(status!=null)status.setText(aviso);
        new Thread(()->{
          try { trabalho.executar();runOnUiThread(()->{ocupado=false;sucesso.run();}); }
          catch(Exception e){runOnUiThread(()->{ocupado=false;if(status!=null)status.setText("");
            erro(e.getMessage()==null?"Falha de conexão/validação. Nenhuma gravação confirmada.":e.getMessage());});}
        },"educart-dev-sync").start();
    }
    private boolean temSessao(){return session!=null&&session.optString("uid").length()>0;}
    private void inicio(){
        base(temSessao()?"Seu painel existe no aparelho, mesmo sem internet.":"Entre uma vez com sua conta de gestão autorizada para sincronizar dados.");
        if(!temSessao()){
            botao("Entrar na EducART DEV",this::login);
            botao("Gestão web existente (online)",()->startActivity(new Intent(this,GestaoOnlineActivity.class)));
            texto("Sem login inicial não há acesso aos cadastros. Não há chave administrativa no APK.",13,false);
            return;
        }
        JSONObject ultimo=cache;
        JSONArray turmas=ultimo.optJSONArray("turmas");
        JSONArray pessoas=ultimo.optJSONArray("pessoas");
        JSONArray matriculas=ultimo.optJSONArray("matriculas");
        texto("Sessão local: "+session.optString("email","conta autorizada"),13,false);
        texto("Última sincronização: "+ultimo.optString("sincronizado_em","ainda não sincronizado"),13,false);
        texto("Turmas: "+contar(turmas)+"  |  Pessoas: "+contar(pessoas)+"  |  Matrículas: "+contar(matriculas),17,true);
        texto("Rascunhos salvos neste aparelho: "+drafts.length(),15,false);
        botao("Sincronizar leitura com Supabase DEV",this::sincronizar);
        botao("Consultar turmas em cache",()->lista("turmas"));
        botao("Consultar pessoas em cache",()->lista("pessoas"));
        botao("Novo estudante: salvar rascunho local",this::novo);
        botao("Revisar rascunhos e enviar manualmente",this::verRascunhos);
        botao("Abrir gestão web completa (online)",()->startActivity(new Intent(this,GestaoOnlineActivity.class)));
        botao("Sair e apagar cache deste aparelho",this::sair);
        texto("O modo local não é a gestão web completa. Ingressos locais são rascunhos e nunca são enviados automaticamente.",12,false);
    }
    private int contar(JSONArray a){return a==null?0:a.length();}
    private void login(){
        base("Autenticação institucional no Supabase DEV");
        EditText email=campo("E-mail","",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        EditText senha=campo("Senha","",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
        botao("Autenticar",()->{
          String e=email.getText().toString().trim(),p=senha.getText().toString();
          if(e.isEmpty()||p.isEmpty()){erro("Informe e-mail e senha.");return;}
          executar("Validando conta e permissões...",()->{
            JSONObject novo=api.entrar(e,p);
            String anterior=session.optString("uid");
            String novoId=novo.optString("uid");
            if(!anterior.isEmpty()&&!anterior.equals(novoId)&&drafts.length()>0)
                throw new Exception("Há rascunhos de outra conta. Saia e apague-os conscientemente antes de trocar de usuário.");
            if(!anterior.equals(novoId)){store.putObject("cache",new JSONObject());store.putArray("drafts",new JSONArray());}
            store.putObject("session",novo);
            session=novo;cache=store.getObject("cache");drafts=store.getArray("drafts");
          },this::inicio);
        });
        botao("Voltar",this::inicio);
    }
    private String tokenValido() throws Exception {
        if(!temSessao())throw new Exception("Autentique-se primeiro.");
        long exp=session.optLong("expira_em",0);
        if(System.currentTimeMillis()>exp-60000L){
            JSONObject atualizado=api.renovar(session.optString("refresh_token"));
            atualizado.put("uid",session.optString("uid"));
            atualizado.put("email",session.optString("email"));
            store.putObject("session",atualizado);session=atualizado;
        }
        return session.getString("access_token");
    }
    private void sincronizar(){
        executar("Conferindo identidade e sincronizando...",()->{
            String token=tokenValido();
            api.autorizar(token,session.getString("uid"));
            JSONArray t=api.listar("turmas","id,codigo,situacao,local_nome",token);
            JSONArray p=api.listar("pessoas","id,nome_completo,email,telefone",token);
            JSONArray m=api.listar("matriculas","id,pessoa_id,turma_id,situacao",token);
            JSONObject novo=new JSONObject();
            novo.put("turmas",t);novo.put("pessoas",p);novo.put("matriculas",m);
            novo.put("sincronizado_em",new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm",java.util.Locale.forLanguageTag("pt-BR")).format(new java.util.Date()));
            store.putObject("cache",novo);cache=novo;
        },this::inicio);
    }
    private void lista(String tipo){
        JSONArray a=cache.optJSONArray(tipo);
        base(tipo.equals("turmas")?"Turmas sincronizadas":"Pessoas sincronizadas");
        if(a==null||a.length()==0)texto("Ainda não há registros disponíveis localmente. Sincronize com internet.",15,false);
        else{
            if(tipo.equals("pessoas")){
                EditText busca=campo("Pesquisar por nome","",InputType.TYPE_CLASS_TEXT);
                LinearLayout resultados=new LinearLayout(this);resultados.setOrientation(LinearLayout.VERTICAL);
                tela.addView(resultados);
                Runnable desenhar=()->{
                    resultados.removeAllViews();String q=busca.getText().toString().trim().toLowerCase(java.util.Locale.ROOT);
                    int exibidos=0;
                    for(int i=0;i<a.length()&&exibidos<60;i++){
                        JSONObject r=a.optJSONObject(i);if(r==null)continue;
                        String nome=r.optString("nome_completo");
                        if(!nome.toLowerCase(java.util.Locale.ROOT).contains(q))continue;
                        TextView linha=new TextView(this);linha.setText(nome);
                        linha.setTextColor(FG);linha.setPadding(0,dp(8),0,dp(8));resultados.addView(linha);exibidos++;
                    }
                };
                busca.addTextChangedListener(new TextWatcher(){
                    public void beforeTextChanged(CharSequence s,int start,int count,int after){}
                    public void onTextChanged(CharSequence s,int start,int before,int count){desenhar.run();}
                    public void afterTextChanged(Editable e){}
                });desenhar.run();
            }else for(int i=0;i<a.length();i++){
                JSONObject t=a.optJSONObject(i);if(t!=null)texto(t.optString("codigo")+" · "+t.optString("local_nome")+" · "+t.optString("situacao"),15,false);
            }
        }
        botao("Voltar ao painel",this::inicio);
    }
    private void novo(){
        JSONArray t=cache.optJSONArray("turmas");
        if(t==null||t.length()==0){erro("Sincronize turmas do DEV uma vez antes de criar o rascunho.");return;}
        base("Novo estudante — rascunho privado neste aparelho");
        texto("Nenhuma matrícula ou cobrança é criada antes da confirmação online.",13,false);
        EditText nome=campo("Nome completo","",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        EditText email=campo("E-mail (opcional)","",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        EditText telefone=campo("Telefone (ou e-mail obrigatório)","",InputType.TYPE_CLASS_PHONE);
        texto("Turma de destino",14,true);
        ArrayList<String> labels=new ArrayList<>();ArrayList<String> ids=new ArrayList<>();
        for(int i=0;i<t.length();i++){JSONObject item=t.optJSONObject(i);
            if(item!=null&&java.util.Arrays.asList("planejada","aberta","em_andamento").contains(item.optString("situacao"))){
                labels.add(item.optString("codigo")+" · "+item.optString("local_nome"));ids.add(item.optString("id"));
            }}
        if(ids.size()==0){erro("Nenhuma turma elegível na cópia local.");return;}
        Spinner sp=new Spinner(this);ArrayAdapter<String> adapter=new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,labels);
        sp.setAdapter(adapter);tela.addView(sp,new LinearLayout.LayoutParams(-1,dp(52)));
        EditText referencia=campo("Referência documental (12+ caracteres)","",InputType.TYPE_CLASS_TEXT);
        botao("Salvar rascunho OFFLINE",()->{
            String n=nome.getText().toString().trim(),em=email.getText().toString().trim(),tel=telefone.getText().toString().trim(),ref=referencia.getText().toString().trim();
            if(n.length()<3||em.isEmpty()&&tel.isEmpty()||ref.length()<12){erro("Confira nome, contato e referência documental de pelo menos 12 caracteres.");return;}
            JSONObject draft=new JSONObject();
            try{
                draft.put("id",UUID.randomUUID().toString());draft.put("nome",n);draft.put("email",em);draft.put("telefone",tel);
                draft.put("turma_id",ids.get(sp.getSelectedItemPosition()));draft.put("turma",labels.get(sp.getSelectedItemPosition()));
                draft.put("referencia",ref);draft.put("estado","rascunho");
                drafts.put(draft);store.putArray("drafts",drafts);
                new AlertDialog.Builder(this).setTitle("Salvo no aparelho").setMessage("Rascunho cifrado. Nenhum dado foi enviado ao Supabase.")
                  .setPositiveButton("Ver rascunhos",(di,w)->verRascunhos()).show();
            }catch(Exception e){erro("Não foi possível proteger o rascunho. Nenhuma gravação confirmada.");}
        });
        botao("Voltar",this::inicio);
    }
    private void verRascunhos(){
        base("Rascunhos locais · envio manual com auditoria");
        if(drafts.length()==0)texto("Nenhum rascunho.",15,false);
        for(int i=0;i<drafts.length();i++){
            JSONObject d=drafts.optJSONObject(i);if(d==null)continue;
            texto(d.optString("nome")+" · "+d.optString("turma")+" · "+d.optString("estado"),15,true);
            if("rascunho".equals(d.optString("estado"))){
                final int indice=i;
                botao("Conferir e sincronizar este vínculo pendente",()->confirmarEnvio(indice));
            }
            if("revisar".equals(d.optString("estado")))texto("Envio inconclusivo. Compare no painel antes de qualquer nova tentativa; nenhum reenvio automático.",13,false);
            if("sincronizado".equals(d.optString("estado")))texto("Vínculo confirmado pelo servidor: "+d.optString("matricula_id"),12,false);
        }
        botao("Voltar",this::inicio);
    }
    private void confirmarEnvio(int indice){
        JSONObject d=drafts.optJSONObject(indice);if(d==null)return;
        new AlertDialog.Builder(this).setTitle("Confirmar vínculo acadêmico DEV")
          .setMessage("Você conferiu identidade, turma, documentos e ausência de matrícula duplicada? Será solicitado apenas vínculo PENDENTE, sem Pix, cobrança, convite ou ativação automática.")
          .setNegativeButton("Não enviar",null)
          .setPositiveButton("Conferi: enviar ao DEV",(dialog,which)->enviarRascunho(indice)).show();
    }
    private void enviarRascunho(int indice){
        JSONObject d=drafts.optJSONObject(indice);if(d==null)return;
        executar("Enviando vínculo acadêmico auditado...",()->{
            String token=tokenValido();
            api.autorizar(token,session.getString("uid"));
            // Marcar como indeterminado ANTES do envio. Queda de rede não autoriza repetir.
            d.put("estado","revisar");store.putArray("drafts",drafts);
            String id=api.vincularPendente(d,token);
            d.put("matricula_id",id);d.put("estado","sincronizado");
            store.putArray("drafts",drafts);
        },this::verRascunhos);
    }
    private void sair(){
        new AlertDialog.Builder(this).setTitle("Apagar sessão e cache")
          .setMessage("Serão apagados deste aparelho a sessão, os dados sincronizados e TODOS os rascunhos, inclusive não enviados. Esta operação não altera o Supabase.")
          .setNegativeButton("Cancelar",null)
          .setPositiveButton("Apagar dados locais",(d,w)->{
              store.clear();session=new JSONObject();cache=new JSONObject();drafts=new JSONArray();inicio();
          }).show();
    }
}