import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './MapBottomSheet.css';

export type SheetMode = 'collapsed' | 'expanded';

interface MapBottomSheetProps {
  open: boolean;
  mode: SheetMode;
  onClose: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const MapBottomSheet: React.FC<MapBottomSheetProps> = ({
  open,
  mode,
  onClose,
  onExpand,
  onCollapse,
  children,
  header,
  footer,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<number>(0);
  const dragCurrentRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Focus trap when expanded - prevents Tab from escaping sheet (WCAG 2.1 requirement)
  // This ensures keyboard users stay within the modal context until they explicitly close it
  useEffect(() => {
    if (open && mode === 'expanded' && sheetRef.current) {
      const sheet = sheetRef.current;
      const focusableElements = sheet.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };

      sheet.addEventListener('keydown', handleTab);
      return () => sheet.removeEventListener('keydown', handleTab);
    }
  }, [open, mode]);

  // ESC key to close
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Android back button handling - intercepts back button to close sheet instead of navigating
  // This matches native app behavior (Gmail, Maps, etc.) and prevents accidental navigation
  useEffect(() => {
    if (!open) return;

    const handlePopState = () => {
      onClose();
    };

    // Push a dummy history state when sheet opens - back button will pop this first
    window.history.pushState({ sheetOpen: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up history if sheet is still open
      if (window.history.state?.sheetOpen) {
        window.history.back();
      }
    };
  }, [open, onClose]);

  // Drag handlers
  const handleDragStart = useCallback((clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = clientY;
    dragCurrentRef.current = clientY;
    
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDraggingRef.current || !sheetRef.current) return;

    const delta = clientY - dragStartRef.current;
    dragCurrentRef.current = clientY;
    
    // Allow both upward (negative delta) and downward (positive delta) dragging
    // Upward drag when collapsed = expand gesture
    // Downward drag = collapse or close gesture
    if (mode === 'collapsed' && delta < 0) {
      // Upward drag in collapsed mode - allow with slight resistance
      sheetRef.current.style.transform = `translateY(${delta * 0.5}px)`;
    } else if (delta > 0) {
      // Downward drag - always allowed
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }, [mode]);

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current || !sheetRef.current) return;

    const delta = dragCurrentRef.current - dragStartRef.current;
    
    // Reset transform and transition
    sheetRef.current.style.transition = '';
    sheetRef.current.style.transform = '';
    
    isDraggingRef.current = false;

    // Determine action based on drag distance
    const threshold = 50; // pixels
    const expandThreshold = 30; // Lower threshold for upward drag to expand (more sensitive)

    if (delta > threshold) {
      if (mode === 'expanded') {
        onCollapse();
      } else {
        onClose();
      }
    } else if (delta < -expandThreshold && mode === 'collapsed') {
      onExpand();
    }
  }, [mode, onExpand, onCollapse, onClose]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientY);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientY);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scroll bounce on iOS
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault(); // Prevent competing gestures
    handleDragMove(e.touches[0].clientY);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Attach global listeners for drag
  useEffect(() => {
    if (!isDraggingRef.current) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Handle drag handle click (toggle expand/collapse)
  const handleHandleClick = () => {
    if (mode === 'collapsed') {
      onExpand();
    } else {
      onCollapse();
    }
  };

  // Prevent scroll propagation to map when scrolling inside sheet
  // This fixes the common issue where scrolling in a modal also scrolls the page/map behind it
  const handleContentWheel = (e: React.WheelEvent) => {
    const content = contentRef.current;
    if (!content) return;

    const { scrollTop, scrollHeight, clientHeight } = content;
    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight;

    // Allow scroll only if not at boundaries (prevents elastic scroll from passing through)
    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      e.preventDefault();  // Block further scrolling at boundaries
    } else {
      e.stopPropagation();  // Allow sheet scroll, block map scroll
    }
  };

  if (!open) return null;

  const sheetContent = (
    <>
      {/* Backdrop */}
      <div 
        className="map-bottom-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`map-bottom-sheet map-bottom-sheet--${mode}`}
        role="dialog"
        aria-modal="true"
        aria-label="Location details"
      >
        {/* Drag Handle */}
        <div 
          className="map-bottom-sheet__handle-container"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleHandleClick}
        >
          <div className="map-bottom-sheet__handle" />
        </div>

        {/* Header */}
        {header && (
          <div className="map-bottom-sheet__header">
            {header}
          </div>
        )}

        {/* Content */}
        <div 
          ref={contentRef}
          className="map-bottom-sheet__content"
          onWheel={handleContentWheel}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="map-bottom-sheet__footer">
            {footer}
          </div>
        )}

        {/* Close Button */}
        <button
          className="map-bottom-sheet__close"
          onClick={onClose}
          aria-label="Close details"
        >
          ×
        </button>
      </div>
    </>
  );

  return createPortal(sheetContent, document.body);
};
