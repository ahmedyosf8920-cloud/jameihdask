# جمعية الخير للجميع — الإصدار 33

- `cloud/web` واجهة الويب (النشر على الاستضافة) و`cloud/supabase` ملفات SQL
- `android/` تطبيق Android — يُبنى تلقائيًا (Actions ← Build Android APK)
- `windows/` تطبيق Windows (Electron) — يُبنى تلقائيًا (Actions ← Build Windows App)
- `wa_server/` خادم الواتساب، و`docs/` ملاحظات الإصدارات

## الحصول على التطبيقين
افتح تبويب **Actions** ← اختر آخر تشغيل ناجح ← نزّل من **Artifacts**:
`JKH-Android-debug-apk` (ملف app-debug.apk) و`JKH-Windows` (ملف التثبيت + النسخة Portable).

عند تعديل الواجهة: انسخ `cloud/web` إلى `android/app/src/main/assets/www` و`android/www` و`windows/www` (دون `_headers`).
> الـAPK تجريبي (debug) قابل للتثبيت مباشرة. للنشر على Google Play يلزم توقيع release.
