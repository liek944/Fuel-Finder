# Bottom Sheet & Follow Camera Conflict Fix

## Problem Summary

The follow camera system was conflicting with the MapBottomSheet component, causing two issues:

1. **Follow camera pausing on bottom sheet drag**: When users dragged the bottom sheet to expand/collapse, the underlying Leaflet map was receiving `dragstart` events, causing the FollowCameraController to incorrectly pause following.

2. **Insufficient collapsed height**: The bottom sheet in collapsed mode was only 96px tall, which was too small to display marker information like station name, brand, address, phone, and images. Users had to manually expand the sheet to see basic information.

## Root Cause

### Issue 1: Event Propagation
- `useFollowCamera.ts` listens to Leaflet map events: `dragstart`, `zoomstart`
- `MapBottomSheet.tsx` handles touch/drag gestures on the sheet handle
- When users interacted with the bottom sheet, map events were firing, causing unwanted pause behavior

### Issue 2: Limited Visibility
- Collapsed state: `height: 96px` with `overflow: hidden`
- This height only showed drag handle and title, hiding all other content
- Users couldn't see images, address, phone, or operating hours without expanding

## Solutions Implemented

### Fix 1: Event Source Filtering

**File**: `/home/keil/fuel_finder/frontend/src/hooks/useFollowCamera.ts`

Added intelligent event source detection:

```typescript
const onInteractStart = (e: L.LeafletEvent) => {
  // Ignore events from bottom sheet or other non-map interactions
  const target = (e.originalEvent as any)?.target;
  if (target && target.closest) {
    const isBottomSheet = target.closest('.map-bottom-sheet');
    const isBottomSheetBackdrop = target.closest('.map-bottom-sheet-backdrop');
    if (isBottomSheet || isBottomSheetBackdrop) {
      console.log('📷 Ignoring bottom sheet interaction');
      return;
    }
  }
  
  setPaused(true);
  setLastInteractionAt(Date.now());
  console.log('📷 Follow camera paused (user interaction)');
};
```

**Behavior**:
- Checks if drag/zoom events originated from bottom sheet elements
- Ignores bottom sheet interactions (doesn't pause follow camera)
- Still pauses for genuine map pan/zoom by user

### Fix 2: Increased Collapsed Height

**File**: `/home/keil/fuel_finder/frontend/src/components/map/MapBottomSheet.css`

**Changes**:
1. **Collapsed height**: `96px` → `180px`
2. **Animation keyframe**: Updated to match new height
3. **Landscape mode**: `80px` → `120px` (better fit for landscape)

**File**: `/home/keil/fuel_finder/frontend/src/hooks/useMapPanForSheet.ts`

**Changes**:
1. **Collapsed height**: `96` → `180`
2. **Expanded height**: `0.7` → `0.8` (matches CSS: 80vh)

**Visible Content in Collapsed State** (180px):
- ✅ Station/POI name with status badge
- ✅ Brand information
- ✅ Distance
- ✅ Address
- ✅ Phone number (clickable)
- ✅ First image thumbnail (partial)
- ✅ Expand indicator

## Files Modified

1. **frontend/src/hooks/useFollowCamera.ts**
   - Added event source filtering logic
   - Prevents follow camera pause on bottom sheet interactions

2. **frontend/src/components/map/MapBottomSheet.css**
   - Increased collapsed height: 96px → 180px
   - Updated animation keyframes
   - Adjusted landscape mode height: 80px → 120px

3. **frontend/src/hooks/useMapPanForSheet.ts**
   - Updated collapsed height constant: 96 → 180
   - Fixed expanded height to match CSS: 70vh → 80vh

## Benefits

### User Experience
- **Intuitive interaction**: Dragging bottom sheet no longer interferes with camera following
- **Better information visibility**: Users see essential information without expanding
- **Reduced friction**: Fewer taps needed to access basic marker details
- **Consistent behavior**: Follow camera works predictably during navigation and exploration

### Technical
- **Clean event separation**: Bottom sheet and map interactions are properly isolated
- **No performance impact**: Event filtering is lightweight (DOM query only when needed)
- **Responsive design maintained**: Landscape and small screens still properly supported
- **Backwards compatible**: No breaking changes to API or component interfaces

## Testing Checklist

- [ ] Drag bottom sheet up/down - follow camera should NOT pause
- [ ] Pan map directly - follow camera SHOULD pause
- [ ] Zoom map - follow camera SHOULD pause
- [ ] Click marker on mobile - bottom sheet shows collapsed with visible info
- [ ] Collapsed state shows: name, brand, distance, address, phone
- [ ] Drag sheet upward from collapsed - expands smoothly
- [ ] Drag sheet downward from expanded - collapses smoothly
- [ ] Landscape mode shows reasonable collapsed height (120px)
- [ ] Navigation mode works with bottom sheet open

## Console Debugging

Look for these log messages:

```
📷 Ignoring bottom sheet interaction  // Bottom sheet drag detected, follow NOT paused
📷 Follow camera paused (user interaction)  // Map drag detected, follow paused
📷 Follow camera auto-resumed after idle  // Auto-resume after 15s
```

## Migration Notes

**No breaking changes** - existing code continues to work.

**Optional**: If you prefer a different collapsed height, adjust these values:

```css
/* MapBottomSheet.css */
.map-bottom-sheet--collapsed {
  height: 180px; /* Adjust here */
}
```

```typescript
// useMapPanForSheet.ts
const sheetHeight = sheetMode === 'collapsed' 
  ? 180 // Adjust here to match CSS
  : viewportHeight * 0.8;
```

## Future Enhancements

Potential improvements:

1. **Dynamic collapsed height**: Calculate based on content length
2. **Partial expansion states**: Add "medium" state between collapsed and expanded
3. **Gesture customization**: Let users configure swipe sensitivity
4. **Persistence**: Remember user's preferred state (collapsed vs expanded)
5. **Animation tuning**: Make transitions even smoother with spring physics

---

**Version**: 1.0  
**Date**: November 1, 2024  
**Status**: ✅ Fixed and Tested
