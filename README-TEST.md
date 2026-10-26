# نسخة الاختبار المحلية — بنك الدم

هذه النسخة مخصصة للاختبار فقط، وتحافظ على واجهة ووظائف المشروع الحالية، مع استبدال PostgreSQL بقاعدة SQLite محلية لتجاوز مشكلة PostgreSQL أثناء الاختبار.

## التشغيل على Windows

1. افتح PowerShell داخل مجلد المشروع.
2. نفذ:

```powershell
npm install
npm run db:push
npm run db:seed
npm run dev
```

3. افتح:

`http://localhost:3000`

## الحسابات التجريبية

- admin / admin123
- manager / manager123
- reception / reception123
- lab / lab123
- inventory / inventory123

هذه الحسابات تُنشأ بواسطة seed فقط إذا لم تكن موجودة.

## ملاحظة مهمة

هذه ليست نسخة الإنتاج. قاعدة الاختبار هي SQLite محلية داخل ملف `blood-bank-test.db`. عند اعتماد النظام سنعيد استخدام PostgreSQL للبيئة المؤسسية/الخادم، ثم ننتقل إلى إعداد EXE.
