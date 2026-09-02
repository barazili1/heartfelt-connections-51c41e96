# دليل KAJO ARENA الكامل على Sketchware Pro

الدليل ده معمول لـ **Sketchware Pro**، والتطبيق هيكون WebView يفتح الموقع المنشور، ويبعث للموقع `ANDROID_ID` الحقيقي من خلال الجسر `KajoAndroid`.

> رابط الموقع المستخدم في الكود جاهز: `https://champion-1.lovable.app`

---

## 1) اعمل مشروع جديد

1. افتح **Sketchware Pro**.
2. اضغط **New Project**.
3. اكتب:
   - App Name: `KAJO ARENA`
   - Package Name: `com.kajo.arena`
   - Project Name: `KajoArena`
4. اضغط **Create**.

لا تنقل أي ملفات من مشروع Android Studio إلى Sketchware؛ كل المطلوب موجود في الدليل ده.

---

## 2) أضف الصلاحيات

افتح **AndroidManifest Manager → Permissions** وأضف الصلاحيتين دول:

```text
android.permission.INTERNET
android.permission.ACCESS_NETWORK_STATE
```

تأكد إن علامة التفعيل ظاهرة أمام الصلاحيتين. من غير `INTERNET` التطبيق هيعرض شاشة بيضاء.

---

## 3) جهّز الواجهة

داخل شاشة `main.xml`:

1. امسح الـ `TextView` الافتراضي وأي عناصر أخرى.
2. اسحب عنصر **WebView** واحد فقط.
3. لازم اسم العنصر يكون بالضبط:

```text
webview1
```

4. اضبط خصائصه:
   - Width: `match_parent`
   - Height: `match_parent`
   - كل الـ Margins: `0`

لو الاسم مختلف عن `webview1`، غيّره في الكود كله لنفس الاسم الموجود عندك.

---

## 4) كود التشغيل الكامل

افتح:

**Event → Activity → onCreate**

ثم:

1. اضغط `+`.
2. افتح **More Block**.
3. اختر **Add Source Directly**.
4. ضع **بلوك واحد فقط** داخل `onCreate`.
5. الصق الكود التالي كاملًا كما هو.

> مهم: لا تلصق الكود في `Enter string value`. لازم يكون داخل `Add Source Directly`.

```java
final String SITE_URL = "https://champion-1.lovable.app";

android.webkit.WebSettings settings = webview1.getSettings();
settings.setJavaScriptEnabled(true);
settings.setDomStorageEnabled(true);
settings.setDatabaseEnabled(true);
settings.setAllowContentAccess(true);
settings.setAllowFileAccess(true);
settings.setLoadWithOverviewMode(true);
settings.setUseWideViewPort(true);
settings.setSupportZoom(false);
settings.setBuiltInZoomControls(false);
settings.setDisplayZoomControls(false);
settings.setMediaPlaybackRequiresUserGesture(false);
settings.setJavaScriptCanOpenWindowsAutomatically(true);
settings.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);

if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
	settings.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
	android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(webview1, true);
}

android.webkit.CookieManager.getInstance().setAcceptCookie(true);
webview1.setBackgroundColor(android.graphics.Color.WHITE);

webview1.addJavascriptInterface(new Object() {
	@android.webkit.JavascriptInterface
	public String getAndroidId() {
		String id = android.provider.Settings.Secure.getString(
			getContentResolver(),
			android.provider.Settings.Secure.ANDROID_ID
		);
		return id == null ? "" : id;
	}

	@android.webkit.JavascriptInterface
	public String getAppVersion() {
		return "1.0.0";
	}
}, "KajoAndroid");

webview1.setWebViewClient(new android.webkit.WebViewClient() {
	@Override
	public boolean shouldOverrideUrlLoading(android.webkit.WebView view, String url) {
		if (url == null) return true;

		if (url.startsWith("http://") || url.startsWith("https://")) {
			view.loadUrl(url);
			return true;
		}

		try {
			android.content.Intent intent = new android.content.Intent(
				android.content.Intent.ACTION_VIEW,
				android.net.Uri.parse(url)
			);
			startActivity(intent);
		} catch (Exception e) {
			android.widget.Toast.makeText(
				getApplicationContext(),
				"لا يوجد تطبيق لفتح الرابط",
				android.widget.Toast.LENGTH_SHORT
			).show();
		}
		return true;
	}

	@Override
	public void onPageStarted(android.webkit.WebView view, String url, android.graphics.Bitmap favicon) {
		super.onPageStarted(view, url, favicon);
	}

	@Override
	public void onPageFinished(android.webkit.WebView view, String url) {
		super.onPageFinished(view, url);
	}

	@Override
	public void onReceivedError(android.webkit.WebView view, int errorCode, String description, String failingUrl) {
		super.onReceivedError(view, errorCode, description, failingUrl);
		android.widget.Toast.makeText(
			getApplicationContext(),
			"تعذر فتح الموقع: " + description,
			android.widget.Toast.LENGTH_LONG
		).show();
	}

	@Override
	public void onReceivedSslError(android.webkit.WebView view,
		android.webkit.SslErrorHandler handler,
		android.net.http.SslError error) {
		handler.cancel();
		android.widget.Toast.makeText(
			getApplicationContext(),
			"خطأ في شهادة أمان الموقع",
			android.widget.Toast.LENGTH_LONG
		).show();
	}
});

webview1.setWebChromeClient(new android.webkit.WebChromeClient() {
	@Override
	public boolean onShowFileChooser(
		android.webkit.WebView webView,
		android.webkit.ValueCallback<android.net.Uri[]> filePathCallback,
		android.webkit.WebChromeClient.FileChooserParams fileChooserParams
	) {
		if (mUploadCallback != null) {
			mUploadCallback.onReceiveValue(null);
		}

		mUploadCallback = filePathCallback;

		android.content.Intent intent = new android.content.Intent(
			android.content.Intent.ACTION_GET_CONTENT
		);
		intent.addCategory(android.content.Intent.CATEGORY_OPENABLE);
		intent.setType("image/*");

		try {
			startActivityForResult(
				android.content.Intent.createChooser(intent, "اختر صورة"),
				1001
			);
		} catch (Exception e) {
			mUploadCallback = null;
			android.widget.Toast.makeText(
				getApplicationContext(),
				"تعذر فتح الصور",
				android.widget.Toast.LENGTH_LONG
			).show();
			return false;
		}

		return true;
	}
});

if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
	android.webkit.WebView.setWebContentsDebuggingEnabled(true);
}

webview1.loadUrl(SITE_URL);

}
private android.webkit.ValueCallback<android.net.Uri[]> mUploadCallback;
{
```

### ليه آخر 3 سطور موجودين؟

```java
}
private android.webkit.ValueCallback<android.net.Uri[]> mUploadCallback;
{
```

دي طريقة تعريف متغير عام داخل Sketchware باستخدام `Add Source Directly`. لازم تكون **آخر شيء في بلوك onCreate**.

في النسخة القديمة كانت السطور دي في أول `onCreate`، وده كان بيخلي كود تحميل الموقع لا يتم تنفيذه ويسبب الشاشة البيضاء. ممنوع تضيف أي بلوك بعد الكود السابق داخل `onCreate`.

---

## 5) كود نتيجة اختيار الصورة

من:

**Event → Activity → onActivityResult**

أضف **Add Source Directly** والصق:

```java
if (_requestCode == 1001) {
	if (mUploadCallback != null) {
		android.net.Uri[] result = null;

		if (_resultCode == RESULT_OK && _data != null) {
			android.net.Uri selectedFile = _data.getData();
			if (selectedFile != null) {
				result = new android.net.Uri[] { selectedFile };
			}
		}

		mUploadCallback.onReceiveValue(result);
		mUploadCallback = null;
	}
}
```

> لو نسخة Sketchware عندك تعرض أسماء المتغيرات بدون `_`، استخدم `requestCode` و`resultCode` و`data` بدل `_requestCode` و`_resultCode` و`_data`. لا تغيّرها إلا لو ظهر خطأ Compile يقول إن الاسم غير موجود.

---

## 6) كود زر الرجوع

من:

**Event → Activity → onBackPressed**

أضف **Add Source Directly** والصق:

```java
if (webview1.canGoBack()) {
	webview1.goBack();
} else {
	finish();
}
```

---

## 7) إعدادات مهمة قبل Run

راجع القائمة دي حرفيًا:

- يوجد WebView اسمه `webview1`.
- أضفت صلاحية `INTERNET`.
- كود الخطوة 4 داخل `onCreate → Add Source Directly`، وليس داخل String.
- يوجد بلوك كود واحد فقط داخل `onCreate`.
- لم تضف أي بلوك بعد آخر `{` في كود `onCreate`.
- رابط `SITE_URL` هو `https://champion-1.lovable.app`.
- لم تنشئ حدث WebView منفصل يغيّر `WebViewClient` أو `WebChromeClient`.

بعدها اضغط **Run**، انتظر بناء وتثبيت الـ APK، ثم افتح التطبيق مع تشغيل الإنترنت.

---

## 8) لو ظهر Compile Error

### خطأ عند `mUploadCallback`

السبب غالبًا إن آخر 3 سطور اتحذفت أو فيه بلوك بعدها. لازم ينتهي كود `onCreate` هكذا:

```java
webview1.loadUrl(SITE_URL);

}
private android.webkit.ValueCallback<android.net.Uri[]> mUploadCallback;
{
```

### خطأ عند `_requestCode` أو `_resultCode` أو `_data`

بعض إصدارات Sketchware تستخدم:

```java
requestCode
resultCode
data
```

غيّر الأسماء الثلاثة فقط إلى الأسماء التي تظهر أعلى حدث `onActivityResult` عندك.

### خطأ `cannot find symbol webview1`

اسم الـ WebView في التصميم مختلف. سمّه `webview1` أو استبدل `webview1` في كل الكود باسمه الحقيقي.

---

## 9) لو التطبيق اتبنى لكن ظهرت شاشة بيضاء

نفّذ الاختبارات بالترتيب:

1. افتح `https://champion-1.lovable.app` من Chrome على نفس الهاتف. لو لم يفتح، افحص الإنترنت أو DNS.
2. تأكد أن `android.permission.INTERNET` مفعّلة في Manifest.
3. امسح التطبيق القديم من الهاتف، ثم اعمل **Run** من جديد.
4. من إعدادات الهاتف حدّث **Android System WebView** و**Google Chrome**.
5. امسح بيانات التطبيق، ثم افتحه من جديد.
6. انتظر رسالة الخطأ التي يعرضها الكود؛ ستوضح هل المشكلة اتصال أو شهادة أمان.

### اختبار يفصل مشكلة الموقع عن مشكلة WebView

غيّر مؤقتًا أول سطر إلى:

```java
final String SITE_URL = "https://example.com";
```

- لو `example.com` ظهر: الـ WebView سليم، والمشكلة في الوصول لرابط الموقع من شبكة الهاتف.
- لو ظل أبيض: الصلاحية أو مكان الكود أو Android System WebView هو السبب.

بعد الاختبار رجّع الرابط إلى:

```java
final String SITE_URL = "https://champion-1.lovable.app";
```

---

## 10) التأكد من Android ID وقاعدة البيانات

اسم الجسر لازم يظل:

```text
KajoAndroid
```

الموقع يستدعي:

```text
window.KajoAndroid.getAndroidId()
```

ثم يحفظ هوية الجهاز بصيغة:

```text
and_<ANDROID_ID>
```

التطبيق والموقع يستخدمان نفس قاعدة البيانات لأن التطبيق يعرض نفس الموقع المنشور. لا تحتاج لإضافة أكواد قاعدة بيانات داخل Sketchware.

`ANDROID_ID` قد يتغير بعد ضبط المصنع، أو عند استخدام جهاز مختلف.

---

## 11) إخراج APK نهائي

1. جرّب إرسال الطلب ورفع صورة من نسخة **Run** أولًا.
2. افتح قائمة المشروع واختر **Export/Sign APK**.
3. أنشئ Keystore واحفظ الملف وكلمة المرور في مكان آمن.
4. استخدم نفس Keystore في كل تحديث؛ غير ذلك لن يثبت التحديث فوق النسخة القديمة.