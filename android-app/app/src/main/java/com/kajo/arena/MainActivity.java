package com.kajo.arena;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.content.Intent;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

/**
 * KAJO ARENA — Android shell.
 *
 * The whole site is rendered inside a WebView so the design is identical to
 * the website. The only thing the app adds is the real device identity:
 * Settings.Secure.ANDROID_ID is exposed to the page through the
 * "KajoAndroid" JavaScript bridge and replaces the browser fingerprint.
 */
public class MainActivity extends AppCompatActivity {

    /** ⬅️ ضع هنا رابط موقعك (نفس الموقع = نفس قاعدة البيانات). */
    private static final String SITE_URL = "https://your-site.lovable.app";

    private WebView webView;
    private SwipeRefreshLayout refreshLayout;

    /** Object injected into the page as window.KajoAndroid */
    public static class DeviceBridge {
        private final AppCompatActivity activity;

        DeviceBridge(AppCompatActivity activity) {
            this.activity = activity;
        }

        /** Real ANDROID_ID — stable per device+app-signing-key. */
        @SuppressLint("HardwareIds")
        @JavascriptInterface
        public String getAndroidId() {
            String id = Settings.Secure.getString(
                    activity.getContentResolver(), Settings.Secure.ANDROID_ID);
            return id == null ? "" : id;
        }

        @JavascriptInterface
        public String getAppVersion() {
            return BuildConfig.VERSION_NAME;
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        refreshLayout = findViewById(R.id.refresh);
        webView = findViewById(R.id.webview);
        webView.setBackgroundColor(Color.parseColor("#0B0B10"));

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage — required by the site
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString() + " KajoArenaApp/1.0");

        webView.addJavascriptInterface(new DeviceBridge(this), "KajoAndroid");

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String host = url.getHost() == null ? "" : url.getHost();
                // Keep the site inside the app, open everything else externally.
                if (SITE_URL.contains(host) && !host.isEmpty()) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, url));
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                refreshLayout.setRefreshing(false);
            }
        });

        refreshLayout.setOnRefreshListener(() -> webView.reload());

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(SITE_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }
}
