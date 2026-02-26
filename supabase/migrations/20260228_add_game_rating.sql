-- Add game_rating column to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS game_rating SMALLINT;
