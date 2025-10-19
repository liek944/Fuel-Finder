-- Migration: Allow custom fuel types in fuel_prices table
-- This removes the restrictive CHECK constraint and allows any fuel type name

-- Drop the existing CHECK constraint
ALTER TABLE fuel_prices DROP CONSTRAINT IF EXISTS fuel_prices_fuel_type_check;

-- Add a new constraint that only ensures fuel_type is not empty and reasonable length
ALTER TABLE fuel_prices ADD CONSTRAINT fuel_prices_fuel_type_check
CHECK (fuel_type IS NOT NULL AND fuel_type != '' AND LENGTH(TRIM(fuel_type)) >= 1 AND LENGTH(TRIM(fuel_type)) <= 50);

-- Update the table comment to reflect the change
COMMENT ON TABLE fuel_prices IS 'Stores fuel type prices per station - now supports custom fuel type names';
COMMENT ON COLUMN fuel_prices.fuel_type IS 'Type of fuel (custom names allowed, 1-50 characters, no leading/trailing spaces)';
