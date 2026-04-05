-- Index for fast expiration queries
CREATE INDEX IF NOT EXISTS idx_ride_requests_timeout ON ride_requests(timeout_at) WHERE status = 'pending';

-- Index for group lookups (multi-driver)
CREATE INDEX IF NOT EXISTS idx_ride_requests_group ON ride_requests(request_group_id) WHERE request_group_id IS NOT NULL;

-- Composite index for nearby driver search (online + available)
CREATE INDEX IF NOT EXISTS idx_drivers_available_location ON drivers(is_available_now, current_latitude, current_longitude) WHERE is_available_now = true;