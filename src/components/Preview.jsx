/**
 * Preview — sandboxed iframe that renders the user's compiled code.
 * Wrapped in a card-style .pane with a header.
 *
 * In presentation mode the parent layout collapses so the iframe
 * fills the whole viewport.
 */
export default function Preview({ srcdoc, presenting }) {
  return (
    <div className={`pane preview-pane ${presenting ? 'preview-fullscreen' : ''}`}>
      {!presenting && (
        <div className="pane-head">
          <span className="pane-label">المعاينة</span>
          <span className="pane-meta">live</span>
        </div>
      )}
      <iframe
        className="preview"
        srcDoc={srcdoc}
        sandbox="allow-scripts allow-modals"
        title="JSX preview"
      />
    </div>
  );
}
