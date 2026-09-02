# دليل كامل: عمل تطبيق KAJO ARENA من Sketchware Pro

هذا الدليل يشرح **كل ملف/كود تحطه فين بالظبط** داخل Sketchware Pro.
مفيش أي حاجة من مجلد `android-app/app` (ملفات Android Studio) هتستخدمها في سكتشوير —
سكتشوير بيبني المشروع بنفسه، وإحنا بنضيف الأكواد يدويًا في الأماكن الموضحة تحت.

---

## 0) ملخص سريع

| المطلوب | مكانه في سكتشوير |
|---|---|
| صلاحيات الإنترنت | AndroidManifest → Permissions |
| عنصر الـ WebView | View Area في `main` |
| كود التشغيل والجسر (Bridge) | حدث `onCreate` → Add Source Directly |
| كلاس الجسر + متغيرات | Manifest/Java: **onCreate** أعلى الكود (نستخدم Add Source Directly) |
| زر الرجوع | حدث `onBackPressed` |
| رفع الصور | `onActivityResult` + Add Source Directly |

---

## 1) إنشاء المشروع

1. افتح Sketchware Pro → **+ New Project**.
2. App Name: `KAJO ARENA`
3. Package Name: `com.kajo.arena`
4. Project Name: `KajoArena`
5. اضغط **Create**.

---

## 2) الصلاحيات (Permissions)

من داخل المشروع: **AndroidManifest Manager** (أو Permission في القائمة الجانبية) وأضف:

```
android.permission.INTERNET
android.permission.ACCESS_NETWORK_STATE
```

> بدون INTERNET الصفحة هتفضل بيضا.

---

## 3) الواجهة (View)

في شاشة `main`:

1. امسح أي `TextView` افتراضي.
2. من قسم **Widget** اسحب **WebView** وسمّه: `webview1`
3. من الـ Property اضبط:
   - Width: `MATCH_PARENT`
   - Height: `MATCH_PARENT`
   - Margins: `0` من كل الجهات

(اختياري) اسحب **ProgressBar** وسمّه `progressbar1` فوق الـ WebView.

---

## 4) الكود الأساسي — مكانه: حدث `onCreate`

افتح **Event → onCreate** → اضغط زر `+` → اختر **Add Source Directly** والصق الكود ده كامل:

> ⚠️ غيّر `SITE_URL` لرابط موقعك المنشور (مثال: `https://kajo-arena.lovable.app`).

```java
final String SITE_URL = "https://ضع-رابط-موقعك-هنا";

android.webkit.WebSettings ws = webview1.getSettings();
ws.setJavaScriptEnabled(true);
ws.setDomStorageEnabled(true);
ws.setDatabaseEnabled(true);
ws.setLoadWithOverviewMode(true);
ws.setUseWideViewPort(true);
ws.setSupportZoom(false);
ws.setBuiltInZoomControls(false);
ws.setMediaPlaybackRequiresUserGesture(false);
ws.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
ws.setAllowFileAccess(true);
ws.setJavaScriptCanOpenWindowsAutomatically(true);
ws.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

// ===== الجسر: تسليم Android ID للموقع =====
webview1.addJavascriptInterface(new Object() {
	@android.webkit.JavascriptInterface
	public String getAndroidId() {
		return android.provider.Settings.Secure.getString(
			getContentResolver(),
			android.provider.Settings.Secure.ANDROID_ID);
	}
	@android.webkit.JavascriptInterface
	public boolean isNativeApp() { return true; }
}, "KajoAndroid");

webview1.setWebViewClient(new android.webkit.WebViewClient() {
	@Override
	public boolean shouldOverrideUrlLoading(android.webkit.WebView view, String url) {
		if (url.startsWith("http") && url.contains(android.net.Uri.parse(SITE_URL).getHost())) {
			return false;
		}
		try {
			startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)));
		} catch (Exception e) { }
		return true;
	}
});

webview1.setWebChromeClient(new android.webkit.WebChromeClient() {
	@Override
	public boolean onShowFileChooser(android.webkit.WebView view,
			android.webkit.ValueCallback<android.net.Uri[]> callback,
			android.webkit.WebChromeClient.FileChooserParams params) {
		mUploadCallback = callback;
		android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_GET_CONTENT);
		i.addCategory(android.content.Intent.CATEGORY_OPENABLE);
		i.setType("image/*");
		startActivityForResult(android.content.Intent.createChooser(i, "اختر صورة"), 1001);
		return true;
	}
});

webview1.loadUrl(SITE_URL);
```

---

## 5) المتغير الخاص برفع الصور — مكانه: `onCreate` **قبل** الكود السابق

أضف بلوك **Add Source Directly** آخر واسحبه ليكون **أول بلوك** في onCreate، وضع فيه:

```java
}
private android.webkit.ValueCallback<android.net.Uri[]> mUploadCallback;
private void _unused() {
```

> السطور دي حيلة معروفة في سكتشوير لتعريف متغير عام (خارج الدالة). لازم تكون **أول بلوك** فعلاً،
> وباقي الكود بعدها عادي.

---

## 6) نتيجة اختيار الصورة — مكانه: حدث `onActivityResult`

من **Event → Activity → onActivityResult** → Add Source Directly:

```java
if (_requestCode == 1001) {
	if (mUploadCallback != null) {
		android.net.Uri[] results = null;
		if (_resultCode == RESULT_OK && _data != null && _data.getData() != null) {
			results = new android.net.Uri[] { _data.getData() };
		}
		mUploadCallback.onReceiveValue(results);
		mUploadCallback = null;
	}
}
```

---

## 7) زر الرجوع — مكانه: حدث `onBackPressed`

**Event → Activity → onBackPressed** → Add Source Directly:

```java
if (webview1.canGoBack()) {
	webview1.goBack();
} else {
	finish();
}
```

---

## 8) التشغيل والتجربة

1. اضغط **Run** (أيقونة التشغيل) → سكتشوير هيبني APK ويثبته.
2. افتح التطبيق: المفروض يفتح الموقع بنفس التصميم بالظبط.
3. للتأكد إن البصمة شغالة بالـ Android ID: قدّم طلب من التطبيق، ثم جرّب تقدّم تاني من نفس الجهاز —
   لازم يترفض لأن النظام بيسجّل الهوية `and_<ANDROID_ID>` في قاعدة البيانات.

---

## 9) إخراج APK نهائي موقّع

1. من قائمة المشروع اختر **Export/Sign APK**.
2. أنشئ **Keystore** جديد واحفظه في مكان آمن.
3. أي تحديث مستقبلي لازم يتوقّع بـ **نفس الـ Keystore** وإلا التثبيت فوق النسخة القديمة هيفشل.

---

## 10) ملاحظات مهمة

- اسم الجسر لازم يفضل **`KajoAndroid`** بالظبط — الموقع بيقرأ منه (`window.KajoAndroid.getAndroidId()`).
- Android ID بيتغيّر بعد **Factory Reset** أو على جهاز مختلف، وده بيسمح بتقديم جديد.
- الموقع والتطبيق بيستخدموا **نفس قاعدة البيانات** لأن التطبيق مجرد WebView للموقع المنشور.
- ملفات `android-app/app/...` و `build.gradle` تخص Android Studio فقط — تجاهلها تمامًا في سكتشوير.
