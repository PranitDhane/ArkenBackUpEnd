/**
 * ImageLightbox — full-viewport image overlay with scroll-to-zoom and drag-to-pan.
 *
 * Follows the ShareModal.jsx pattern: fixed backdrop, Escape to close, click-outside to close.
 * Zero external dependencies — zoom/pan uses pure CSS transform.
 *
 * Props:
 *   src       string   — full image source (data URI or URL)
 *   alt       string   — alt text for the image
 *   onClose   fn       — called when lightbox should close
 */

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.15;
const INITIAL_TRANSLATE = { x: 0, y: 0 };

/**
 * Custom hook — holds a value as both React state (for rendering) and a ref
 * (for reading the latest value inside event handlers without stale closures).
 * Eliminates the need for separate useState + useRef + useEffect sync.
 */
function useStateRef(initial) {
  const [value, setValue] = useState(initial);
  const ref = useRef(initial);
  const set = (next) => {
    const resolved = typeof next === 'function' ? next(ref.current) : next;
    ref.current = resolved;
    setValue(resolved);
  };
  return [value, set, ref];
}

export default function ImageLightbox({ src, alt, onClose }) {
  const [scale, setScale, scaleRef] = useStateRef(MIN_SCALE);
  const [translate, setTranslate, translateRef] = useStateRef(INITIAL_TRANSLATE);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  // Close on Escape (matches ShareModal.jsx pattern)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleWheel = (e) => {
    e.preventDefault();
    setScale((prev) => {
      const next = e.deltaY < 0 ? prev + ZOOM_STEP : prev - ZOOM_STEP;
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    });
  };

  const handleDoubleClick = () => {
    setScale(MIN_SCALE);
    setTranslate(INITIAL_TRANSLATE);
  };

  const handleMouseDown = (e) => {
    if (scaleRef.current <= MIN_SCALE) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translateRef.current };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTranslate({
      x: translateStart.current.x + (e.clientX - dragStart.current.x),
      y: translateStart.current.y + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Reset translate when zooming back to 1x
  useEffect(() => {
    if (scale <= MIN_SCALE) setTranslate(INITIAL_TRANSLATE);
  }, [scale]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Image preview: ${alt}`}
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full transition-colors z-10"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
        title="Close (Esc)"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image with zoom/pan */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="select-none"
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
          cursor: scale > MIN_SCALE ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
}
