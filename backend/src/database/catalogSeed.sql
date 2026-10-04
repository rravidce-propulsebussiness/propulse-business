-- Canonical, idempotent bootstrap data for a fresh Propulse database.
-- The seed uses natural keys instead of hard-coded IDs so it is safe to rerun.

INSERT INTO industries (name, slug, description)
VALUES
  ('Construction', 'construction', 'Construction, civil works and building services'),
  ('Real Estate', 'real-estate', 'Residential and commercial property services'),
  ('Interior Design & Home Improvement', 'interior-design-home-improvement', 'Interior, renovation and home improvement services'),
  ('Digital Marketing & Advertising', 'digital-marketing-advertising', 'Digital marketing, advertising and creative services'),
  ('Professional Services', 'professional-services', 'Business and professional support services'),
  ('Education & Training', 'education-training', 'Education, coaching and professional training'),
  ('Healthcare', 'healthcare', 'Healthcare and wellness services'),
  ('Automotive', 'automotive', 'Vehicle sales, repair and related automotive services')
ON CONFLICT (name) DO UPDATE
SET slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO services (industry_id, name, slug, description)
SELECT i.id, v.name, v.slug, v.description
FROM industries i
JOIN (VALUES
  ('Construction','Civil Construction','civil-construction','Civil and structural construction services'),
  ('Construction','Building Contractors','building-contractors','Residential and commercial building contractors'),
  ('Real Estate','Property Sales','property-sales','Residential and commercial property sales'),
  ('Real Estate','Property Rentals','property-rentals','Residential and commercial property rentals'),
  ('Interior Design & Home Improvement','Interior Design','interior-design','Interior planning and design services'),
  ('Interior Design & Home Improvement','Home Renovation','home-renovation','Renovation, remodeling and improvement services'),
  ('Digital Marketing & Advertising','Digital Marketing','digital-marketing','Online marketing and growth services'),
  ('Digital Marketing & Advertising','Advertising','advertising','Advertising campaign and creative services'),
  ('Professional Services','Accounting & Tax','accounting-tax','Accounting, bookkeeping and tax services'),
  ('Professional Services','Business Consulting','business-consulting','Business and management consulting services'),
  ('Education & Training','Academic Coaching','academic-coaching','Academic tutoring and coaching'),
  ('Education & Training','Professional Training','professional-training','Professional and vocational training'),
  ('Healthcare','General Healthcare','general-healthcare','General healthcare services'),
  ('Healthcare','Wellness Services','wellness-services','Wellness and preventive care services'),
  ('Automotive','Vehicle Repair','vehicle-repair','Vehicle maintenance and repair services'),
  ('Automotive','Vehicle Sales','vehicle-sales','New and used vehicle sales')
) AS v(industry_name,name,slug,description) ON i.name = v.industry_name
ON CONFLICT (industry_id, name) DO UPDATE
SET slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO subservices (service_id, name, slug, description)
SELECT s.id, v.name, v.slug, v.description
FROM services s
JOIN industries i ON i.id = s.industry_id
JOIN (VALUES
  ('Construction','Civil Construction','Residential Construction','residential-construction','Residential construction projects'),
  ('Construction','Civil Construction','Commercial Construction','commercial-construction','Commercial construction projects'),
  ('Construction','Building Contractors','House Construction','house-construction','Complete house construction'),
  ('Construction','Building Contractors','Commercial Building','commercial-building','Commercial building contracting'),
  ('Real Estate','Property Sales','Residential Property Sales','residential-property-sales','Residential property sales'),
  ('Real Estate','Property Sales','Commercial Property Sales','commercial-property-sales','Commercial property sales'),
  ('Real Estate','Property Rentals','Residential Rentals','residential-rentals','Residential rental properties'),
  ('Real Estate','Property Rentals','Commercial Rentals','commercial-rentals','Commercial rental properties'),
  ('Interior Design & Home Improvement','Interior Design','Residential Interior Design','residential-interior-design','Residential interior design'),
  ('Interior Design & Home Improvement','Interior Design','Commercial Interior Design','commercial-interior-design','Commercial interior design'),
  ('Interior Design & Home Improvement','Home Renovation','Kitchen Renovation','kitchen-renovation','Kitchen renovation and remodeling'),
  ('Interior Design & Home Improvement','Home Renovation','Bathroom Renovation','bathroom-renovation','Bathroom renovation and remodeling'),
  ('Digital Marketing & Advertising','Digital Marketing','Search Engine Optimization','search-engine-optimization','SEO services'),
  ('Digital Marketing & Advertising','Digital Marketing','Social Media Marketing','social-media-marketing','Social media marketing services'),
  ('Digital Marketing & Advertising','Advertising','Meta Advertising','meta-advertising','Advertising on Meta platforms'),
  ('Digital Marketing & Advertising','Advertising','Google Advertising','google-advertising','Advertising on Google platforms'),
  ('Professional Services','Accounting & Tax','Bookkeeping','bookkeeping','Bookkeeping services'),
  ('Professional Services','Accounting & Tax','Tax Filing','tax-filing','Tax filing and compliance services'),
  ('Professional Services','Business Consulting','Business Strategy','business-strategy','Business strategy consulting'),
  ('Professional Services','Business Consulting','Operations Consulting','operations-consulting','Operations and process consulting'),
  ('Education & Training','Academic Coaching','School Tutoring','school-tutoring','School subject tutoring'),
  ('Education & Training','Academic Coaching','Competitive Exam Coaching','competitive-exam-coaching','Competitive examination coaching'),
  ('Education & Training','Professional Training','Technical Training','technical-training','Technical skills training'),
  ('Education & Training','Professional Training','Business Skills Training','business-skills-training','Business and professional skills training'),
  ('Healthcare','General Healthcare','General Physician','general-physician','General physician services'),
  ('Healthcare','General Healthcare','Diagnostic Services','diagnostic-services','Diagnostic and testing services'),
  ('Healthcare','Wellness Services','Nutrition Consulting','nutrition-consulting','Nutrition and diet consulting'),
  ('Healthcare','Wellness Services','Fitness Coaching','fitness-coaching','Fitness and wellness coaching'),
  ('Automotive','Vehicle Repair','Car Repair','car-repair','Car maintenance and repair'),
  ('Automotive','Vehicle Repair','Bike Repair','bike-repair','Two-wheeler maintenance and repair'),
  ('Automotive','Vehicle Sales','New Cars','new-cars','New car sales'),
  ('Automotive','Vehicle Sales','Used Cars','used-cars','Used car sales')
) AS v(industry_name,service_name,name,slug,description)
ON i.name = v.industry_name AND s.name = v.service_name AND s.industry_id = i.id
ON CONFLICT (service_id, name) DO UPDATE
SET slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- One canonical city per state/UT is enough to make a clean database usable immediately.
-- The catalog remains extensible through the existing city administration APIs.
WITH city_seed(state_name,city_name,city_slug) AS (
  VALUES
    ('Andhra Pradesh','Amaravati','amaravati'),
    ('Arunachal Pradesh','Itanagar','itanagar'),
    ('Assam','Dispur','dispur'),
    ('Bihar','Patna','patna'),
    ('Chhattisgarh','Raipur','raipur'),
    ('Goa','Panaji','panaji'),
    ('Gujarat','Gandhinagar','gandhinagar'),
    ('Haryana','Chandigarh','chandigarh'),
    ('Himachal Pradesh','Shimla','shimla'),
    ('Jharkhand','Ranchi','ranchi'),
    ('Karnataka','Bengaluru','bengaluru'),
    ('Kerala','Thiruvananthapuram','thiruvananthapuram'),
    ('Madhya Pradesh','Bhopal','bhopal'),
    ('Maharashtra','Mumbai','mumbai'),
    ('Manipur','Imphal','imphal'),
    ('Meghalaya','Shillong','shillong'),
    ('Mizoram','Aizawl','aizawl'),
    ('Nagaland','Kohima','kohima'),
    ('Odisha','Bhubaneswar','bhubaneswar'),
    ('Punjab','Chandigarh','chandigarh'),
    ('Rajasthan','Jaipur','jaipur'),
    ('Sikkim','Gangtok','gangtok'),
    ('Tamil Nadu','Chennai','chennai'),
    ('Telangana','Hyderabad','hyderabad'),
    ('Tripura','Agartala','agartala'),
    ('Uttar Pradesh','Lucknow','lucknow'),
    ('Uttarakhand','Dehradun','dehradun'),
    ('West Bengal','Kolkata','kolkata'),
    ('Andaman and Nicobar Islands','Port Blair','port-blair'),
    ('Chandigarh','Chandigarh','chandigarh'),
    ('Dadra and Nagar Haveli and Daman and Diu','Daman','daman'),
    ('Delhi','New Delhi','new-delhi'),
    ('Jammu and Kashmir','Srinagar','srinagar'),
    ('Ladakh','Leh','leh'),
    ('Lakshadweep','Kavaratti','kavaratti'),
    ('Puducherry','Puducherry','puducherry')
),
resolved AS (
  SELECT st.id AS state_id,s.city_name,s.city_slug,
         (
           SELECT c.id
           FROM cities c
           WHERE c.state_id=st.id AND c.name=s.city_name
           ORDER BY c.is_active DESC,c.id
           LIMIT 1
         ) AS existing_id
  FROM city_seed s
  JOIN states st ON st.name=s.state_name
)
INSERT INTO cities (state_id,name,slug,is_active)
SELECT state_id,city_name,city_slug,TRUE
FROM resolved
WHERE existing_id IS NULL
ON CONFLICT DO NOTHING;

WITH city_seed(state_name,city_name,city_slug) AS (
  VALUES
    ('Andhra Pradesh','Amaravati','amaravati'),
    ('Arunachal Pradesh','Itanagar','itanagar'),
    ('Assam','Dispur','dispur'),
    ('Bihar','Patna','patna'),
    ('Chhattisgarh','Raipur','raipur'),
    ('Goa','Panaji','panaji'),
    ('Gujarat','Gandhinagar','gandhinagar'),
    ('Haryana','Chandigarh','chandigarh'),
    ('Himachal Pradesh','Shimla','shimla'),
    ('Jharkhand','Ranchi','ranchi'),
    ('Karnataka','Bengaluru','bengaluru'),
    ('Kerala','Thiruvananthapuram','thiruvananthapuram'),
    ('Madhya Pradesh','Bhopal','bhopal'),
    ('Maharashtra','Mumbai','mumbai'),
    ('Manipur','Imphal','imphal'),
    ('Meghalaya','Shillong','shillong'),
    ('Mizoram','Aizawl','aizawl'),
    ('Nagaland','Kohima','kohima'),
    ('Odisha','Bhubaneswar','bhubaneswar'),
    ('Punjab','Chandigarh','chandigarh'),
    ('Rajasthan','Jaipur','jaipur'),
    ('Sikkim','Gangtok','gangtok'),
    ('Tamil Nadu','Chennai','chennai'),
    ('Telangana','Hyderabad','hyderabad'),
    ('Tripura','Agartala','agartala'),
    ('Uttar Pradesh','Lucknow','lucknow'),
    ('Uttarakhand','Dehradun','dehradun'),
    ('West Bengal','Kolkata','kolkata'),
    ('Andaman and Nicobar Islands','Port Blair','port-blair'),
    ('Chandigarh','Chandigarh','chandigarh'),
    ('Dadra and Nagar Haveli and Daman and Diu','Daman','daman'),
    ('Delhi','New Delhi','new-delhi'),
    ('Jammu and Kashmir','Srinagar','srinagar'),
    ('Ladakh','Leh','leh'),
    ('Lakshadweep','Kavaratti','kavaratti'),
    ('Puducherry','Puducherry','puducherry')
),
chosen AS (
  SELECT st.id AS state_id,s.city_name,s.city_slug,
         (
           SELECT c.id
           FROM cities c
           WHERE c.state_id=st.id AND c.name=s.city_name
           ORDER BY c.is_active DESC,c.id
           LIMIT 1
         ) AS existing_id
  FROM city_seed s
  JOIN states st ON st.name=s.state_name
)
UPDATE cities c
SET slug=chosen.city_slug,is_active=TRUE,updated_at=CURRENT_TIMESTAMP
FROM chosen
WHERE c.id=chosen.existing_id
  AND (c.slug IS DISTINCT FROM chosen.city_slug OR c.is_active IS DISTINCT FROM TRUE);
