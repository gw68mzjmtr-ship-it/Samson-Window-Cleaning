CREATE TABLE IF NOT EXISTS samson_confirmation_email (
 booking_id text PRIMARY KEY REFERENCES samson_bookings(id),
 invoice_id text NOT NULL,
 recipient text NOT NULL,
 phase text NOT NULL CHECK (phase IN ('pending','sent','review_required')),
 claimed_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
