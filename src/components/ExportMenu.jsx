/**
 * ExportMenu — popover with export targets (JSX / PDF / PPTX).
 */
import { useState, useRef, useEffect } from 'react';
import { Download, FileCode, FileText, Presentation, Loader2 } from 'lucide-react';

export default function ExportMenu({ onExportJSX, onExportPDF, onExportPPTX }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null); // 'pdf' | 'pptx' | null
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const wrap = (key, fn) => async () => {
    if (busy) return;
    setBusy(key);
    try { await fn(); }
    catch (e) { alert('فشل التصدير: ' + (e?.message || e)); }
    finally { setBusy(null); setOpen(false); }
  };

  return (
    <div className="export-menu" ref={ref}>
      <button
        className="btn btn-ghost"
        onClick={() => setOpen((v) => !v)}
        title="تصدير"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download size={16} />
      </button>
      {open && (
        <div className="export-menu-pop" role="menu">
          <button
            className="export-menu-item"
            role="menuitem"
            onClick={wrap('jsx', onExportJSX)}
            disabled={!!busy}
          >
            <FileCode size={15} />
            <span>تنزيل كـ .jsx</span>
          </button>
          <button
            className="export-menu-item"
            role="menuitem"
            onClick={wrap('pdf', onExportPDF)}
            disabled={!!busy}
          >
            {busy === 'pdf' ? <Loader2 size={15} className="spin" /> : <FileText size={15} />}
            <span>تصدير PDF</span>
          </button>
          <button
            className="export-menu-item"
            role="menuitem"
            onClick={wrap('pptx', onExportPPTX)}
            disabled={!!busy}
          >
            {busy === 'pptx' ? <Loader2 size={15} className="spin" /> : <Presentation size={15} />}
            <span>تصدير PowerPoint</span>
          </button>
        </div>
      )}
    </div>
  );
}
