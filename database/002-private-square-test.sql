-- Isolated hosted trial only. No production charges or existing local records.
CREATE TABLE IF NOT EXISTS samson_test_payment_state (
 booking_id text PRIMARY KEY REFERENCES samson_bookings(id),
 record jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
