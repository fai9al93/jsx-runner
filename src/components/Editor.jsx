/**
 * Editor — the JSX textarea pane, with optional speaker-notes panel below it.
 * Tab key inserts 2 spaces instead of moving focus.
 *
 * Wrapped in a card-style .pane.
 */
export default function Editor({ value, onChange, notes, onNotesChange, showNotes }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.target;
      const next =
        e.target.value.substring(0, selectionStart) + '  ' + e.target.value.substring(selectionEnd);
      const setter = e.target.dataset.field === 'notes' ? onNotesChange : onChange;
      setter(next);
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = selectionStart + 2;
      });
    }
  };

  return (
    <div className="pane editor-pane">
      <div className="pane-head">
        <span className="pane-label">المحرّر</span>
        <span className="pane-meta">JSX</span>
      </div>
      <textarea
        className="editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder="// الصق JSX هنا واضغط شغّل"
        data-field="code"
      />
      {showNotes && (
        <>
          <div className="pane-head pane-head-notes">
            <span className="pane-label">📝 ملاحظات المُلقي</span>
            <span className="pane-meta">محلية فقط</span>
          </div>
          <textarea
            className="notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="نقاطك للحديث، أرقام، تذكيرات..."
            data-field="notes"
          />
        </>
      )}
    </div>
  );
}
