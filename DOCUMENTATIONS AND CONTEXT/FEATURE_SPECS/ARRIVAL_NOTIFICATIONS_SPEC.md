# Arrival Notifications System - Quick Spec

## Summary
Voice announcements and browser notifications when user approaches/arrives at selected destination.

## User Experience

### When User Selects Destination
1. Click marker → "Get Route"
2. Route appears on map
3. Tracking begins automatically
4. Browser may request notification permission (first time only)

### Progressive Alerts (Getting Closer)
- **500m away**: 🎯 "Shell Station is 500 meters ahead"
- **200m away**: 🚗 "Approaching Shell Station, 200 meters ahead"
- **100m away**: 📍 "Shell Station is 100 meters ahead"
- **20m away**: 🎉 "You have arrived at Shell Station"

### Controls (Right Panel)
- **🔊 Voice Button** (Orange): Toggle voice announcements
- **🔔 Bell Button** (Purple): Toggle visual notifications

## Technical Specs

### Distance Thresholds
```
500m → "Destination nearby" notification
200m → "Approaching destination" notification
100m → "Almost there!" notification
20m → "You have arrived!" notification
```

### Smart Behavior
- Only fires when **moving closer** (not when moving away)
- One alert per threshold (no duplicates)
- Auto-resets for new destination
- Auto-clears when route cancelled

### APIs Used
1. **Notifications API** - Browser notifications
2. **SpeechSynthesis API** - Voice announcements
3. **Geolocation API** - Already integrated
4. **Haversine Formula** - Distance calculation

## Implementation

### New File
- `frontend/src/utils/arrivalNotifications.ts` (300 lines)

### Modified File
- `frontend/src/components/MainApp.tsx` (+50 lines)

### Integration Points
```typescript
// On location update
arrivalNotifications.updatePosition(lat, lng);

// On route start
arrivalNotifications.setDestination(location);

// On route clear
arrivalNotifications.clearDestination();
```

## Settings Persistence
- Voice: Enabled by default
- Notifications: Enabled by default
- Permission: Persists in browser

## Browser Support
- ✅ Chrome/Edge (full support)
- ✅ Firefox (notifications only, voice requires flag)
- ✅ Safari (full support)
- ✅ Opera (full support)

## Privacy
- ✅ No server communication
- ✅ No data collection
- ✅ Local processing only
- ✅ Optional feature (can be disabled)

## Testing Checklist
- [ ] Click 🔊 → Hear "Voice announcements enabled"
- [ ] Click 🔔 → See test notification
- [ ] Set route → Get progressive notifications
- [ ] Clear route → Notifications stop
- [ ] Toggle off → No more alerts

## Deployment
- **Backend**: No changes needed
- **Frontend**: Standard rebuild and deploy
- **Testing**: Works on localhost and production

---

**Comparable To**: Google Maps arrival alerts, Waze notifications
**Development Time**: ~2 hours
**Lines of Code**: ~350 lines total
