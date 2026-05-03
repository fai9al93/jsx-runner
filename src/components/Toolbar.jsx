/**
 * Toolbar — page header for the workspace.
 *
 * Layout:
 *   [page title (filename)  +  save status]   ──spacer──   [theme switch]  [actions]
 */
import {
  Sun, Moon,
  FolderOpen,
  Monitor, Presentation, Play,
  Code2, CodeXml,
} from 'lucide-react';
import SaveStatus from './SaveStatus.jsx';
import Kbd from './Kbd.jsx';
import ExportMenu from './ExportMenu.jsx';

export default function Toolbar({
  fileName,
  saveStatus,
  lastSavedAt,
  now,
  onOpenHistory,
  onFile,
  onDownload,
  onExportPDF,
  onExportPPTX,
  onRun,
  onPresent,
  onOpenInWindow,
  theme,
  onToggleTheme,
  editorHidden,
  onToggleEditor,
}) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onFile(file);
    e.target.value = '';
  };

  const setLight = () => { if (theme !== 'light') onToggleTheme(); };
  const setDark  = () => { if (theme !== 'dark')  onToggleTheme(); };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title" title={fileName}>{fileName || 'بدون عنوان'}</h1>
        <SaveStatus
          status={saveStatus}
          lastSavedAt={lastSavedAt}
          now={now}
          onClick={onOpenHistory}
        />
      </div>

      <div className="topbar-actions">
        <div className="theme-switch" role="group" aria-label="Theme">
          <button
            type="button"
            className={`theme-switch-btn ${theme === 'light' ? 'theme-switch-btn-active' : ''}`}
            onClick={setLight}
            title="الوضع الفاتح"
            aria-label="light theme"
          ><Sun size={14} /></button>
          <button
            type="button"
            className={`theme-switch-btn ${theme === 'dark' ? 'theme-switch-btn-active' : ''}`}
            onClick={setDark}
            title="الوضع الداكن"
            aria-label="dark theme"
          ><Moon size={14} /></button>
        </div>

        <label className="btn btn-ghost" title="افتح ملف JSX">
          <FolderOpen size={16} />
          <input
            type="file"
            className="file-input"
            accept=".jsx,.js,.tsx,.ts,.txt"
            onChange={handleFileChange}
          />
        </label>
        <ExportMenu
          onExportJSX={onDownload}
          onExportPDF={onExportPDF}
          onExportPPTX={onExportPPTX}
        />
        <button
          className="btn btn-ghost"
          onClick={onToggleEditor}
          title={editorHidden ? 'إظهار المحرّر' : 'إخفاء المحرّر'}
          aria-label={editorHidden ? 'show editor' : 'hide editor'}
          aria-pressed={!editorHidden}
        >
          {editorHidden ? <CodeXml size={16} /> : <Code2 size={16} />}
        </button>
        <button className="btn btn-ghost" onClick={onOpenInWindow} title="فتح المعاينة في نافذة منفصلة">
          <Monitor size={16} />
        </button>
        <button className="btn btn-secondary" onClick={onPresent} title="ملء الشاشة">
          <Presentation size={15} /> اعرض
          <Kbd keys={['F']} />
        </button>
        <button className="btn btn-primary" onClick={onRun} title="شغّل">
          <Play size={14} fill="currentColor" /> شغّل
          <Kbd keys={['⌘', '↵']} />
        </button>
      </div>
    </header>
  );
}
