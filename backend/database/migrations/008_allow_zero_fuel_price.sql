-- Migration: Allow zero (0) fuel prices to represent 'Unknown'
-- This relaxes the existing CHECK constraint on fuel_prices.price

ALTER TABLE fuel_prices
  DROP CONSTRAINT IF EXISTS fuel_prices_price_check;

ALTER TABLE fuel_prices
  ADD CONSTRAINT fuel_prices_price_check
  CHECK (price >= 0);
