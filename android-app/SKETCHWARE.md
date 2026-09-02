# عمل التطبيق من Sketchware Pro (من غير Android Studio)

التطبيق ده مجرد WebView بيفتح موقع KAJO ARENA + جسر (Bridge) بيدي الموقع الـ Android ID الحقيقي.

> مهم: لازم **Sketchware Pro** (النسخة العادية مش بتدعم "Add Source Directly" كويس).

---

## 1) مشروع جديد

- New Project → App Name: `KAJO ARENA` → Package: `com.kajo.arena`
- افتح `MainActivity`.

## 2) الواجهة (View)

- امسح أي `TextView` افتراضي.
- من `Widgets` ضيف **WebView** واسمه `webview1`.
- خليه `width = MATCH_PARENT` و `height = MATCH_PARENT`.

## 3) الأذونات (Permissions)

- من قايمة المشروع → **Permission** → فعّل:
  - `INTERNET`
  - `ACCESS_NETWORK_STATE`

## 4) الكود — في `onCreate`

اضغط على `onCreate` → **Add Source Directly** → والصق ده بالظبط
(غيّر `SITE_URL` لرابط موقعك المنشور):

```java
final String SITE_URL = "https://YOUR-SITE.lovable.app";

android.webkit.WebSettings s = webview1.getSettings();
s.setJavaScriptEnabled(true);
s.setDomStorageEnabled(true);
s.setDatabaseEnabled(true);
s.setLoadWithOverviewMode(true);
s.setUseWideViewPort(true);
s.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
s.setMediaPlaybackRequiresUserGesture(false);
if (android.os.Build.VERSION.SDK_INT >= 21) {
    s.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
}

webview1.addJavascriptInterface(new Object() {
    @android.webkit.JavascriptInterface
    public String getAndroidId() {
        String id = android.provider.Settings.Secure.getString(
                getContentResolver(),
                android.provider.Settings.Secure.ANDROID_ID);
        return id == null ? "" : id;
    }

    @android.webkit.JavascriptInterface
    public String getAppVersion() {
        return "1.0";
    }
}, "KajoAndroid");

webview1.setWebViewClient(new android.webkit.WebViewClient() {
    @Override
    public boolean shouldOverrideUrlLoading(android.webkit.WebView v, String url) {
        if (url.startsWith("https://") && url.contains("YOUR-SITE")) {
            return false;
        }
        try {
            startActivity(new android.content.Intent(
                android.content.Intent.ACTION_VIEW,
                android.net.Uri.parse(url)));
        } catch (Exception e) { }
        return true;
    }
});

webview1.setWebChromeClient(new android.webkit.WebChromeClient());
webview1.loadUrl(SITE_URL);
```

> `KajoAndroid` هو الاسم اللي الموقع بيدوّر عليه (`window.KajoAndroid.getAndroidId()`).
> لو غيّرت الاسم ده التطبيق مش هيشتغل.

## 5) زرار الرجوع (اختياري بس مستحسن)

في حدث `onBackPressed` → Add Source Directly:

```java
if (webview1.canGoBack()) {
    webview1.goBack();
} else {
    finish();
}
```

## 6) رفع الصور من التطبيق (مهم جدًا)

صفحة الشروط بترفع صورتين، والـ WebView مش بيفتح معرض الصور من غير الكود ده.
في `onCreate` بعد الكود اللي فوق، ضيف Add Source Directly:

```java
webview1.setWebChromeClient(new android.webkit.WebChromeClient() {
    @Override
    public boolean onShowFileChooser(android.webkit.WebView v,
            android.webkit.ValueCallback<android.net.Uri[]> cb,
            android.webkit.WebChromeClient.FileChooserParams params) {
        filePathCallback = cb;
        android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_GET_CONTENT);
        i.addCategory(android.content.Intent.CATEGORY_OPENABLE);
        i.setType("image/*");
        startActivityForResult(android.content.Intent.createChooser(i, "اختار صورة"), 1001);
        return true;
    }
});
```

وفي **Add Source Directly (خارج الأحداث / More Block نوع Activity)** ضيف:

```java
private android.webkit.ValueCallback<android.net.Uri[]> filePathCallback;

@Override
protected void onActivityResult(int requestCode, int resultCode, android.content.Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    if (requestCode == 1001) {
        if (filePathCallback == null) return;
        android.net.Uri[] results = null;
        if (resultCode == RESULT_OK && data != null && data.getData() != null) {
            results = new android.net.Uri[]{ data.getData() };
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }
}
```

## 7) التجربة والتصدير

- اضغط **Run** لتجربة التطبيق على موبايلك.
- للتصدير: **Save/Export → Sign APK** واعمل keystore واحد واحفظه.
- ⚠️ استخدم نفس الـ keystore في كل التحديثات، والـ Android ID بيتغير لو المستخدم عمل Factory Reset أو غيّر الجهاز.

## 8) إزاي تتأكد إن البصمة شغالة

افتح التطبيق → صفحة الشروط → لو الاشتراك اتقبل مرة واحدة بس ومن نفس الموبايل
مرفوض تاني، يبقى الـ Android ID شغال (الموقع بيخزّنه بصيغة `and_<ANDROID_ID>`).
