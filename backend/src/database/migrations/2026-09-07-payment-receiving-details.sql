CREATE TABLE IF NOT EXISTS payment_receiving_details (
  id SERIAL PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  method_type VARCHAR(20) NOT NULL DEFAULT 'upi' CHECK (method_type IN ('upi','bank','both')),
  account_name VARCHAR(160),
  upi_id VARCHAR(160),
  bank_name VARCHAR(160),
  account_number VARCHAR(80),
  ifsc_code VARCHAR(30),
  branch_name VARCHAR(160),
  qr_code TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_receiving_details_active ON payment_receiving_details(is_active,sort_order,id);
