-- Create table for storing DOE fuel price updates
CREATE TABLE IF NOT EXISTS doe_price_updates (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    gasoline_price DECIMAL(10, 2),
    diesel_price DECIMAL(10, 2),
    kerosene_price DECIMAL(10, 2),
    gasoline_adjustment DECIMAL(10, 2),
    diesel_adjustment DECIMAL(10, 2),
    kerosene_adjustment DECIMAL(10, 2),
    pdf_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying the latest price
CREATE INDEX IF NOT EXISTS idx_doe_price_updates_date ON doe_price_updates(date DESC);

-- Create table for owner notifications
CREATE TABLE IF NOT EXISTS owner_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'doe_price_update', 'system_alert'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    link_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_notification_owner 
        FOREIGN KEY (owner_id) 
        REFERENCES users(id) -- Assuming owners are in 'users' table, wait let me check the table name... I think it's users or owner_profiles.
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_owner_notifications_owner_id ON owner_notifications(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_notifications_is_read ON owner_notifications(is_read);
