# Marker Edit Functionality Documentation

## Overview
Complete implementation of edit functionality for Fuel Station and POI markers in the Fuel Finder admin portal. Users can now edit marker details dynamically without needing to delete and recreate them.

## Implementation Date
October 15, 2025

## Features Implemented

### 1. **Station Edit Functionality**
Administrators can now edit the following fields for fuel stations:
- **Name** - Station name
- **Brand** - Station brand (Shell, Petron, etc.)
- **Address** - Physical address
- **Phone** - Contact phone number
- **Operating Hours** - Opening and closing times (HH:MM format)
- **Services** - Available services (preserved from original)

### 2. **POI Edit Functionality**
Administrators can now edit the following fields for Points of Interest:
- **Name** - POI name
- **Type** - POI category (convenience, repair, car_wash, motor_shop)
- **Address** - Physical address
- **Phone** - Contact phone number
- **Operating Hours** - Opening and closing times (HH:MM format)

## Technical Implementation

### Database Changes

#### Migration: `004_add_poi_contact_fields.sql`
```sql
-- Added contact and hours fields to POIs table
ALTER TABLE pois ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE pois ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE pois ADD COLUMN IF NOT EXISTS operating_hours JSONB;
```

#### Updated Functions in `db.js`
1. **`updatePoi(poiId, poiData)`** - New function to update POI records
2. **`getAllPois()`** - Updated to include address, phone, operating_hours
3. **`getNearbyPois()`** - Updated to include new fields
4. **`addPoi()`** - Updated to accept new fields during creation

### Backend API Changes

#### New Endpoints in `server.js`
1. **`PUT /api/stations/:id`** - Update station details
   - Requires admin API key
   - Accepts partial updates (only sends changed fields)
   - Clears cache after update

2. **`PUT /api/pois/:id`** - Update POI details
   - Requires admin API key
   - Accepts partial updates
   - Clears cache after update

#### Request/Response Format
```javascript
// PUT /api/stations/:id or /api/pois/:id
{
  "name": "Updated Name",
  "address": "New Address",
  "phone": "+63 912 345 6789",
  "operating_hours": {
    "open": "08:00",
    "close": "20:00"
  }
  // ... other fields
}

// Response
{
  "success": true,
  "station": { /* updated station data */ }
}
```

### Frontend Changes

#### API Utility (`api.ts`)
- **`apiPut(path, data, apiKey)`** - New helper function for PUT requests
- Includes request deduplication to prevent duplicate submissions

#### Admin Portal (`AdminPortal.tsx`)

##### New State Variables
```typescript
const [editingStationId, setEditingStationId] = useState<number | null>(null);
const [editingPoiId, setEditingPoiId] = useState<number | null>(null);
const [editFormData, setEditFormData] = useState<any>({});
const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
```

##### New Functions
1. **`startEditStation(station)`** - Enters edit mode for a station
2. **`startEditPoi(poi)`** - Enters edit mode for a POI
3. **`cancelEdit()`** - Exits edit mode
4. **`submitEditStation(stationId)`** - Saves station changes
5. **`submitEditPoi(poiId)`** - Saves POI changes

##### UI Changes
- **Edit Button** - New blue "✏️ Edit" button before Delete button
- **Edit Form** - Inline form replaces marker info when editing
  - Text inputs for name, address, phone
  - Time pickers for operating hours
  - Brand selector for stations
  - Type selector for POIs
- **Save/Cancel Buttons** - Form actions at bottom
- **Visual Feedback** - Loading state during save ("⏳ Saving...")

## User Workflow

### Editing a Station or POI
1. Open Admin Portal (`/admin`)
2. Validate with admin API key
3. Click on any station or POI marker
4. Click the **"✏️ Edit"** button
5. Modify desired fields in the inline form
6. Click **"💾 Save"** to apply changes or **"✖️ Cancel"** to discard
7. Success message displayed and map refreshed with updated data

## Data Flow

```
User clicks Edit
    ↓
startEditStation/startEditPoi() loads current values into editFormData
    ↓
User modifies form fields (updates editFormData state)
    ↓
User clicks Save
    ↓
submitEditStation/submitEditPoi() sends PUT request with editFormData
    ↓
Backend updateStation/updatePoi() updates database
    ↓
Response returns updated record
    ↓
Frontend displays success message
    ↓
fetchData() refreshes all markers
    ↓
Edit mode cleared, popup shows updated info
```

## Benefits

### For Administrators
- **Quick Updates** - Edit details in seconds without navigation
- **No Data Loss** - Images, reviews, and other data preserved
- **Error Prevention** - No need to remember exact coordinates
- **Time Saving** - No delete/recreate workflow needed

### For the System
- **Data Integrity** - Preserves foreign key relationships
- **Audit Trail** - `updated_at` timestamp tracks changes
- **Cache Management** - Automatic cache clearing ensures fresh data
- **API Consistency** - RESTful PUT endpoints follow best practices

## Security

- All edit endpoints require **admin API key** authentication
- Request deduplication prevents accidental double submissions
- Input validation on both frontend and backend
- COALESCE in SQL ensures NULL fields aren't overwritten unintentionally

## Future Enhancements

1. **Edit History** - Track who made changes and when
2. **Bulk Edit** - Edit multiple markers simultaneously
3. **Field Validation** - Phone number format, required fields
4. **Coordinate Editing** - Drag marker to new location
5. **Service Toggle** - Edit available services for stations
6. **Price Editing** - Quick edit for fuel prices inline

## Testing Recommendations

### Manual Testing
1. Edit station with all fields filled
2. Edit station with partial fields (some empty)
3. Edit POI type and verify icon updates
4. Test operating hours edge cases (00:00, 23:59)
5. Verify phone number formats (with/without country code)
6. Test edit cancellation (no changes saved)
7. Test concurrent edits (open two markers)

### Database Testing
```sql
-- Verify POI fields were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pois';

-- Check for NULL values in new fields
SELECT COUNT(*) FROM pois WHERE address IS NULL;

-- Verify operating_hours JSON format
SELECT id, name, operating_hours 
FROM pois 
WHERE operating_hours IS NOT NULL;
```

## Files Modified

### Backend
1. `/backend/database/migrations/004_add_poi_contact_fields.sql` - **NEW**
2. `/backend/database/db.js` - Updated POI functions
3. `/backend/server.js` - Added PUT endpoints

### Frontend
1. `/frontend/src/utils/api.ts` - Added apiPut function
2. `/frontend/src/components/AdminPortal.tsx` - Complete edit UI

## Migration Steps

To apply this feature to your deployment:

1. **Run the migration**:
   ```bash
   cd backend/database/migrations
   node ../apply_migration.js 004_add_poi_contact_fields.sql
   ```

2. **Restart backend server** to load new endpoints

3. **Rebuild frontend** if using production build
   ```bash
   cd frontend
   npm run build
   ```

4. **Test in admin portal** with a non-critical marker

## Notes

- Operating hours are stored as JSONB: `{"open": "HH:MM", "close": "HH:MM"}`
- Stations already had address/phone/operating_hours fields
- POIs now have parity with stations for contact information
- Services field is not editable via this interface (requires custom logic)
- Coordinates cannot be edited (by design, to prevent accidental moves)

## Support

For issues or questions:
- Check browser console for error messages
- Verify API key is valid and has admin permissions
- Ensure migration was applied successfully
- Review backend logs for detailed error information
