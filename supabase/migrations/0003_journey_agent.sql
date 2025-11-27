-- migrations/0003_journey_agent.sql
-- Journey Agent database schema

-- journeys table: per-day / per-period aggregates
CREATE TABLE journey_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  total_claims integer NOT NULL DEFAULT 0,
  avg_time_to_triage numeric,      -- seconds
  avg_time_to_first_agent_action numeric,
  pct_fast_track numeric,          -- 0..1
  pct_flagged numeric,
  avg_documents_per_claim numeric,
  avg_settlement_estimate_min numeric,
  avg_settlement_estimate_max numeric,
  avg_customer_response_time numeric,
  avg_customer_satisfaction numeric, -- optional if collected
  fraud_flag_rate numeric,         -- pct
  agent_health jsonb,              -- aggregated health metrics for agents
  created_at timestamptz DEFAULT now()
);

-- per-claim journey log for traceability (optional)
CREATE TABLE claim_journey_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id text NOT NULL,
  correlation_id text,
  events jsonb,           -- array of key events with timestamps
  duration_seconds numeric,
  journey_score numeric,  -- composite smoothness score 0..1
  created_at timestamptz DEFAULT now()
);

-- store detailed JourneyAggregateReports (snapshot)
CREATE TABLE journey_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start timestamptz,
  period_end timestamptz,
  report jsonb,
  generated_by text, -- "journey-agent-v1"
  generated_at timestamptz DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX ON journey_aggregates (period_start, period_end);
CREATE INDEX ON claim_journey_log (claim_id);
CREATE INDEX ON journey_reports (period_start, period_end);
