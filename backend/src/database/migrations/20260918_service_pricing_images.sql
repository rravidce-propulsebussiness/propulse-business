ALTER TABLE service_pricing ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';

UPDATE service_pricing
SET image_url=CASE slug
  WHEN 'marketing-growth' THEN 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85'
  WHEN 'lead-marketplace' THEN 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=85'
  WHEN 'government-compliance' THEN 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=85'
  ELSE image_url
END
WHERE image_url='' OR image_url IS NULL;