-- 0004_diagnostics.sql — saved AI diagnoses
-- GROUNDED in repo backend/src/models/Diagnosis.js + routes/diagnoses.js
-- (2026-11-03):
--   vehicle (ref, REQUIRED), user (ref, required), problemText, imageUrl
--   (single, a '/uploads/...' path — multer disk storage on the backend),
--   aiResult (Mixed), createdAt. That is the whole model.
--   The aiResult JSON shape is defined by the /ai route's prompt:
--   { severity: "Critical"|"Moderate — Fix Soon"|"Minor — Monitor",
--     safeToDriver: bool, diagnosis: string,
--     estimatedCost: {min,max}, laborHours: {min,max},
--     parts: [{name, estimatedCost: "$X-Y", likelihood, description}],
--     steps: [string], tip: string } — stored whole in ai_result JSONB.
--   The plan assumed obd_code / fair-price columns / language / photo
--   arrays — none exist in the repo, so none exist here. (There is NO AI
--   chat-history model in the repo: "chat" in the codebase is marketplace
--   messaging — see 0006. The earlier chat_threads/chat_messages design
--   was removed in this reconciliation.)

CREATE TABLE IF NOT EXISTS diagnostics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id    text UNIQUE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id   uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  problem_text text,
  image_url    text,                                -- '/uploads/...' path or NULL
  ai_result    jsonb,                               -- the /ai response shape above, whole
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diagnostics_user_idx ON diagnostics (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS diagnostics_vehicle_idx ON diagnostics (vehicle_id);
