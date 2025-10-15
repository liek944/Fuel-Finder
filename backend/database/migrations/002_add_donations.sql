-- Migration: Add Donations System
-- Version: 002
-- Created: 2025-10-15
-- Purpose: Enable fuel donation feature for community programs

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 10 AND amount <= 10000),
    currency VARCHAR(3) DEFAULT 'PHP' NOT NULL,
    donor_name VARCHAR(255) DEFAULT 'Anonymous',
    donor_email VARCHAR(255),
    donor_identifier VARCHAR(255), -- IP or fingerprint for abuse prevention
    payment_intent_id VARCHAR(255) UNIQUE, -- PayMongo payment intent ID
    payment_method VARCHAR(50), -- gcash, paymaya, card, online_banking
    status VARCHAR(50) DEFAULT 'pending', -- pending, succeeded, failed, refunded
    cause VARCHAR(100) DEFAULT 'general', -- ambulance, public_transport, emergency, general
    impact_description TEXT, -- Description of how donation will be used
    receipt_url TEXT,
    notes TEXT, -- Optional message from donor
    metadata JSONB, -- Additional data from payment provider
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    refunded_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_cause ON donations(cause);
CREATE INDEX IF NOT EXISTS idx_donations_payment_intent ON donations(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_identifier);

-- Create donation statistics view for quick queries
CREATE OR REPLACE VIEW donation_statistics AS
SELECT 
    COUNT(*) as total_donations,
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as donations_this_month,
    COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN amount END), 0) as amount_this_month,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as donations_this_week,
    COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN amount END), 0) as amount_this_week,
    AVG(amount) as average_donation,
    COUNT(DISTINCT donor_identifier) as unique_donors
FROM donations
WHERE status = 'succeeded';

-- Create donation impact tracking table
CREATE TABLE IF NOT EXISTS donation_impacts (
    id SERIAL PRIMARY KEY,
    cause VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    impact_metrics JSONB, -- {"liters_funded": 100, "trips_enabled": 50}
    beneficiary_name VARCHAR(255), -- LGU, Hospital, etc.
    beneficiary_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default causes
INSERT INTO donation_impacts (cause, beneficiary_name, impact_metrics) VALUES
    ('ambulance', 'Oriental Mindoro Provincial Hospital', '{"liters_funded": 0, "trips_enabled": 0}'::jsonb),
    ('public_transport', 'Local Transport Cooperatives', '{"liters_funded": 0, "buses_supported": 0}'::jsonb),
    ('emergency', 'Emergency Response Teams', '{"liters_funded": 0, "responses_enabled": 0}'::jsonb),
    ('general', 'Community Fund', '{"liters_funded": 0}'::jsonb)
ON CONFLICT DO NOTHING;

-- Create function to update impact metrics when donation is successful
CREATE OR REPLACE FUNCTION update_donation_impact()
RETURNS TRIGGER AS $$
DECLARE
    liters_funded DECIMAL(10, 2);
    fuel_price_avg DECIMAL(10, 2) := 58.50; -- Average fuel price in Oriental Mindoro
BEGIN
    IF NEW.status = 'succeeded' AND (OLD.status IS NULL OR OLD.status != 'succeeded') THEN
        -- Calculate liters funded
        liters_funded := NEW.amount / fuel_price_avg;
        
        -- Update impact metrics
        UPDATE donation_impacts
        SET 
            total_amount = total_amount + NEW.amount,
            impact_metrics = jsonb_set(
                impact_metrics,
                '{liters_funded}',
                to_jsonb(COALESCE((impact_metrics->>'liters_funded')::numeric, 0) + liters_funded)
            ),
            last_updated = CURRENT_TIMESTAMP
        WHERE cause = NEW.cause;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update impact metrics
DROP TRIGGER IF EXISTS trigger_update_donation_impact ON donations;
CREATE TRIGGER trigger_update_donation_impact
    AFTER INSERT OR UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_donation_impact();

-- Create function to get donation leaderboard (top donors, anonymous)
CREATE OR REPLACE FUNCTION get_donation_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    donor_name VARCHAR,
    total_donated DECIMAL,
    donation_count BIGINT,
    latest_donation TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(d.donor_name, 'Anonymous') as donor_name,
        SUM(d.amount) as total_donated,
        COUNT(*) as donation_count,
        MAX(d.created_at) as latest_donation
    FROM donations d
    WHERE d.status = 'succeeded'
    GROUP BY d.donor_name
    ORDER BY total_donated DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE donations IS 'Stores fuel donation transactions for community programs';
COMMENT ON TABLE donation_impacts IS 'Tracks real-world impact of donations by cause';
COMMENT ON VIEW donation_statistics IS 'Aggregated donation statistics for dashboard display';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 002 completed: Donations system tables created successfully';
END $$;
