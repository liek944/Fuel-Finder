# Supabase Storage Setup Guide

This guide will walk you through setting up Supabase Storage for persistent image uploads in your Fuel Finder application.

## Overview

The image upload system has been migrated from ephemeral Render filesystem storage to Supabase Storage for persistence across redeploys.

**Key Changes:**
- Images are uploaded to Supabase Storage buckets
- Public URLs are stored in PostgreSQL database
- Base64 images from frontend are converted to binary and uploaded
- Images are organized by folders (e.g., `station-3/image.jpeg`)
- Supports both stations and POIs

## Prerequisites

1. A Supabase account (https://supabase.com)
2. A Supabase project created
3. Node.js backend running

## Step 1: Create Supabase Storage Bucket

### Via Supabase Dashboard (Recommended)

1. **Go to your Supabase project dashboard**
   - Navigate to https://app.supabase.com
   - Select your project

2. **Create Storage Bucket**
   - Click on "Storage" in the left sidebar
   - Click "New bucket"
   - Enter bucket name: `station-images`
   - Set as **Public bucket** ✓ (important!)
   - Click "Create bucket"

3. **Configure Bucket Policies**
   - Click on the `station-images` bucket
   - Go to "Policies" tab
   - Add the following policies:

   **Policy 1: Public Read Access**
   ```sql
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'station-images' );
   ```

   **Policy 2: Authenticated Upload (Service Role)**
   ```sql
   CREATE POLICY "Service Role Upload"
   ON storage.objects FOR INSERT
   WITH CHECK ( bucket_id = 'station-images' );
   ```

   **Policy 3: Service Role Delete**
   ```sql
   CREATE POLICY "Service Role Delete"
   ON storage.objects FOR DELETE
   USING ( bucket_id = 'station-images' );
   ```

### Via Supabase SQL Editor (Alternative)

Run this SQL in your Supabase SQL Editor:

```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('station-images', 'station-images', true);

-- Add policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'station-images' );

CREATE POLICY "Service Role Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'station-images' );

CREATE POLICY "Service Role Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'station-images' );
```

## Step 2: Get Supabase Credentials

1. **Get Supabase URL**
   - In your project dashboard, go to "Settings" → "API"
   - Copy the "Project URL" (e.g., `https://xxxxx.supabase.co`)

2. **Get Service Role Key**
   - In the same API settings page
   - Copy the "service_role" key (NOT the anon key)
   - ⚠️ **Important:** Keep this key secret! It bypasses Row Level Security

## Step 3: Configure Environment Variables

### Local Development (.env)

Add these to your `/backend/.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_STORAGE_BUCKET=station-images
```

### Production (Render)

1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add the following environment variables:
   - `SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `your-service-role-key`
   - `SUPABASE_STORAGE_BUCKET` = `station-images`

## Step 4: Run Database Migration

The migration adds new columns to store Supabase URLs:

```bash
cd backend
psql -U postgres -d fuel_finder -f database/migrations/003_add_supabase_storage.sql
```

Or use your database tool to run the migration SQL file.

**What the migration does:**
- Adds `image_url`, `thumbnail_url` columns
- Adds `storage_path`, `thumbnail_storage_path` columns
- Updates views and helper functions
- Maintains backward compatibility with local storage

## Step 5: Test the Setup

### Test 1: Health Check

```bash
curl http://localhost:3001/api/health
```

Expected response should include:
```json
{
  "status": "ok",
  "storage": {
    "type": "supabase",
    "connected": true,
    "bucket": true,
    "message": "Connected and bucket 'station-images' exists"
  }
}
```

### Test 2: Upload an Image

```bash
curl -X POST http://localhost:3001/api/stations/1/images \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "images": [
      {
        "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
        "filename": "test-image.jpg"
      }
    ]
  }'
```

### Test 3: Verify Image in Supabase

1. Go to Storage → station-images bucket
2. You should see folders like `station-1/`, `station-2/`, etc.
3. Inside each folder, images are stored with UUID filenames

## Step 6: Verify Frontend Integration

The frontend should continue to work without changes because:
- API endpoints remain the same
- Response format includes `imageUrl` and `thumbnailUrl`
- URLs are now Supabase public URLs instead of local paths

## Folder Structure in Supabase Storage

```
station-images/
├── station-1/
│   ├── abc123-uuid.jpeg
│   └── thumb_abc123-uuid.jpeg
├── station-2/
│   ├── def456-uuid.jpeg
│   └── thumb_def456-uuid.jpeg
├── poi-1/
│   ├── ghi789-uuid.jpeg
│   └── thumb_ghi789-uuid.jpeg
└── ...
```

## Image Processing Pipeline

1. **Frontend** → Sends Base64 image to backend
2. **Backend** → Decodes Base64 to Buffer
3. **Sharp** → Processes image (resize, optimize, create thumbnail)
4. **Supabase Storage** → Uploads processed binary data
5. **PostgreSQL** → Stores public URL in database
6. **API Response** → Returns Supabase public URL
7. **Frontend** → Displays image from Supabase CDN

## Benefits of This Setup

✅ **Persistent Storage** - Images survive across redeploys  
✅ **CDN Distribution** - Supabase provides global CDN  
✅ **Scalable** - No disk space limitations  
✅ **Organized** - Images grouped by station/POI ID  
✅ **Automatic Cleanup** - Deleting images removes from storage  
✅ **Backward Compatible** - Old local images still work  

## Troubleshooting

### "Supabase client not initialized"
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Restart your backend after adding environment variables

### "Bucket not found"
- Verify bucket name is `station-images`
- Check bucket was created with public access
- Verify bucket policies are in place

### "Upload failed: 403 Forbidden"
- Check you're using the **service_role** key, not the anon key
- Verify upload policy is correctly set

### "Images not displaying"
- Check if bucket is set to public
- Verify the public URL is correct in database
- Test URL directly in browser

### Backend logs show warnings
- If you see "Supabase credentials not configured", check .env file
- If you see storage warnings, run the migration SQL

## Migration from Local Storage

If you have existing images in local storage, you can:

1. Keep them as-is (backward compatible)
2. Manually migrate them to Supabase
3. Re-upload images from frontend

The code handles both scenarios gracefully.

## Security Notes

🔐 **Important Security Considerations:**

1. **Never commit** `.env` file to Git
2. **Use service_role key only** on backend (never expose to frontend)
3. **Keep bucket public** for read access, but uploads are protected
4. **API key protection** - Set `ADMIN_API_KEY` in production
5. **Rate limiting** - Already implemented in the API

## Cost Considerations

Supabase Free Tier includes:
- 1 GB storage
- 2 GB bandwidth per month
- Unlimited API requests

For production with high traffic, consider upgrading to Pro plan.

## Support

If you encounter issues:
1. Check Supabase dashboard for storage metrics
2. Review backend logs for error messages
3. Test with `/api/health` endpoint
4. Verify environment variables are set correctly

---

**Next Steps:**
- Set up production environment variables on Render
- Create the Supabase bucket
- Run the database migration
- Test image uploads
- Deploy to production

Happy uploading! 🚀
