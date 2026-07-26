import type { DragEvent } from 'react';

// `dragleave` fires every time the pointer crosses into a child element, not
// just when it leaves the drop zone. Every tool wired `onDragLeave` straight to
// `setDragging(false)`, so dragging a file over a zone containing a preview, a
// filename and a button made the accent border blink on and off the whole way
// across — the one piece of feedback telling the user the drop will land.
//
// The pointer has genuinely left only when whatever it moved onto sits outside
// the zone. `relatedTarget` is null when it leaves the window entirely.
export function leftDropZone(event: DragEvent<HTMLElement>): boolean {
  const related = event.relatedTarget;
  return !(related instanceof Node) || !event.currentTarget.contains(related);
}
