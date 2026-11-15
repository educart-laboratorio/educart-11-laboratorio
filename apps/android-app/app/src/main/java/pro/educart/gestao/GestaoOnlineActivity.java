package pro.educart.gestao;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Janela particular para a EducART 1.1 existente. Nenhum banco ou segredo está
 * dentro do APK. Este candidato depende de uma instância remota autenticada;
 * NÃO é offline nem comprova que o servidor executa o HEAD do GitHub.
 */
public final class GestaoOnlineActivity extends Activity {
    private static final String HOST = "educart-11-candidate.educartsuporte.workers.dev";
    private static final String URL = "https://" + HOST + "/admin/login";
    private WebView web;
    private View erroConexao;

    private boolean permitido(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme()) &&
            HOST.equalsIgnoreCase(uri.getHost()) &&
            (uri.getPort() == -1 || uri.getPort() == 443);
    }
    private void abrirExternamente(Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equals("https") || scheme.equals("mailto") || scheme.equals("tel"))) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (ActivityNotFoundException ignored) {}
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(11, 15, 25));
        getWindow().setNavigationBarColor(Color.rgb(11, 15, 25));
        FrameLayout raiz = new FrameLayout(this);
        web = new WebView(this);
        raiz.addView(web, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout erro = new LinearLayout(this);
        erro.setOrientation(LinearLayout.VERTICAL);
        erro.setGravity(Gravity.CENTER);
        erro.setBackgroundColor(Color.rgb(11, 15, 25));
        int gap = (int) (18 * getResources().getDisplayMetrics().density);
        erro.setPadding(gap, gap, gap, gap);
        TextView titulo = new TextView(this);
        titulo.setText("EducART Gestão");
        titulo.setTextSize(24);
        titulo.setTextColor(Color.WHITE);
        erro.addView(titulo, new LinearLayout.LayoutParams(-2, -2));
        TextView aviso = new TextView(this);
        aviso.setText("A conexão privada não está disponível. A EducART 1.1 precisa de internet e de um servidor autenticado para sincronizar os dados.");
        aviso.setGravity(Gravity.CENTER);
        aviso.setTextColor(Color.LTGRAY);
        aviso.setPadding(0, gap, 0, gap);
        erro.addView(aviso, new LinearLayout.LayoutParams(-1, -2));
        Button tentar = new Button(this);
        tentar.setText("Tentar conectar novamente");
        tentar.setOnClickListener(v -> { erroConexao.setVisibility(View.GONE); web.loadUrl(URL); });
        erro.addView(tentar, new LinearLayout.LayoutParams(-1, -2));
        erroConexao = erro;
        erroConexao.setVisibility(View.GONE);
        raiz.addView(erroConexao, new FrameLayout.LayoutParams(-1, -1));
        setContentView(raiz);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); // obrigatório para o Next.js existente
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSafeBrowsingEnabled(true);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                if (permitido(uri)) return false;
                abrirExternamente(uri);
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) erroConexao.setVisibility(View.VISIBLE);
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); // nunca ignorar falha de certificado
                erroConexao.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (permitido(Uri.parse(url)) && view.getProgress() == 100)
                    erroConexao.setVisibility(View.GONE);
            }
        });
        web.loadUrl(URL);
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
