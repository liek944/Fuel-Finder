# Bottom Sheet Event Propagation Fix

## Problem
The bottom sheet had two critical issues:
1. **Not draggable** - Dragging didn't work at all
2. **Image flashing** - Clicking on the drag handle caused images to rapidly cycle/flash

## Root Cause

### Issue 1: Dragging Not Working
The drag functionality was broken because:
- Event listeners were attached in a `useEffect` that depended on `isDraggingRef.current`
- Since refs don't trigger re-renders, the listeners were never actually attached
- The drag events had no handlers to process the movement

### Issue 2: Event Propagation
When clicking on the drag handle:
- Click events were bubbling down through the DOM
- Events reached the `ImageSlideshow` component inside the sheet content
- ImageSlideshow buttons were being triggered, causing rapid image cycling
- This created the "flashing" effect the user reported

This is similar to the POI marker issue where events propagated to unintended targets.

## Solution Implemented

### 1. Fixed Drag Functionality (`MapBottomSheet.tsx`)
Restructured event listener attachment:

```typescript
// BEFORE: Listeners in useEffect (didn't work)
useEffect(() => {
  if (!isDraggingRef.current) return;
  document.addEventListener('mousemove', handleMouseMove);
  // ...
}, [isDraggingRef.current]); // ❌ Refs don't trigger effects

// AFTER: Listeners attached directly in drag start
const handleDragStart = useCallback((clientY: number, isTouch: boolean) => {
  isDraggingRef.current = true;
  dragStartRef.current = clientY;
  
  // Attach global listeners immediately
  if (isTouch) {
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
  } else {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
}, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);
```

Also fixed callback order to prevent circular dependencies:
1. Define `handleDragMove` first
2. Define `handleDragEnd` 
3. Define `handleMouseMove`/`handleTouchMove`/etc (use the above)
4. Define `handleDragStart` last (uses all the above)

### 2. Fixed Event Propagation

#### MapBottomSheet Handlers
Added `stopPropagation()` to all interactive events:

```typescript
const handleMouseDown = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation(); // ✅ Prevent reaching content below
  handleDragStart(e.clientY, false);
};

const handleTouchStart = (e: React.TouchEvent) => {
  e.stopPropagation(); // ✅ Prevent reaching content below
  handleDragStart(e.touches[0].clientY, true);
};

const handleHandleClick = (e: React.MouseEvent) => {
  e.stopPropagation(); // ✅ Prevent reaching ImageSlideshow
  e.preventDefault();
  
  if (!isDraggingRef.current) {
    if (mode === 'collapsed') onExpand();
    else onCollapse();
  }
};
```

#### ImageSlideshow Buttons
Added `stopPropagation()` to all buttons:

```typescript
// Navigation buttons
const nextImage = (e?: React.MouseEvent) => {
  e?.stopPropagation(); // ✅ Prevent bubbling to parent
  setCurrentIndex((currentIndex + 1) % images.length);
};

const prevImage = (e?: React.MouseEvent) => {
  e?.stopPropagation(); // ✅ Prevent bubbling to parent
  setCurrentIndex((currentIndex - 1 + images.length) % images.length);
};

// Dot indicators
onClick={(e) => {
  e.stopPropagation(); // ✅ Prevent bubbling to parent
  setCurrentIndex(index);
}}
```

## Files Modified

1. **frontend/src/components/map/MapBottomSheet.tsx**
   - Restructured drag handler callbacks (proper order)
   - Moved event listener attachment to `handleDragStart`
   - Added `stopPropagation()` to all mouse/touch handlers
   - Removed redundant useEffect

2. **frontend/src/components/common/ImageSlideshow.tsx**
   - Added event parameter to `nextImage()` and `prevImage()`
   - Added `stopPropagation()` to all button onClick handlers
   - Updated onClick calls to pass event parameter

## Testing Checklist

✅ **Drag Handle Click**
- Click on handle area → should toggle expand/collapse
- Should NOT cause images to flash/cycle

✅ **Drag Functionality**
- Touch drag up (collapsed) → should expand sheet
- Touch drag down (expanded) → should collapse sheet
- Touch drag down (collapsed) → should close sheet
- Mouse drag should work identically

✅ **ImageSlideshow Interactions**
- Click prev/next buttons → should navigate images
- Click on image → should advance to next
- Click dot indicators → should jump to that image
- All clicks should NOT trigger drag handle

✅ **Sheet Behavior**
- Backdrop click → should close sheet
- ESC key → should close sheet
- Android back button → should close sheet

## Technical Details

### Event Propagation Chain
```
MapBottomSheet
  └── handle-container (onMouseDown, onTouchStart, onClick)
       └── handle (visual element)
  └── content
       └── StationDetail/PoiDetail
            └── ImageSlideshow
                 ├── img (onClick)
                 ├── prev button (onClick)
                 ├── next button (onClick)
                 └── dot buttons (onClick)
```

Without `stopPropagation()`:
```
Click on handle → onClick fires
  ↓ (bubbles down)
ImageSlideshow button → onClick fires ❌ UNWANTED
```

With `stopPropagation()`:
```
Click on handle → onClick fires → stopPropagation()
  ↓ (blocked)
ImageSlideshow → ✅ NO EVENT RECEIVED
```

### Why This Pattern Matters

This is a common pattern in nested interactive components:
- **POI markers on map** - clicks shouldn't trigger map events
- **Bottom sheet handle** - clicks shouldn't trigger content events
- **Modal close buttons** - clicks shouldn't trigger backdrop events
- **Dropdown items** - clicks shouldn't trigger parent menu events

Always use `e.stopPropagation()` when:
1. Parent and child both have click handlers
2. You only want the immediate target to respond
3. Nested interactive elements could interfere

## Deployment

```bash
cd frontend
npm run build
# Deploy dist/ folder or restart dev server
```

## Status
✅ **COMPLETE** - Bottom sheet now draggable with no image flashing
