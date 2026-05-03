/**
 * export.js — export the current presentation as PDF or PPTX.
 *
 *   PDF  → opens the rendered preview in a new window and triggers
 *          window.print(). The user picks "Save as PDF" in the dialog.
 *   PPTX → renders the preview into a hidden, same-origin iframe,
 *          captures it with html2canvas, and embeds the PNG into a
 *          single-slide .pptx via pptxgenjs.
 *
 * The PPTX path needs allow-same-origin so html2canvas can read the DOM.
 * The iframe is offscreen and destroyed immediately after capture.
 */
// html2canvas + pptxgenjs are dynamically imported on demand to keep
// the initial bundle small. They only load when the user actually exports.

function safeName(name) {
  return (name || 'presentation').replace(/[\\/:*?"<>|]/g, '_');
}

// ─── PDF ──────────────────────────────────────────────────
// Open the preview in a popup, wait for load, trigger print.
export function exportPDF(previewSrc, name) {
  if (!previewSrc) throw new Error('لا توجد معاينة');
  const blob = new Blob([previewSrc], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'width=1280,height=800');
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error('المتصفح منع فتح النافذة. اسمح للنوافذ المنبثقة.');
  }
  // Give the page time to render React / Tailwind / motion before printing.
  const fire = () => {
    setTimeout(() => {
      try { win.focus(); win.print(); } catch {}
    }, 1200);
  };
  if (win.document.readyState === 'complete') fire();
  else win.addEventListener('load', fire, { once: true });
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  // Also stash a hint in the popup's title so the user knows what file.
  try { win.document.title = safeName(name); } catch {}
}

// ─── PPTX ─────────────────────────────────────────────────
// Render preview into an offscreen iframe and snapshot it.
async function captureSrcdoc(previewSrc, { width = 1280, height = 720, settle = 1500 } = {}) {
  const { default: html2canvas } = await import('html2canvas');
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.style.cssText =
      `position:fixed;left:-99999px;top:0;width:${width}px;height:${height}px;` +
      'border:0;visibility:hidden;pointer-events:none;';
    // allow-same-origin is required so html2canvas can read the iframe DOM.
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    frame.srcdoc = previewSrc;
    document.body.appendChild(frame);

    const cleanup = () => { try { frame.remove(); } catch {} };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('انتهى الوقت أثناء التقاط المعاينة'));
    }, 15_000);

    frame.addEventListener('load', () => {
      // Give React / Tailwind / framer-motion a moment to settle.
      setTimeout(async () => {
        try {
          const doc = frame.contentDocument;
          if (!doc) throw new Error('تعذّر الوصول إلى محتوى المعاينة');
          const target = doc.body;
          const canvas = await html2canvas(target, {
            backgroundColor: null,
            useCORS: true,
            scale: Math.min(2, window.devicePixelRatio || 1),
            width,
            height,
            windowWidth: width,
            windowHeight: height,
            logging: false,
          });
          clearTimeout(timeout);
          cleanup();
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          clearTimeout(timeout);
          cleanup();
          reject(err);
        }
      }, settle);
    });
  });
}

export async function exportPPTX(previewSrc, name) {
  if (!previewSrc) throw new Error('لا توجد معاينة');
  const dataUrl = await captureSrcdoc(previewSrc);

  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 inches (16:9)
  pptx.title = name || 'JSX Runner Presentation';

  const slide = pptx.addSlide();
  slide.background = { color: '0B1220' };
  slide.addImage({
    data: dataUrl,
    x: 0, y: 0,
    w: 13.333, h: 7.5,
    sizing: { type: 'contain', w: 13.333, h: 7.5 },
  });

  await pptx.writeFile({ fileName: `${safeName(name)}.pptx` });
}
