CREATE TABLE IF NOT EXISTS samson_live_payment_state (
 booking_id text PRIMARY KEY REFERENCES samson_bookings(id),
 record jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS samson_live_payment_reference ON samson_live_payment_state((record->>'reference'));
CREATE UNIQUE INDEX IF NOT EXISTS samson_live_payment_id ON samson_live_payment_state((record->>'paymentId')) WHERE record->>'paymentId' IS NOT NULL;
CREATE TABLE IF NOT EXISTS samson_checkout_rate (
 subject text NOT NULL,
 bucket bigint NOT NULL,
 attempts integer NOT NULL DEFAULT 1,
 PRIMARY KEY(subject,bucket)
);
