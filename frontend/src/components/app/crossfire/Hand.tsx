import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { VisibleCard } from '../../../../../play/view/types.ts';
import { HiddenHand } from './GameCard.tsx';
import { moveHandCard, reconcileHand } from './handOrder.ts';

function fanPosition(index: number, count: number): CSSProperties {
  const position = count > 1 ? (index / (count - 1)) * 2 - 1 : 0;
  return {
    '--fan-angle': `${position * Math.min(count * 1.4, 10)}deg`,
    '--fan-drop': `${position ** 2 * 13}px`,
  } as CSSProperties;
}
type Drag = {
  id: string;
  pointer: number;
  x: number;
  y: number;
  started: boolean;
  centers: { id: string; x: number }[];
  top: number;
  bottom: number;
};
export function Hand({
  cards,
  count,
  own,
  label,
  renderCard,
}: {
  cards: VisibleCard[];
  count: number;
  own: boolean;
  label: string;
  renderCard: (card: VisibleCard) => ReactNode;
}) {
  const [order, setOrder] = useState<string[]>([]);
  const [preview, setPreview] = useState<{
    id: string;
    target: string;
    dx: number;
    dy: number;
  } | null>(null);
  const drag = useRef<Drag | null>(null);
  const fan = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const handles = cards.map(c => c.id);
  const ordered = reconcileHand(order, handles);
  // A departing physical card loses its position, even if a later copy returns.
  if (order.join('|') !== ordered.join('|')) setOrder(ordered);
  function destination(current: Drag, x: number, y: number) {
    if (y < current.top - 100 || y > current.bottom + 100) return current.id;
    return current.centers.reduce((nearest, item) =>
      Math.abs(item.x - x) < Math.abs(nearest.x - x) ? item : nearest,
    ).id;
  }
  return (
    <div className="cf-hand" aria-label={label} data-reorderable={own}>
      {cards.length ? (
        <div
          ref={fan}
          className="cf-hand-fan"
          style={{ '--fan-count': cards.length } as CSSProperties}
        >
          {ordered.map((id, index) => (
            <div
              key={id}
              className="cf-hand-slot"
              data-hand-card={id}
              data-dragging={preview?.id === id}
              data-drop-target={preview?.target === id && preview.id !== id}
              style={
                {
                  ...fanPosition(index, cards.length),
                  '--drag-x': `${preview?.dx ?? 0}px`,
                  '--drag-y': `${preview?.dy ?? 0}px`,
                } as CSSProperties
              }
              onPointerDown={event => {
                if (!event.isPrimary || event.button !== 0 || drag.current) return;
                suppressClick.current = false;
                if (!own) return;
                const parent = fan.current!;
                const rect = parent.getBoundingClientRect();
                // Untransformed slot positions stay stable as the dragged card lifts.
                const centers = [...parent.querySelectorAll<HTMLElement>('[data-hand-card]')].map(
                  slot => ({
                    id: slot.dataset.handCard!,
                    x:
                      rect.x +
                      slot.offsetLeft -
                      parent.offsetLeft +
                      (slot.querySelector<HTMLElement>('.cf-card')?.offsetWidth ?? 0) / 2,
                  }),
                );
                drag.current = {
                  id,
                  pointer: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  started: false,
                  centers,
                  top: rect.top,
                  bottom: rect.bottom,
                };
                (event.target as HTMLElement).closest('button')?.setPointerCapture(event.pointerId);
              }}
              onPointerMove={event => {
                const current = drag.current;
                if (!current || current.pointer !== event.pointerId) return;
                const dx = event.clientX - current.x,
                  dy = event.clientY - current.y;
                if (!current.started && Math.hypot(dx, dy) < 8) return;
                current.started = true;
                suppressClick.current = true;
                setPreview({
                  id,
                  target: destination(current, event.clientX, event.clientY),
                  dx,
                  dy,
                });
              }}
              onPointerUp={event => {
                const current = drag.current;
                if (!current || current.pointer !== event.pointerId) return;
                if (current.started) {
                  setOrder(
                    moveHandCard(
                      ordered,
                      current.id,
                      destination(current, event.clientX, event.clientY),
                    ),
                  );
                  suppressClick.current = true;
                }
                drag.current = null;
                setPreview(null);
                const captured = event.target as HTMLElement;
                if (captured.hasPointerCapture(event.pointerId))
                  captured.releasePointerCapture(event.pointerId);
              }}
              onLostPointerCapture={() => {
                drag.current = null;
                setPreview(null);
              }}
              onPointerCancel={() => {
                drag.current = null;
                setPreview(null);
                suppressClick.current = true;
              }}
              onContextMenu={event => {
                if (drag.current?.started) event.preventDefault();
              }}
              onClickCapture={event => {
                if (suppressClick.current || drag.current?.started) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onKeyDown={event => {
                if (['Enter', ' '].includes(event.key)) suppressClick.current = false;
                if (event.key === 'Escape' && drag.current) {
                  event.preventDefault();
                  drag.current = null;
                  setPreview(null);
                  suppressClick.current = true;
                }
                if (!own || !event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key))
                  return;
                event.preventDefault();
                const target = ordered[index + (event.key === 'ArrowLeft' ? -1 : 1)];
                if (target) setOrder(moveHandCard(ordered, id, target));
              }}
            >
              {renderCard(cards.find(c => c.id === id)!)}
            </div>
          ))}
        </div>
      ) : (
        <HiddenHand count={count} />
      )}
      {own && (
        <span className="sr-only">
          Drag cards to reorder your hand, or use Alt and the left or right arrow key.
        </span>
      )}
    </div>
  );
}
