import { describe, it, expect } from 'vitest';
import type { DragEvent } from 'react';
import { leftDropZone } from '@/lib/drag-utils';

// Lives in the jsdom project rather than the node one: the helper is about real
// DOM containment, and `Node` does not exist outside a document.
function event(zone: Element, relatedTarget: EventTarget | null) {
  return { currentTarget: zone, relatedTarget } as unknown as DragEvent<HTMLElement>;
}

function zoneWithChild() {
  const zone = document.createElement('div');
  const child = document.createElement('span');
  const grandchild = document.createElement('button');
  child.appendChild(grandchild);
  zone.appendChild(child);
  document.body.appendChild(zone);
  return { zone, child, grandchild };
}

describe('leftDropZone', () => {
  it('is false while the pointer moves onto a child — the cause of the flicker', () => {
    const { zone, child } = zoneWithChild();
    expect(leftDropZone(event(zone, child))).toBe(false);
  });

  it('is false for a deeply nested descendant too', () => {
    const { zone, grandchild } = zoneWithChild();
    expect(leftDropZone(event(zone, grandchild))).toBe(false);
  });

  it('is false when the pointer is still on the zone itself', () => {
    const { zone } = zoneWithChild();
    expect(leftDropZone(event(zone, zone))).toBe(false);
  });

  it('is true when the pointer moves onto something outside', () => {
    const { zone } = zoneWithChild();
    const outside = document.createElement('p');
    document.body.appendChild(outside);
    expect(leftDropZone(event(zone, outside))).toBe(true);
  });

  it('is true when the pointer leaves the window, where relatedTarget is null', () => {
    const { zone } = zoneWithChild();
    expect(leftDropZone(event(zone, null))).toBe(true);
  });
});
