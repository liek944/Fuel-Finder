# Image Storage Migration Checklist

Quick checklist for migrating from Render filesystem to Supabase Storage.

## ✅ Pre-Migration (Completed)

- [x] Install `@supabase/supabase-js` package
- [x] Create `supabaseStorage.js` service module
- [x] Update `imageService.js` to use Supabase
- [x] Add Supabase health check to `/api/health`
- [x] Create database migration `003_add_supabase_storage.sql`
- [x] Update `.env.example` with Supabase config

## 🔲 Supabase Setup (Action Required)

- [ ] Create Supabase account/project
- [ ] Create `station-images` bucket (public)
- [ ] Configure bucket policies (SELECT, INSERT, DELETE)
- [ ] Get Supabase URL from project settings
- [ ] Get Service Role Key from project settings

## 🔲 Environment Configuration (Action Required)

### Local Development
- [ ] Add to `backend/.env`:
  ```bash
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  SUPABASE_STORAGE_BUCKET=station-images
  ```

### Production (Render)
- [ ] Add `SUPABASE_URL` environment variable
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` environment variable
- [ ] Add `SUPABASE_STORAGE_BUCKET=station-images` environment variable

## 🔲 Database Migration (Action Required)

Run the migration to add Supabase URL columns:

```bash
cd backend
psql -U postgres -d fuel_finder -f database/migrations/003_add_supabase_storage.sql
```

Or connect to your Supabase/production database and run the SQL manually.

## 🔲 Testing (Action Required)

1. **Test Health Check:**
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should show `storage.connected: true`

2. **Test Image Upload:**
   ```bash
   curl -X POST http://localhost:3001/api/stations/1/images \
     -H "Content-Type: application/json" \
     -H "x-api-key: YOUR_API_KEY" \
     -d '{"images":[{"base64":"data:image/jpeg;base64,...","filename":"test.jpg"}]}'
   ```

3. **Verify in Supabase:**
   - Check Storage → station-images bucket
   - Should see `station-1/` folder with images

4. **Test Image Retrieval:**
   ```bash
   curl http://localhost:3001/api/stations/1/images
   ```
   Should return images with Supabase URLs

## 🔲 Frontend Testing (Action Required)

- [ ] Upload image from frontend
- [ ] Verify image displays correctly
- [ ] Check browser console for errors
- [ ] Test delete image functionality
- [ ] Test set primary image

## 🔲 Production Deployment (Action Required)

1. **Deploy to Render:**
   - [ ] Push code to Git
   - [ ] Trigger Render deployment
   - [ ] Wait for deployment to complete

2. **Run Production Migration:**
   - [ ] Connect to production database
   - [ ] Run `003_add_supabase_storage.sql`

3. **Verify Production:**
   - [ ] Check `/api/health` on production URL
   - [ ] Test image upload in production
   - [ ] Verify images persist after redeploy

## 📝 Post-Migration Validation

- [ ] Images persist after Render redeploy ✓
- [ ] Images load from Supabase CDN ✓
- [ ] Upload size limit (10MB) works ✓
- [ ] Thumbnails are generated ✓
- [ ] Delete functionality removes from Supabase ✓
- [ ] Images organized in folders by station ID ✓
- [ ] Public URLs are accessible ✓
- [ ] Backend logs show Supabase uploads ✓

## 🔍 What Changed

### Backend Files Modified:
- `package.json` - Added `@supabase/supabase-js`
- `services/supabaseStorage.js` - New Supabase storage service
- `services/imageService.js` - Updated to use Supabase
- `server.js` - Added Supabase health check
- `.env.example` - Added Supabase config
- `database/migrations/003_add_supabase_storage.sql` - New migration

### Database Changes:
- Added `image_url` column to `images` table
- Added `thumbnail_url` column to `images` table
- Added `storage_path` column to `images` table
- Added `thumbnail_storage_path` column to `images` table
- Updated views and functions

### No Frontend Changes Required:
- API endpoints unchanged
- Response format includes URLs (now Supabase)
- Base64 upload still works the same way

## 🚨 Rollback Plan (If Needed)

If something goes wrong:

1. **Database:** Old columns still work (backward compatible)
2. **Code:** Can revert Git commit
3. **Images:** New images in Supabase won't be lost
4. **Supabase:** Can keep bucket for future retry

## 📞 Troubleshooting

If you encounter issues, check:
1. `SUPABASE_STORAGE_SETUP.md` for detailed guide
2. Backend logs for error messages
3. `/api/health` endpoint for connection status
4. Supabase dashboard for bucket/policy issues

## ✨ Benefits After Migration

- ✅ Images survive across redeploys
- ✅ Global CDN for faster loading
- ✅ No disk space concerns
- ✅ Better organized storage structure
- ✅ Easier to backup/restore
- ✅ Scalable for growth

---

**Ready to start?** Follow the checklist from top to bottom!
