-- ============================================================================
-- CLEANUP DUPLICATE IMAGES
-- Run this in your PostgreSQL database to remove duplicate images
-- ============================================================================

-- Step 1: View duplicates before deleting
SELECT 
  station_id,
  original_filename,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at ASC) as image_ids,
  array_agg(created_at ORDER BY created_at ASC) as created_dates
FROM images
WHERE station_id IS NOT NULL
GROUP BY station_id, original_filename
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Delete duplicates (keeps the OLDEST image, deletes newer ones)
-- UNCOMMENT THE LINES BELOW AFTER REVIEWING STEP 1 RESULTS

-- WITH duplicates AS (
--   SELECT 
--     id,
--     ROW_NUMBER() OVER (
--       PARTITION BY station_id, original_filename 
--       ORDER BY created_at ASC  -- Keep the first (oldest) upload
--     ) as row_num
--   FROM images
--   WHERE station_id IS NOT NULL
-- )
-- DELETE FROM images
-- WHERE id IN (
--   SELECT id FROM duplicates WHERE row_num > 1
-- )
-- RETURNING id, station_id, original_filename, created_at;

-- Step 3: Verify cleanup
-- Run this after deletion to confirm no duplicates remain
-- SELECT 
--   station_id,
--   original_filename,
--   COUNT(*) as count
-- FROM images
-- WHERE station_id IS NOT NULL
-- GROUP BY station_id, original_filename
-- HAVING COUNT(*) > 1;
-- -- Should return 0 rows if cleanup was successful
