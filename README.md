# JSX Runner

أداة لتشغيل ملفات JSX التفاعلية كعروض احترافية مباشرة في المتصفح. تكتب React، تضغط زر، يطلع لك عرض ملء الشاشة جاهز للجمهور.

## المميزات

- **تشغيل JSX فوري** — Babel يحوّل الكود في الـ browser، يطلع داخل iframe معزول.
- **مكتبات جاهزة بدون استيراد** — Tailwind، Framer Motion، Lucide React، Recharts كلها متوفّرة كـ globals داخل الكود.
- **مكتبة عروض** — IndexedDB يخزّن كل ملفاتك، تتنقّل بينها من الـ sidebar.
- **تاريخ نسخ** — snapshots تلقائية كل دقيقتين + يدوية، استعادة بنقرة، آخر 30 نسخة لكل عرض.
- **حالة حفظ احترافية** — مؤشّر بصري `Saved · قبل ٥ ث`، تحذير عند الخروج لو فيه تغييرات معلّقة.
- **وضع العرض ملء الشاشة** — F للدخول، ESC للخروج، زر "افتح في نافذة" للعرض على projector منفصل.
- **سحب وإفلات** — اسحب أي ملف `.jsx` على النافذة وينحفظ في المكتبة تلقائياً.
- **Light + Dark theme** — يلتقط إعداد نظامك أول مرة، تقدر تبدّل من toolbar.
- **ملاحظات المُلقي** — لوحة جانبية لنقاطك، تختفي في وضع العرض.
- **Export / Import** — backup كامل لكل المكتبة كملف JSON.
- **PWA** — قابل للتثبيت كتطبيق على iPhone و Mac و Android.

## التشغيل المحلي

```bash
npm install
npm run dev
```

افتح `http://localhost:5173`.

## البناء

```bash
npm run build         # ينتج dist/
npm run preview       # يعرض dist/ محلياً للاختبار قبل النشر
```

## النشر على GitHub Pages

التطبيق يحتوي على workflow جاهز في `.github/workflows/deploy.yml`. الخطوات:

1. أنشئ repo جديد على GitHub وارفع الكود:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/USERNAME/jsx-runner.git
   git push -u origin main
   ```

2. في صفحة الـ repo على GitHub: **Settings → Pages → Source → GitHub Actions**.

3. كل push على `main` راح يبني وينشر تلقائياً. الرابط بيكون:
   `https://USERNAME.github.io/jsx-runner/`

## استخدام المكتبات داخل ملف JSX

كل المكتبات متوفّرة كـ globals — لا تحتاج `import`:

```jsx
// Tailwind classes
<div className="min-h-screen flex items-center justify-center bg-slate-900">

// Framer Motion
<motion.div animate={{ scale: 1.1 }} whileHover={{ y: -4 }}>

// Lucide icons (1500+ أيقونة)
<Sparkles size={48} className="text-amber-400" />
<Camera size={24} />

// React hooks (useState, useEffect, useMemo, useRef, ...)
const [count, setCount] = useState(0);

// Recharts
<LineChart width={500} height={300} data={data}>
  <Line type="monotone" dataKey="value" />
</LineChart>
```

أي `import` تكتبه في كودك ينحذف تلقائياً قبل التشغيل، فما يضرّك تتركه.

## اختصارات لوحة المفاتيح

| الاختصار | الإجراء |
|---|---|
| `⌘/Ctrl + Enter` | تشغيل الكود |
| `⌘/Ctrl + S` | تنزيل كملف `.jsx` |
| `F` | دخول/خروج وضع العرض |
| `B` | طي/توسيع الـ sidebar |
| `Esc` | إغلاق modal أو خروج من العرض |

## التقنيات

- **[Vite](https://vitejs.dev)** — dev server و bundler
- **[React 18](https://react.dev)** — UI
- **[Lucide React](https://lucide.dev)** — أيقونات
- **[@babel/standalone](https://babeljs.io/docs/babel-standalone)** — يحوّل JSX داخل المتصفح
- **[Tailwind Play CDN](https://tailwindcss.com)** — JIT compile داخل الـ iframe
- **[Framer Motion](https://www.framer.com/motion/)** — animations (يحمّل من esm.sh)
- **[Recharts](https://recharts.org)** — رسوم بيانية
- **IndexedDB** — تخزين العروض والنسخ
- **Inter + IBM Plex Sans Arabic + JetBrains Mono** — typography

## هيكل الملفات

```
src/
├── main.jsx              نقطة الدخول
├── App.jsx               الـ component الرئيسي + state management
├── App.css               design tokens (Light/Dark) + كل الأنماط
├── components/
│   ├── Sidebar.jsx       الشريط الجانبي مع المكتبة والإعدادات
│   ├── Toolbar.jsx       الشريط العلوي (theme switch، أزرار)
│   ├── Editor.jsx        textarea مع ملاحظات اختيارية
│   ├── Preview.jsx       iframe المعاينة المعزول
│   ├── VersionHistory.jsx modal تاريخ النسخ
│   ├── SaveStatus.jsx    pill حالة الحفظ
│   ├── Logo.jsx          SVG البراند
│   └── Kbd.jsx           keyboard shortcut badges
└── lib/
    ├── transform.js      pipeline: preprocess → Babel → buildPage
    ├── storage.js        async API على IndexedDB
    ├── idb.js            wrapper بسيط للـ IndexedDB
    ├── theme.js          إدارة theme
    └── example.js        المثال الافتراضي
```

## الترخيص

MIT — استخدمها كيف ما تبي.
