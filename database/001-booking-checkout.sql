-- Apply only to the dedicated Samson booking database. Does not modify Zoho.
CREATE TABLE IF NOT EXISTS samson_bookings (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{48}$'),
 request_key text NOT NULL UNIQUE,
 fingerprint text NOT NULL UNIQUE,
 record jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (record->>'id' = id)
);
CREATE TABLE IF NOT EXISTS samson_slot_claims (
 service_date date NOT NULL,
 period text NOT NULL CHECK (period IN ('morning','afternoon')),
 booking_id text NOT NULL REFERENCES samson_bookings(id),
 PRIMARY KEY (service_date, period)
);
CREATE INDEX IF NOT EXISTS samson_slot_claims_booking ON samson_slot_claims(booking_id);
CREATE TABLE IF NOT EXISTS samson_square_events (
 event_id text PRIMARY KEY,
 payment_id text NOT NULL,
 merchant_id text NOT NULL,
 event_type text NOT NULL CHECK (event_type IN ('payment.created','payment.updated')),
 received_at timestamptz NOT NULL DEFAULT now(),
 phase text NOT NULL DEFAULT 'queued' CHECK (phase IN ('queued','verified','review_required'))
);
-- No raw card data or Square tokens belong in any of these tables.
