-- migrations/0002_notifications.sql

CREATE TABLE customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id text NOT NULL,         -- claim-<uuid>
  customer_pseudonym text NOT NULL,     -- cust-<hash>, no raw PII
  notif_type text NOT NULL,             -- e.g., 'StatusUpdate'
  status text NOT NULL,                 -- e.g., Submitted, AwaitingDocuments, UnderReview
  message text NOT NULL,                -- human readable message (short)
  detail jsonb,                         -- optional structured payload (rationale, meta)
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for realtime filtering
CREATE INDEX ON customer_notifications (customer_pseudonym);
