import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import Toolbar from './components/Toolbar.jsx';
import Editor from './components/Editor.jsx';
import Preview from './components/Preview.jsx';
import VersionHistory from './components/VersionHistory.jsx';
import { transform } from './lib/transform.js';
import { getInitialTheme, applyTheme, toggleTheme } from './lib/theme.js';
import {
  getLibrary,
  getCurrent,
  setCurrentId as persistCurrentId,
  renamePresentation,
  deletePresentation,
  createFromFile,
  touchCurrent,
  flushPendingSave,
  getVersions,
  saveSnapshot,
  restoreVersion,
  deleteVersion,
  exportLibrary,
  importLibrary,
} from './lib/storage.js';
import { defaultExample } from './lib/example.js';

const SIDEBAR_KEY = 'jsx-runner:sidebar-collapsed';

export default function App() {
  // Library / current entry
  const [library, setLibrary] = useState({ presentations: [], currentId: null });
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('بدون عنوان');
  const [previewSrc, setPreviewSrc] = useState('');

  // UI state
  const [presenting, setPresenting] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [theme, setThemeState] = useState(() => getInitialTheme());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === '1'; } catch { return false; }
  });

  // Save status
  const [saveStatus, setSaveStatus] = useState('saved');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  const initializedRef = useRef(false);
  const editsCounterRef = useRef(0);
  const lastAutoSnapshotRef = useRef(0);

  // Apply theme on mount and whenever it changes
  useEffect(() => { applyTheme(theme); }, [theme]);

  // Persist sidebar collapsed state
  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? '1' : '0'); } catch {}
  }, [sidebarCollapsed]);

  const refreshLibrary = useCallback(async () => {
    const lib = await getLibrary();
    setLibrary(lib);
    return lib;
  }, []);

  const refreshVersions = useCallback(async (presentationId) => {
    if (!presentationId) { setVersions([]); return; }
    const list = await getVersions(presentationId);
    setVersions(list);
  }, []);

  // ─── Initial load ───
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    (async () => {
      let cur = await getCurrent();
      if (!cur) cur = await createFromFile('مثال — عرض تفاعلي', defaultExample);
      setCode(cur.code);
      setNotes(cur.notes || '');
      setName(cur.name);
      setPreviewSrc(transform(cur.code));
      setLastSavedAt(cur.updatedAt);
      await refreshLibrary();
      await refreshVersions(cur.id);
    })();
  }, [refreshLibrary, refreshVersions]);

  // ─── Auto-save with status updates ───
  useEffect(() => {
    if (!initializedRef.current) return;
    editsCounterRef.current += 1;
    setSaveStatus('saving');
    let cancelled = false;
    touchCurrent({ code, notes }).then((updated) => {
      if (cancelled) return;
      if (updated) {
        setSaveStatus('saved');
        setLastSavedAt(updated.updatedAt);
        const since = Date.now() - lastAutoSnapshotRef.current;
        if (since > 120_000 && editsCounterRef.current > 5) {
          lastAutoSnapshotRef.current = Date.now();
          editsCounterRef.current = 0;
          saveSnapshot(updated.id, 'حفظ تلقائي').then(() => refreshVersions(updated.id));
        }
        refreshLibrary();
      } else {
        setSaveStatus('saved');
      }
    }).catch(() => { if (!cancelled) setSaveStatus('error'); });
    return () => { cancelled = true; };
  }, [code, notes, refreshLibrary, refreshVersions]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  // Beforeunload warning
  useEffect(() => {
    if (saveStatus === 'saving' || saveStatus === 'unsaved') {
      const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [saveStatus]);

  const run = useCallback(() => {
    setPreviewSrc(transform(code));
  }, [code]);

  const loadFile = useCallback(async (fileName, text) => {
    const cleanName = (fileName || 'بدون عنوان').replace(/\.(jsx?|tsx?|txt)$/i, '');
    const entry = await createFromFile(cleanName, text);
    setCode(entry.code);
    setNotes(entry.notes || '');
    setName(entry.name);
    setPreviewSrc(transform(entry.code));
    setLastSavedAt(entry.updatedAt);
    setSaveStatus('saved');
    await refreshLibrary();
    await refreshVersions(entry.id);
  }, [refreshLibrary, refreshVersions]);

  const handleFileInput = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadFile(file.name, ev.target.result);
    reader.readAsText(file);
  }, [loadFile]);

  const handleDownload = useCallback(() => {
    const safeName = (name || 'presentation').replace(/[\\/:*?"<>|]/g, '_');
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${safeName}.jsx`; a.click();
    URL.revokeObjectURL(url);
  }, [code, name]);

  const togglePresent = useCallback(() => {
    setPresenting((p) => {
      const next = !p;
      if (next) document.documentElement.requestFullscreen?.().catch(() => {});
      else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      return next;
    });
  }, []);

  const openInWindow = useCallback(() => {
    if (!previewSrc) return;
    const blob = new Blob([previewSrc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'width=1280,height=800');
    if (!win) {
      alert('المتصفح منع فتح النافذة. اسمح للنوافذ المنبثقة من هذا الموقع.');
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, [previewSrc]);

  // ─── Library actions ───
  const openPresentation = useCallback(async (id) => {
    if (id === library.currentId) return;
    await flushPendingSave();
    await persistCurrentId(id);
    const cur = await getCurrent();
    if (cur) {
      setCode(cur.code);
      setNotes(cur.notes || '');
      setName(cur.name);
      setPreviewSrc(transform(cur.code));
      setLastSavedAt(cur.updatedAt);
      setSaveStatus('saved');
      await refreshVersions(cur.id);
    }
    await refreshLibrary();
  }, [library.currentId, refreshLibrary, refreshVersions]);

  const renameEntry = useCallback(async (id, newName) => {
    await renamePresentation(id, newName);
    if (id === library.currentId) setName(newName);
    await refreshLibrary();
  }, [library.currentId, refreshLibrary]);

  const deleteEntry = useCallback(async (id) => {
    const newCurrentId = await deletePresentation(id);
    if (id === library.currentId) {
      if (newCurrentId) {
        const cur = await getCurrent();
        if (cur) {
          setCode(cur.code); setNotes(cur.notes || ''); setName(cur.name);
          setPreviewSrc(transform(cur.code));
          setLastSavedAt(cur.updatedAt);
          await refreshVersions(cur.id);
        }
      } else {
        const seed = await createFromFile('مثال — عرض تفاعلي', defaultExample);
        setCode(seed.code); setNotes(''); setName(seed.name);
        setPreviewSrc(transform(seed.code));
        setLastSavedAt(seed.updatedAt);
        await refreshVersions(seed.id);
      }
    }
    await refreshLibrary();
  }, [library.currentId, refreshLibrary, refreshVersions]);

  const newPresentation = useCallback(async () => {
    await flushPendingSave();
    const blank =
      '// ابدأ هنا\n\nexport default function MyPresentation() {\n' +
      '  return (\n    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8">\n' +
      '      <h1 className="text-5xl font-bold">مرحبا</h1>\n    </div>\n  );\n}\n';
    const entry = await createFromFile('عرض جديد', blank);
    setCode(entry.code); setNotes(''); setName(entry.name);
    setPreviewSrc(transform(entry.code));
    setLastSavedAt(entry.updatedAt);
    setSaveStatus('saved');
    await refreshLibrary();
    await refreshVersions(entry.id);
  }, [refreshLibrary, refreshVersions]);

  // ─── Version history ───
  const handleSnapshot = useCallback(async () => {
    if (!library.currentId) return;
    const label = prompt('اعطِ النسخة اسماً (اختياري):', '') || '';
    await flushPendingSave();
    await saveSnapshot(library.currentId, label);
    await refreshVersions(library.currentId);
  }, [library.currentId, refreshVersions]);

  const handleRestore = useCallback(async (versionId) => {
    await flushPendingSave();
    const updated = await restoreVersion(versionId);
    if (updated) {
      setCode(updated.code);
      setNotes(updated.notes || '');
      setPreviewSrc(transform(updated.code));
      setLastSavedAt(updated.updatedAt);
      setSaveStatus('saved');
      await refreshVersions(updated.id);
      await refreshLibrary();
    }
    setShowHistory(false);
  }, [refreshLibrary, refreshVersions]);

  const handleDeleteVersion = useCallback(async (versionId) => {
    await deleteVersion(versionId);
    if (library.currentId) await refreshVersions(library.currentId);
  }, [library.currentId, refreshVersions]);

  // ─── Export / Import ───
  const handleExport = useCallback(async () => {
    const data = await exportLibrary();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jsx-runner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(async (file) => {
    if (!file) return;
    const text = await file.text();
    let data;
    try { data = JSON.parse(text); }
    catch { alert('الملف ليس JSON صالح.'); return; }
    const choice = confirm(
      'تبي تستبدل المكتبة بالكامل؟\nاختر OK = استبدال (يحذف الموجود)\nاختر Cancel = دمج (يضيف للموجود)'
    );
    try {
      const result = await importLibrary(data, choice ? 'replace' : 'merge');
      alert(`تمت ${choice ? 'الاستبدال' : 'الدمج'}: أضيف ${result.added} عرض.`);
      await refreshLibrary();
      const cur = await getCurrent();
      if (cur) {
        setCode(cur.code); setNotes(cur.notes || ''); setName(cur.name);
        setPreviewSrc(transform(cur.code));
        setLastSavedAt(cur.updatedAt);
        await refreshVersions(cur.id);
      }
    } catch (e) {
      alert('فشل الاستيراد: ' + e.message);
    }
  }, [refreshLibrary, refreshVersions]);

  // Theme toggle
  const handleToggleTheme = useCallback(() => {
    setThemeState((cur) => toggleTheme(cur));
  }, []);

  // ─── Sync with browser fullscreen ───
  useEffect(() => {
    const onFsChange = () => { if (!document.fullscreenElement) setPresenting(false); };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ─── Global keyboard shortcuts ───
  useEffect(() => {
    const handler = (e) => {
      const inField = e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT';
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleDownload(); }
      else if (!inField && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); togglePresent(); }
      else if (!inField && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); setSidebarCollapsed((v) => !v); }
      else if (e.key === 'Escape') {
        if (showHistory)     { e.preventDefault(); setShowHistory(false); }
        else if (presenting) {
          e.preventDefault(); setPresenting(false);
          if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [run, handleDownload, togglePresent, presenting, showHistory]);

  // ─── Drag & drop ───
  useEffect(() => {
    const onDragEnter = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setDragActive(true); }
    };
    const onDragOver = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    };
    const onDragLeave = (e) => { if (e.relatedTarget === null) setDragActive(false); };
    const onDrop = (e) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault(); setDragActive(false);
      handleFileInput(e.dataTransfer.files[0]);
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleFileInput]);

  return (
    <div className={`app ${presenting ? 'presenting' : ''}`}>
      {!presenting && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          presentations={library.presentations}
          currentId={library.currentId}
          onOpen={openPresentation}
          onNew={newPresentation}
          onRename={renameEntry}
          onDelete={deleteEntry}
          onImport={handleImport}
          onExport={handleExport}
          showNotes={showNotes}
          onToggleNotes={() => setShowNotes((v) => !v)}
        />
      )}
      <div className="main-area">
        {!presenting && (
          <Toolbar
            fileName={name}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
            now={now}
            onOpenHistory={() => setShowHistory(true)}
            onFile={handleFileInput}
            onDownload={handleDownload}
            onRun={run}
            onPresent={togglePresent}
            onOpenInWindow={openInWindow}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />
        )}
        <div className="workspace">
          <Preview srcdoc={previewSrc} presenting={presenting} />
          {!presenting && (
            <Editor
              value={code}
              onChange={setCode}
              notes={notes}
              onNotesChange={setNotes}
              showNotes={showNotes}
            />
          )}
        </div>
      </div>

      {presenting && (
        <button className="exit-present" onClick={togglePresent} title="ESC للخروج" aria-label="exit presentation">
          <X size={18} />
        </button>
      )}
      <VersionHistory
        open={showHistory}
        presentationName={name}
        versions={versions}
        onRestore={handleRestore}
        onDelete={handleDeleteVersion}
        onSnapshot={handleSnapshot}
        onClose={() => setShowHistory(false)}
      />
      {dragActive && (
        <div className="drag-overlay">
          <div className="drag-overlay-inner">
            <Upload size={42} className="drag-icon" />
            <div className="drag-text">أفلت ملف JSX هنا لتحميله</div>
            <div className="drag-sub">يدعم .jsx · .js · .tsx · .ts</div>
          </div>
        </div>
      )}
    </div>
  );
}
