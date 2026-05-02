/**
 * Kbd — keyboard shortcut chip.
 * Renders one or more keys as a small badge group, styled like a
 * physical key (Linear / Notion / Raycast).
 *
 *   <Kbd keys={['⌘', '↵']} />
 *   <Kbd keys={['F']} />
 */
export default function Kbd({ keys }) {
  const items = Array.isArray(keys) ? keys : [keys];
  return (
    <span className="kbd-group" aria-hidden="true">
      {items.map((k, i) => (
        <kbd key={i} className="kbd">{k}</kbd>
      ))}
    </span>
  );
}
