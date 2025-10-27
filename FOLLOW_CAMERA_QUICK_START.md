# Follow Camera System - Quick Start Guide

## What's New? 🎉

Your Fuel Finder app now has an intelligent follow camera that works invisibly in the background, keeping you in view while exploring and navigating!

## How It Works (Invisible, Automatic)

### 📍 **Soft Follow** (Default Mode - Always Active)
- Keeps you on-screen without constant recentering
- Perfect for exploring and browsing stations
- Moves camera only when you approach screen edge
- **No button needed** - works automatically

### 🧭 **Hard Follow** (Auto during Navigation)
- Automatically activates when you start navigation
- Keeps you centered with forward view ahead
- Perfect for turn-by-turn directions
- **Auto-switches** - no user intervention needed

### ⏸️ **Auto-Pause** (Respects Your Gestures)
- Automatically pauses when you drag or zoom
- Auto-resumes after 15 seconds of inactivity
- **Smart detection** - never fights your interactions

## Quick Test

### Test 1: Soft Follow (Automatic)
1. Open the app - follow camera starts automatically
2. Wait for GPS lock
3. Walk around - camera smoothly keeps you in view
4. Drag the map - following pauses automatically
5. Wait 15 seconds - resumes automatically

### Test 2: Hard Follow (Navigation)
1. Search for a nearby station
2. Click "Route to this location"
3. Camera switches to hard follow (centered with forward view)
4. Notice forward offset - more map visible ahead
5. Clear route - returns to soft follow automatically

### Test 3: Center Button
1. Blue button (📍) on right side of map
2. Click to instantly recenter on your location
3. Follow camera continues working in background
4. Simple, familiar control for users

## UI Elements

| Element | What It Does |
|---------|--------------|
| 📍 Blue Button | One-click recenter to your location |
| Follow Camera | Works invisibly - no UI needed |
| Auto-Pause | Pauses when you drag/zoom |
| Auto-Resume | Resumes after 15s idle |

## Testing Checklist ✅

- [ ] Blue center button (📍) appears on right side of map
- [ ] Walking moves your marker, camera keeps you visible
- [ ] Dragging map pauses follow automatically
- [ ] Follow resumes after 15s of idle
- [ ] Starting navigation switches to centered view
- [ ] Clearing route returns to soft follow
- [ ] Center button instantly recenters map

## Troubleshooting

### "Camera not following"
- Following runs automatically in background
- Ensure GPS permission is granted
- Check GPS accuracy (< 50m works best)
- Try refreshing the page

### "Camera following too much"
- Drag or zoom to pause
- Will auto-resume after 15s
- This is normal behavior

### "Following too tight/loose"
See `FOLLOW_CAMERA_SYSTEM.md` for tuning parameters.

## Performance Notes

- ✅ Minimal battery impact
- ✅ Throttled updates (600ms)
- ✅ Filters GPS jitter automatically
- ✅ Pauses on low accuracy (> 50m)

## What Changed?

### Files Modified
- `frontend/src/components/MainApp.tsx` - Integrated follow system
- `frontend/src/styles/MainApp.css` - Added button styles

### Files Created
- `frontend/src/hooks/useFollowCamera.ts` - Core logic
- `frontend/src/components/FollowCameraController.tsx` - Map integration

## Deploy to Production

```bash
# Frontend
cd frontend
npm run build
# Deploy build/ folder to Netlify or your hosting

# No backend changes needed!
```

## User Guide (For End Users)

### The Center Button (📍)
Located on the right side of the map, this blue button instantly centers the map on your location.

**How to use:**
- Click the button to recenter the map
- Map follows you automatically in the background
- Drag or zoom to pause automatic following
- Following resumes after 15 seconds

**During Navigation:**
- Map automatically centers with forward view
- Shows more road ahead of your position
- Still respects your drag/zoom gestures

## Advanced Configuration

For developers who want to tune the behavior:

Edit `FollowCameraController.tsx` props:
```tsx
resumeOnIdleMs={15000}  // Auto-resume delay (ms)
marginPx={80}           // Soft follow padding
deadZonePx={140}        // Hard follow tolerance
minMoveMeters={8}       // Jitter threshold
throttleMs={600}        // Update rate limit
navYOffsetPx={120}      // Forward view during nav
```

See full documentation: `FOLLOW_CAMERA_SYSTEM.md`

---

**Status**: ✅ Ready for Testing  
**Date**: October 27, 2024  
**Version**: 1.0
