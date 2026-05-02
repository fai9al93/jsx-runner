/**
 * VersionHistory — modal listing all snapshots for the current presentation.
 */
import { History, Camera, RotateCcw, Trash2, X } from 'lucide-react';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'الآن';
  if (diff < 3_600_000) return `قبل ${Math.floor(diff / 60_000)} د`;
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) {
    return 'أمس ' + d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })
       + ' ' + d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
}

function tagFor(label) {
  if (!label) return null;
  if (label.includes('أصلية')) return { text: 'أصلية',  className: 'badge-blue' };
  if (label.includes('تلقائي')) return { text: 'تلقائي', className: 'badge-gray' };
  if (label.includes('قبل الاستعادة')) return { text: 'استعادة', className: 'badge-amber' };
  return { text: 'مخصّص', className: 'badge-violet' };
}

export default function VersionHistory({
  open, presentationName, versions,
  onRestore, onDelete, onSnapshot, onClose,
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              <History size={16} className="modal-title-ico" />
              تاريخ النسخ
            </h2>
            <div className="modal-subtitle">{presentationName}</div>
          </div>
          <div className="modal-header-actions">
            <button className="btn btn-primary" onClick={onSnapshot}>
              <Camera size={14} /> احفظ نسخة
            </button>
            <button className="icon-btn" onClick={onClose} title="إغلاق"><X size={16} /></button>
          </div>
        </div>

        {versions.length === 0 ? (
          <div className="modal-empty">
            <div className="modal-empty-ico"><History size={28} /></div>
            <p>مافي نسخ بعد. اضغط <strong>احفظ نسخة</strong> لتثبيت الحالة الحالية،
               أو خلّ التطبيق يحفظ تلقائياً مع التعديلات.</p>
          </div>
        ) : (
          <ul className="version-list">
            {versions.map((v, i) => {
              const tag = tagFor(v.label);
              return (
                <li key={v.id} className="version-item">
                  <div className="version-info">
                    <div className="version-label">
                      {v.label || `نسخة #${versions.length - i}`}
                      {tag && <span className={`badge ${tag.className}`}>{tag.text}</span>}
                    </div>
                    <div className="version-time">{formatTime(v.createdAt)}</div>
                  </div>
                  <div className="version-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        if (confirm('استعادة هذي النسخة؟ النسخة الحالية بتنحفظ كنسخة قبل الاستبدال.')) {
                          onRestore(v.id);
                        }
                      }}
                    ><RotateCcw size={14} /> استعادة</button>
                    <button
                      className="icon-btn icon-btn-danger"
                      onClick={() => { if (confirm('حذف هذي النسخة؟')) onDelete(v.id); }}
                      title="حذف النسخة"
                    ><Trash2 size={14} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
