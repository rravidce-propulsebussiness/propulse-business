CREATE TABLE IF NOT EXISTS upcoming_features (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  category VARCHAR(80) NOT NULL DEFAULT 'Platform',
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  icon VARCHAR(20) NOT NULL DEFAULT '✦',
  status VARCHAR(40) NOT NULL DEFAULT 'In development',
  timeline VARCHAR(120) NOT NULL DEFAULT 'Coming soon',
  sort_order INTEGER NOT NULL DEFAULT 0,
  highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO upcoming_features
  (name,slug,category,short_description,description,icon,status,timeline,sort_order,highlighted,is_active)
VALUES
('WhatsApp API','whatsapp-api','Business Communication','Connect WhatsApp with business workflows.','Business-focused WhatsApp API capabilities for enquiries, notifications, customer communication and workflow automation.','◉','In development','Coming soon',10,TRUE,TRUE),
('Project Management Apps','project-management-apps','Business Software','Plan projects, teams, tasks and progress.','Project management applications designed to help businesses organize projects, teams, tasks, updates, documents and delivery workflows.','▦','Planned','Coming soon',20,FALSE,TRUE),
('Website Builder','website-builder','Business Software','Build and manage business websites faster.','A website-building platform for creating, editing, publishing and managing business websites with reusable sections and tools.','▤','In development','Coming soon',30,TRUE,TRUE),
('Billing Software','billing-software','Business Software','Simplify billing and business transactions.','Business billing software for invoices, customers, products, transactions and operational records.','₹','Planned','Coming soon',40,FALSE,TRUE),
('Construction Consultation','construction-consultation','Consultation','Technology-enabled support for construction businesses.','Construction-focused consultation and technology support covering business workflows, digital systems and project-related requirements.','⌂','Planned','Coming soon',50,FALSE,TRUE),
('Interior Consultation','interior-consultation','Consultation','Digital support for interior businesses and projects.','Interior consultation capabilities designed around business workflows, customer requirements, project processes and digital operations.','◇','Planned','Coming soon',60,FALSE,TRUE),
('Real Estate Consultation','real-estate-consultation','Consultation','Digital and business support for real estate.','Real-estate-focused consultation covering digital workflows, customer acquisition, technology and business processes.','⌖','Planned','Coming soon',70,FALSE,TRUE),
('Brochure Builder','brochure-builder','Creative Tools','Create professional brochures and marketing material.','A browser-based builder for creating, editing and exporting business brochures and marketing collateral.','▧','Planned','Coming soon',80,FALSE,TRUE),
('Marketing Automation','marketing-automation','Marketing Technology','Automate repetitive marketing workflows.','Marketing automation capabilities for campaigns, follow-ups, lead workflows, segmentation and business communication.','⚡','In development','Coming soon',90,TRUE,TRUE),
('AI Audio Calling','ai-audio-calling','AI & Automation','AI-assisted audio calling for business workflows.','AI-powered audio calling capabilities intended for business communication, follow-up and workflow automation, subject to product and compliance controls.','◌','Researching','Future release',100,FALSE,TRUE),
('Construction & Interior Material Marketplace','construction-interior-material-marketplace','Marketplaces','Discover materials, products and suppliers in one place.','A future marketplace for construction and interior materials, products, suppliers and related business opportunities.','◆','Researching','Future release',110,FALSE,TRUE),
('More Business Technology','more-business-technology','Platform','More tools are being planned.','Additional software, automation, AI and business technology products will be added as the platform evolves.','＋','Planned','More to come',120,FALSE,TRUE)
ON CONFLICT(slug) DO NOTHING;