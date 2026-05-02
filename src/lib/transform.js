/**
 * transform.js — the core pipeline.
 *
 *   user JSX  →  preprocess()  →  Babel.transform()  →  buildPage()  →  iframe HTML
 *
 * Each call returns a complete <!DOCTYPE html> page that gets fed into
 * <iframe srcDoc>. No module caching, no leaked state between runs.
 */

// ─── 1. PREPROCESS ────────────────────────────────────────
// Fix common copy-paste issues before Babel sees the code.

function preprocess(code) {
  // a) Smart quotes (curly) → straight quotes.
  //    Happens when copying from rendered docs or iOS clipboard.
  code = code
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');

  // a2) Markdown link auto-linking that some chat UIs apply to identifiers.
  //     A `something.method` in copied code can come back as
  //     `[something.method](http://something.method)` — totally breaks JS.
  //     Pattern: [text](http(s)://...) → text. Safe inside JS comments too.
  code = code.replace(/\[([^\]\n]+?)\]\(https?:\/\/[^)\s]+\)/g, '$1');

  // b) Strip ES module imports.
  //    React/Recharts/Tailwind/Framer Motion/Lucide-react are exposed as
  //    globals inside the iframe (see SETUP_SCRIPT). Matches both
  //    single-line and multi-line import statements.
  code = code.replace(/import\s+(?:[\w*\s{},]+from\s+)?['"][^'"]+['"];?/g, '');

  // c) Convert `export default Foo` to an auto-render call,
  //    UNLESS the user already wrote ReactDOM.render / createRoot themselves.
  let render = '';
  const hasManualRender = /ReactDOM\.(render|createRoot)/.test(code);
  if (!hasManualRender) {
    let m;
    if ((m = code.match(/export\s+default\s+function\s+(\w+)/))) {
      code = code.replace(/export\s+default\s+function/, 'function');
      render = `;ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(${m[1]}));`;
    } else if ((m = code.match(/export\s+default\s+(\w+)\s*;?/))) {
      code = code.replace(/export\s+default\s+\w+\s*;?/, '');
      render = `;ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(${m[1]}));`;
    }
  } else {
    code = code.replace(/export\s+default\s+/g, '');
  }

  return code + '\n' + render;
}

// ─── 2. IFRAME PAGE BUILDER ───────────────────────────────
// Wrap the transpiled code in an HTML page with all libs preloaded.

// UMD libraries from cdnjs (load synchronously, expose as globals).
const CDN_LIBS = [
  'react/18.3.1/umd/react.development.js',
  'react-dom/18.3.1/umd/react-dom.development.js',
  'prop-types/15.8.1/prop-types.min.js',
  'recharts/2.12.7/Recharts.min.js',
  'lucide/0.453.0/lucide.min.js',
];

// Locals destructured from window globals so user code can use
// `useState`, `motion.div`, `<Icon name="camera" />` etc. directly.
const SETUP_SCRIPT = `
  var _R = window.React;
  var useState = _R.useState, useEffect = _R.useEffect, useMemo = _R.useMemo,
      useCallback = _R.useCallback, useRef = _R.useRef, useReducer = _R.useReducer,
      useContext = _R.useContext, createContext = _R.createContext,
      Fragment = _R.Fragment, memo = _R.memo, forwardRef = _R.forwardRef,
      useLayoutEffect = _R.useLayoutEffect;

  if (window.Recharts) {
    var _RC = window.Recharts;
    var LineChart = _RC.LineChart, Line = _RC.Line, XAxis = _RC.XAxis, YAxis = _RC.YAxis,
        CartesianGrid = _RC.CartesianGrid, Tooltip = _RC.Tooltip, Legend = _RC.Legend,
        ResponsiveContainer = _RC.ResponsiveContainer, AreaChart = _RC.AreaChart, Area = _RC.Area,
        BarChart = _RC.BarChart, Bar = _RC.Bar, ComposedChart = _RC.ComposedChart,
        PieChart = _RC.PieChart, Pie = _RC.Pie, Cell = _RC.Cell,
        ScatterChart = _RC.ScatterChart, Scatter = _RC.Scatter,
        RadarChart = _RC.RadarChart, Radar = _RC.Radar,
        PolarGrid = _RC.PolarGrid, PolarAngleAxis = _RC.PolarAngleAxis, PolarRadiusAxis = _RC.PolarRadiusAxis,
        ReferenceLine = _RC.ReferenceLine, ReferenceArea = _RC.ReferenceArea,
        LabelList = _RC.LabelList, Sector = _RC.Sector, Brush = _RC.Brush, Treemap = _RC.Treemap,
        FunnelChart = _RC.FunnelChart, Funnel = _RC.Funnel;
  }

  // Framer Motion is loaded as ESM (see buildPage). Pull from window when ready.
  // If it failed to load (offline / blocked), fall back to plain DOM elements
  // so user code that does <motion.div> still renders something.
  var motion = window.motion || new Proxy({}, {
    get: function (_, tag) {
      return _R.forwardRef(function (props, ref) {
        var clean = Object.assign({}, props);
        // strip framer-motion-only props
        ['initial','animate','exit','transition','variants','whileHover',
         'whileTap','whileFocus','whileInView','layout','layoutId','drag'
        ].forEach(function (k) { delete clean[k]; });
        return _R.createElement(tag, Object.assign({ ref: ref }, clean));
      });
    },
  });
  var AnimatePresence = window.AnimatePresence || function (p) { return p.children; };
  var useMotionValue = window.useMotionValue || function () { return { get: function(){return 0;}, set: function(){} }; };
  var useTransform = window.useTransform || function () { return useMotionValue(); };
  var useScroll = window.useScroll || function () { return { scrollY: useMotionValue(), scrollYProgress: useMotionValue() }; };
  var useSpring = window.useSpring || function () { return useMotionValue(); };
  var useAnimation = window.useAnimation || function () { return { start: function(){}, stop: function(){}, set: function(){} }; };

  // Lucide icon helper: <Icon name="camera" size={24} className="..." />
  function Icon(props) {
    var ref = _R.useRef(null);
    _R.useEffect(function () {
      if (ref.current && window.lucide) {
        ref.current.innerHTML = '';
        var el = document.createElement('i');
        el.setAttribute('data-lucide', props.name || 'help-circle');
        ref.current.appendChild(el);
        window.lucide.createIcons({ attrs: { width: props.size || 24, height: props.size || 24 } });
      }
    }, [props.name, props.size]);
    return _R.createElement('span', {
      ref: ref,
      className: props.className,
      style: Object.assign({ display: 'inline-flex', verticalAlign: 'middle' }, props.style || {}),
    });
  }
`;

function escapeHtml(s) {
  return String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

function errorPage(msg) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;padding:16px;background:#fef2f2;color:#991b1b;font-family:ui-monospace,monospace;font-size:12px;white-space:pre-wrap;line-height:1.5;}</style></head><body>${escapeHtml(msg)}</body></html>`;
}

function buildPage(transformedCode) {
  // Stop user code from breaking out of the inner <script> tag.
  const safe = transformedCode.replace(/<\/script>/gi, '<\\/script>');

  const cdnTags = CDN_LIBS
    .map((p) => `<script src="https://cdnjs.cloudflare.com/ajax/libs/${p}"><\/script>`)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Tailwind Play CDN (JIT in browser) -->
<script src="https://cdn.tailwindcss.com"><\/script>
${cdnTags}
<!-- ESM libraries loaded in parallel: framer-motion + lucide-react. -->
<script type="module">
  await Promise.all([
    (async () => {
      try {
        const fm = await import('https://esm.sh/framer-motion@11.11.10?deps=react@18.3.1');
        window.motion = fm.motion;
        window.AnimatePresence = fm.AnimatePresence;
        window.useMotionValue = fm.useMotionValue;
        window.useTransform = fm.useTransform;
        window.useScroll = fm.useScroll;
        window.useSpring = fm.useSpring;
        window.useAnimation = fm.useAnimation;
      } catch (e) { console.warn('framer-motion failed to load', e); }
    })(),
    (async () => {
      try {
        const lr = await import('https://esm.sh/lucide-react@0.453.0?deps=react@18.3.1');
        // Expose every icon as a global so user code can write
        // <Sparkles /> directly without an import statement.
        for (const name in lr) {
          if (name !== 'default' && !window[name]) window[name] = lr[name];
        }
      } catch (e) { console.warn('lucide-react failed to load', e); }
    })(),
  ]);
  window.__motionReady = true;
  window.dispatchEvent(new Event('motion-ready'));
<\/script>
<style>
  html, body { margin: 0; padding: 0; }
  body { font-family: -apple-system, system-ui, "SF Pro Text", sans-serif; }
  #root { min-height: 100vh; }
  .__err { padding: 16px; background: #fef2f2; color: #991b1b; font-family: ui-monospace, monospace; font-size: 12px; white-space: pre-wrap; line-height: 1.5; }
</style>
</head>
<body>
<div id="root"></div>
<script>
window.addEventListener("error", function(e) {
  document.body.innerHTML = '<div class="__err">' + (e.message || "Error") + '</div>';
});
function __runUserCode() {
  try {
    ${SETUP_SCRIPT}
    ${safe}
  } catch (e) {
    document.body.innerHTML = '<div class="__err">' + (e.message || String(e)) + '</div>';
  }
}
// Wait for framer-motion ESM to finish loading, then run.
if (window.__motionReady) __runUserCode();
else {
  window.addEventListener('motion-ready', __runUserCode, { once: true });
  // Fallback: if motion never loads (offline), run anyway after 2s.
  setTimeout(function () { if (!window.__motionReady) { window.__motionReady = true; __runUserCode(); } }, 2000);
}
<\/script>
</body>
</html>`;
}

// ─── 3. PUBLIC API ────────────────────────────────────────

export function transform(code) {
  if (!code || !code.trim()) {
    return `<html><body style="margin:0;padding:24px;font-family:system-ui;color:#94a3b8;">لا يوجد كود</body></html>`;
  }

  if (typeof window.Babel === 'undefined') {
    return errorPage('Babel لم يحمّل بعد. تأكد من اتصال الإنترنت وحدّث الصفحة.');
  }

  let processed;
  try {
    processed = preprocess(code);
  } catch (e) {
    return errorPage('Preprocess error: ' + e.message);
  }

  let transpiled;
  try {
    transpiled = window.Babel.transform(processed, { presets: ['react'] }).code;
  } catch (e) {
    return errorPage(e.message);
  }

  return buildPage(transpiled);
}
