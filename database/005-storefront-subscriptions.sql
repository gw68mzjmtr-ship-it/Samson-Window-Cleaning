CREATE TABLE IF NOT EXISTS samson_storefront_subscriptions (
 booking_id text PRIMARY KEY REFERENCES samson_bookings(id),record jsonb NOT NULL,cancel_requested_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS samson_storefront_renewals (
 billing_period_id text PRIMARY KEY,source_booking_id text NOT NULL REFERENCES samson_bookings(id),record jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS samson_storefront_renewal_payment ON samson_storefront_renewals((record->>'paymentId')) WHERE record->>'paymentId' IS NOT NULL;
