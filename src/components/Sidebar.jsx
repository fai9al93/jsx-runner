/**
 * Sidebar — floating card panel modeled on the reference dashboard.
 *
 * Theme toggle lives in the top bar (matching the reference), not here.
 */
import { useState, useEffect } from 'react';
import {
  ChevronRight, ChevronLeft,
  Plus, Pencil, Trash2,
  StickyNote, Download, Upload,
  FileCode2, Sparkles,
} from 'lucide-react';
import Logo from './Logo.jsx';
import Kbd from './Kbd.jsx';

function fmtRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000)    return 'الآن';
  if (diff < 3_600_000) return `قبل ${Math.floor(diff / 60_000)} د`;
  if (diff < 86_400_000) return `قبل ${Math.floor(diff / 3_600_000)} س`;
  const d = new Date(ts);
  return d.toLocaleDateString('ar', { month: 'short', day: 'numeric' });
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  presentations,
  currentId,
  onOpen,
  onNew,
  onRename,
  onDelete,
  onImport,
  onExport,
  showNotes,
  onToggleNotes,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState('');

  useEffect(() => {
    if (editingId && !presentations.find((p) => p.id === editingId)) {
      setEditingId(null);
    }
  }, [presentations, editingId]);

  const sorted = [...presentations].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const startRename = (p) => { setEditingId(p.id); setDraftName(p.name); };
  const commit = () => {
    if (editingId && draftName.trim()) onRename(editingId, draftName.trim());
    setEditingId(null);
  };

  const handleImportFile = (e) => {
    const f = e.target.files[0];
    if (f && onImport) onImport(f);
    e.target.value = '';
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-head">
        <div className="brand">
          <Logo size={28} />
          {!collapsed && <span className="brand-name">JSX Runner</span>}
        </div>
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'وسّع الشريط الجانبي (B)' : 'اطوِ الشريط الجانبي (B)'}
          aria-label={collapsed ? 'expand sidebar' : 'collapse sidebar'}
        >
          {/* In RTL, the sidebar is on the right.
              Collapsed → chevron points LEFT (toward main area = expand).
              Expanded  → chevron points RIGHT (back into the sidebar = collapse). */}
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <div className="sidebar-section">
        {!collapsed && (
          <div className="sidebar-section-head">
            <span className="sidebar-section-title">العروض</span>
            <span className="sidebar-section-count">{presentations.length}</span>
          </div>
        )}
        <button
          className={`sidebar-cta ${collapsed ? 'sidebar-cta-icon' : ''}`}
          onClick={onNew}
          title="عرض جديد"
        >
          <Plus size={16} strokeWidth={2.5} />
          {!collapsed && <span>عرض جديد</span>}
        </button>

        <ul className="sidebar-list">
          {sorted.length === 0 && !collapsed && (
            <li className="sidebar-empty">
              <Sparkles size={20} className="sidebar-empty-ico" />
              <p>ابدأ بسحب ملف JSX هنا، أو أنشئ عرضاً جديداً.</p>
            </li>
          )}
          {sorted.map((p) => {
            const active = p.id === currentId;
            return (
              <li
                key={p.id}
                className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}
                title={collapsed ? p.name : ''}
              >
                <button className="sidebar-item-main" onClick={() => onOpen(p.id)}>
                  <span className="ico">
                    <FileCode2 size={14} strokeWidth={2} />
                  </span>
                  {!collapsed && (
                    editingId === p.id ? (
                      <input
                        autoFocus
                        className="sidebar-rename"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={commit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="sidebar-item-text">
                        <span className="sidebar-item-name">{p.name}</span>
                        <span className="sidebar-item-time">{fmtRelative(p.updatedAt)}</span>
                      </span>
                    )
                  )}
                </button>
                {!collapsed && editingId !== p.id && (
                  <div className="sidebar-item-actions">
                    <button
                      className="icon-btn"
                      onClick={(e) => { e.stopPropagation(); startRename(p); }}
                      title="إعادة تسمية"
                    ><Pencil size={13} /></button>
                    <button
                      className="icon-btn icon-btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`حذف "${p.name}"؟`)) onDelete(p.id);
                      }}
                      title="حذف"
                    ><Trash2 size={13} /></button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {!collapsed && sorted.length > 0 && (
          <div className="sidebar-tip">
            <div className="sidebar-tip-title">⌨️ اختصار سريع</div>
            <div className="sidebar-tip-row">
              <span>تشغيل العرض</span>
              <Kbd keys={['⌘', '↵']} />
            </div>
            <div className="sidebar-tip-row">
              <span>ملء الشاشة</span>
              <Kbd keys={['F']} />
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-foot">
        <button
          className={`sidebar-pill ${showNotes ? 'sidebar-pill-active' : ''}`}
          onClick={onToggleNotes}
          title="ملاحظات المُلقي"
        >
          <StickyNote size={16} className="ico" />
          {!collapsed && <span>ملاحظات</span>}
        </button>

        <button className="sidebar-pill" onClick={onExport} title="تنزيل نسخة احتياطية">
          <Download size={16} className="ico" />
          {!collapsed && <span>تنزيل النسخة</span>}
        </button>

        <label className="sidebar-pill" title="استيراد نسخة احتياطية">
          <Upload size={16} className="ico" />
          {!collapsed && <span>استيراد</span>}
          <input
            type="file"
            className="file-input"
            accept="application/json,.json"
            onChange={handleImportFile}
          />
        </label>
      </div>
    </aside>
  );
}
