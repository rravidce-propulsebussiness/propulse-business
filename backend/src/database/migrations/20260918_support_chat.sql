CREATE TABLE IF NOT EXISTS chat_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','human','resolved','closed')),
  assigned_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user','lead_partner','admin','ai','system')),
  sender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 4000),
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','system')),
  is_automated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS chat_faqs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'general',
  audience VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (audience IN ('all','user','lead_partner')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_faqs_enabled_audience ON chat_faqs(enabled, audience);

CREATE TABLE IF NOT EXISTS telegram_support_chats (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL UNIQUE REFERENCES chat_conversations(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_support_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,
  telegram_message_id BIGINT NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('outbound','inbound')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(telegram_chat_id, telegram_message_id)
);

INSERT INTO chat_faqs (question, answer, category, audience)
SELECT * FROM (VALUES
  ('What is Propulse Business?', 'Propulse Business connects customers with business services and provides tools for eligible business users and lead partners.', 'general', 'all'),
  ('How can I buy a lead?', 'Open Available Leads, review the lead details and price, then use the purchase action if you are eligible.', 'leads', 'all'),
  ('How can I become a lead partner?', 'Open the Lead Partner section and submit your application. Your application is reviewed through the existing partner workflow.', 'lead_partner', 'all'),
  ('How do I recharge my wallet?', 'Open Wallet and use the available recharge option. Your wallet balance is updated from the verified payment flow.', 'wallet', 'all'),
  ('How do I contact support?', 'You are already connected to Propulse Support. If this question is not answered automatically, a support person will reply here.', 'support', 'all'),
  ('Can I withdraw my investment principal?', 'Investment principal is not available for normal withdrawal. Only eligible earnings can be requested through the existing investor payout flow.', 'investment', 'all')
) AS v(question,answer,category,audience)
WHERE NOT EXISTS (SELECT 1 FROM chat_faqs f WHERE lower(f.question)=lower(v.question));
