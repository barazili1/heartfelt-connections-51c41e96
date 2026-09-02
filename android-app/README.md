# تطبيق أندرويد KAJO ARENA (WebView + Android ID)

التطبيق ده بيفتح **نفس الموقع بالظبط** جوه WebView، فالتصميم مطابق 100% ومربوط بنفس قاعدة البيانات (Lovable Cloud) — من غير أي كود قاعدة بيانات في التطبيق.
الحاجة الوحيدة اللي بيضيفها التطبيق: **البصمة الرقمية الحقيقية للجهاز** = `Settings.Secure.ANDROID_ID`.

---

## 1) خطوات إنشاء المشروع

1. افتح **Android Studio** → `New Project` → اختار **Empty Views Activity** (Java).
2. اسم الحزمة (Package name): `com.kajo.arena` — مهم يكون نفس الاسم.
3. بعد ما المشروع يتفتح، استبدل الملفات دي بمحتوى الملفات الموجودة هنا:

| ملف في المشروع | ياخد محتوى الملف |
| --- | --- |
| `app/src/main/java/com/kajo/arena/MainActivity.java` | `app/src/main/java/com/kajo/arena/MainActivity.java` |
| `app/src/main/AndroidManifest.xml` | `app/src/main/AndroidManifest.xml` |
| `app/src/main/res/layout/activity_main.xml` | `app/src/main/res/layout/activity_main.xml` |
| `app/src/main/res/values/themes.xml` | `app/src/main/res/values/themes.xml` |
| `app/build.gradle` | `app/build.gradle` |

4. اضغط **Sync Now** لما Android Studio يطلب مزامنة Gradle.

## 2) أهم سطر لازم تغيّره

جوه `MainActivity.java`:

```java
private static final String SITE_URL = "https://your-site.lovable.app";
```

حطّ مكانه رابط موقعك المنشور (بعد Publish). ده اللي بيخلّي التطبيق على نفس قاعدة البيانات.

## 3) إزاي البصمة بتشتغل

- التطبيق بيحقن في الصفحة كائن اسمه `KajoAndroid` فيه دالة `getAndroidId()`.
- في كود الموقع (`src/lib/android-bridge.ts`) بنقرأ القيمة دي، ولو موجودة **بتحل محل بصمة المتصفح بالكامل**، والمعرّف بيتخزن في قاعدة البيانات بالشكل:

```
and_<ANDROID_ID>      مثال: and_9774d56d682e549c
```

- لو المستخدم فتح الموقع من متصفح عادي (مش من التطبيق)، بيرجع لنظام البصمة القديم تلقائيًا.
- `ANDROID_ID` ثابت للجهاز ومش بيتغير إلا مع **Factory Reset** أو تغيير مفتاح توقيع التطبيق — يعني حذف التطبيق وإعادة تثبيته بنفس الـ APK بيرجّع نفس البصمة.

> مهم: وقّع نسخة الإصدار (Release) بنفس ملف الـ keystore دايمًا، لأن تغييره بيغيّر ANDROID_ID لتطبيقك.

## 4) بناء ملف APK

`Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
الملف هيطلع في: `app/build/outputs/apk/debug/app-debug.apk`

للنسخة النهائية: `Build` → `Generate Signed Bundle / APK` → اختار APK → أنشئ keystore واحتفظ بيه.

## 5) اختبار سريع

بعد تشغيل التطبيق، افتح صفحة `/fingerprint` جوه التطبيق — لازم تلاقي المعرّف بادئ بـ `and_`.
