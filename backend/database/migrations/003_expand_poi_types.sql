-- Migration to expand POI types to include car_wash and motor_shop
-- This allows the AdminPortal to create more diverse POI types

-- Drop the existing constraint on POI type
ALTER TABLE pois DROP CONSTRAINT IF EXISTS pois_type_check;

-- Add new constraint with expanded types
ALTER TABLE pois 
ADD CONSTRAINT pois_type_check 
CHECK (type IN ('gas', 'convenience', 'repair', 'car_wash', 'motor_shop'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pois_type ON pois(type);

-- Add comment for documentation
COMMENT ON COLUMN pois.type IS 'POI type: gas (gas station), convenience (store), repair (repair shop), car_wash (car wash service), motor_shop (motorcycle shop)';
