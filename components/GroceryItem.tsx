import React from 'react';
import type { GroceryItem as GroceryItemType } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface GroceryItemProps {
  item: GroceryItemType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveToFavorites?: (id: string) => void;
}

export const GroceryItem: React.FC<GroceryItemProps> = ({ item, onToggle, onDelete, onMoveToFavorites }) => {
  const isRTL = document.documentElement.dir === 'rtl';

  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const startXRef = React.useRef<number | null>(null);
  const startYRef = React.useRef<number | null>(null);
  const isSwipingRef = React.useRef(false);
  const swipedRef = React.useRef(false);

  const resetDrag = () => {
    setDragX(0);
    setDragging(false);
    startXRef.current = null;
    startYRef.current = null;
    isSwipingRef.current = false;
  };

  // Shared drag helpers
  const THRESHOLD = 40;
  const INTENT_THRESHOLD = 8;
  const CLAMP = 160;

  const beginDrag = (x: number, y: number) => {
    startXRef.current = x;
    startYRef.current = y;
    isSwipingRef.current = false;
    setDragging(false);
  };

  const updateDrag = (x: number, y: number, e?: { preventDefault?: () => void }) => {
    if (startXRef.current == null || startYRef.current == null) return;
    const dx = x - startXRef.current;
    const dy = y - startYRef.current;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (!isSwipingRef.current) {
      if (ay > INTENT_THRESHOLD && ay > ax) {
        return; // vertical scroll
      }
      if (ax > INTENT_THRESHOLD && ax > ay) {
        isSwipingRef.current = true;
        setDragging(true);
      } else {
        return;
      }
    }
    if (isSwipingRef.current && e && e.preventDefault) {
      try { e.preventDefault(); } catch {}
    }
    const clamped = Math.max(-CLAMP, Math.min(CLAMP, dx));
    setDragX(clamped);
  };

  const endDrag = () => {
    if (Math.abs(dragX) > 10) {
      swipedRef.current = true;
      setTimeout(() => { swipedRef.current = false; }, 250);
    }
    const effectiveX = isRTL ? -dragX : dragX;
    if (effectiveX > THRESHOLD && onMoveToFavorites) {
      onMoveToFavorites(item.id);
    } else if (effectiveX < -THRESHOLD) {
      onDelete(item.id);
    }
    resetDrag();
  };

  // Touch events (iOS fallback)
  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0];
    beginDrag(t.clientX, t.clientY);
  };
  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0];
    updateDrag(t.clientX, t.clientY, e);
  };
  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    endDrag();
  };

  // Pointer Events (modern browsers)
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    beginDrag(e.clientX, e.clientY);
    try { (e.currentTarget as any).setPointerCapture?.(e.pointerId); } catch {}
  };
  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    updateDrag(e.clientX, e.clientY, e);
  };
  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    endDrag();
    try { (e.currentTarget as any).releasePointerCapture?.(e.pointerId); } catch {}
  };
  const onPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
    resetDrag();
    try { (e.currentTarget as any).releasePointerCapture?.(e.pointerId); } catch {}
  };

  const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      className="relative"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={resetDrag}
      style={{ touchAction: 'pan-y' as any, WebkitUserSelect: 'none' as any, WebkitTouchCallout: 'none' as any }}
      onClick={(e) => { if (dragging || Math.abs(dragX) > 0) { e.preventDefault(); e.stopPropagation(); } }}
    >
      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
        {(() => {
          const effectiveX = isRTL ? -dragX : dragX;
          const bg = effectiveX > 20 ? 'bg-green-300' : effectiveX < -20 ? 'bg-red-300' : 'bg-transparent';
          return (<div className={`absolute inset-0 transition-colors ${bg}`} />);
        })()}
      </div>
      <div
        className="flex items-center p-3 transition-colors rounded-lg group bg-white hover:bg-gray-50 shadow-sm select-none"
        style={{ transform: `translateX(${dragX}px)`, transition: dragging ? 'none' : 'transform 120ms ease-out', cursor: dragging ? 'grabbing' : 'auto', userSelect: dragging ? 'none' : 'auto', willChange: 'transform' }}
      >
        {children}
      </div>
    </div>
  );

  if (isRTL) {
    return (
      <Container>
        {/* Delete button - Right side in RTL (mirrored) */}
        <div className="flex-shrink-0">
          <button
            onClick={() => onDelete(item.id)}
            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Delete ${item.name}`}
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Item name and chips - Center */}
        <div className="flex-1 ml-3 mr-1">
          <div className="flex items-center gap-2 flex-row-reverse">
            {(item.quantity && item.quantity > 1) || item.unit ? (
              <div className="flex items-center gap-1">
                {item.quantity && item.quantity > 1 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{item.quantity}</span>
                )}
                {item.unit && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{item.unit}</span>
                )}
              </div>
            ) : null}
            <label
              htmlFor={`item-${item.id}`}
              className={`text-gray-700 transition-colors cursor-pointer flex-1 text-right ${item.completed ? 'line-through text-gray-400' : ''}`}
            >
              {item.name}
            </label>
          </div>
        </div>

        {/* Checkbox - Left side in RTL (mirrored) */}
        <div className="flex items-center gap-3 flex-shrink-0 flex-row-reverse">
          <input
            id={`item-${item.id}`}
            type="checkbox"
            checked={item.completed}
            onClick={(e) => { if (swipedRef.current) { e.preventDefault(); e.stopPropagation(); return; } onToggle(item.id); }}
            className="h-6 w-6 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
          />
        </div>
      </Container>
    );
  }

  // LTR
  return (
    <Container>
      {/* Checkbox - Left */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <input
          id={`item-${item.id}`}
          type="checkbox"
          checked={item.completed}
          onClick={(e) => { if (swipedRef.current) { e.preventDefault(); e.stopPropagation(); return; } onToggle(item.id); }}
          className="h-6 w-6 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
        />
      </div>

      {/* Item name and chips - Center */}
      <div className="flex-1 mx-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor={`item-${item.id}`}
            className={`text-gray-700 transition-colors cursor-pointer flex-1 text-left ${item.completed ? 'line-through text-gray-400' : ''}`}
          >
            {item.name}
          </label>
          {(item.quantity && item.quantity > 1) || item.unit ? (
            <div className="flex items-center gap-1">
              {item.quantity && item.quantity > 1 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{item.quantity}</span>
              )}
              {item.unit && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{item.unit}</span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Delete button - Right */}
      <div className="flex-shrink-0">
        <button
          onClick={() => onDelete(item.id)}
          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`Delete ${item.name}`}
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </Container>
  );
};
