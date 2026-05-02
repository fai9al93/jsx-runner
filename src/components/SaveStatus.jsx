/**
 * SaveStatus — small pill in the toolbar that mirrors save lifecycle.
 *
 * status: 'saved' | 'saving' | 'unsaved' | 'error'
 * lastSavedAt: number | null   (epoch ms)
 *
 * The relative-time string is recomputed by the parent (App.jsx) on a
 * timer so this component stays a stateless dumb pill.
 */
import { Check, Loader2, AlertCircle, Circle } from 'lucide-react';

const META = {
  saved:   { Icon: Check,       text: 'محفوظ' },
  saving:  { Icon: Loader2,     text: 'يحفظ...', spin: true },
  unsaved: { Icon: Circle,      text: 'تغييرات' },
  error:   { Icon: AlertCircle, text: 'فشل الحفظ' },
};

function relative(ts, now) {
  if (!ts) return '';
  const diff = Math.max(0, now - ts);
  if (diff < 5_000)   return 'الآن';
  if (diff < 60_000)  return `قبل ${Math.floor(diff / 1000)} ث`;
  if (diff < 3_600_000) return `قبل ${Math.floor(diff / 60_000)} د`;
  if (diff < 86_400_000) return `قبل ${Math.floor(diff / 3_600_000)} س`;
  return new Date(ts).toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SaveStatus({ status, lastSavedAt, now, onClick }) {
  const meta = META[status] || META.saved;
  const ts = status === 'saved' && lastSavedAt ? relative(lastSavedAt, now || Date.now()) : '';
  const Icon = meta.Icon;

  return (
    <button
      type="button"
      className={`save-pill save-pill-${status}`}
      onClick={onClick}
      title="انقر لفتح تاريخ النسخ"
    >
      <Icon
        size={12}
        strokeWidth={2.5}
        className={`save-pill-ico save-pill-ico-${status} ${meta.spin ? 'spin' : ''}`}
      />
      <span className="save-text">{meta.text}</span>
      {ts && <span className="save-time">· {ts}</span>}
    </button>
  );
}
