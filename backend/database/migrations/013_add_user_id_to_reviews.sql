-- Add user_id to reviews table
ALTER TABLE reviews ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster querying by user
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
