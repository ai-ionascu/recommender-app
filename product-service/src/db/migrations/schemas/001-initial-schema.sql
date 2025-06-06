-- baza produse
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL, -- URL friendly
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  category VARCHAR(50) NOT NULL CHECK (category IN ('wine', 'spirit', 'beer', 'accessory')),
  country VARCHAR(100) NOT NULL,
  region VARCHAR(100),
  description TEXT,
  highlight VARCHAR(300),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  alcohol_content DECIMAL(4,2),
  volume_ml INT CHECK (volume_ml > 0),
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(150),
  is_main BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS wines (
  product_id INT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  wine_type VARCHAR(50) NOT NULL CHECK (wine_type IN ('red', 'white', 'rose', 'sparkling', 'dessert')),
  grape_variety VARCHAR(100) NOT NULL,
  vintage SMALLINT CHECK (vintage BETWEEN 1900 AND EXTRACT(YEAR FROM NOW()) + 2),
  appellation VARCHAR(100), -- DOC, AOC etc.
  serving_temperature VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS spirits (
  product_id INT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  spirit_type VARCHAR(50) NOT NULL CHECK (spirit_type IN ('whiskey', 'vodka', 'gin', 'rhum', 'tequila', 'brandy')),
  age_statement VARCHAR(50),
  distillation_year SMALLINT,
  cask_type VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS beers (
  product_id INT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  style VARCHAR(50) NOT NULL CHECK (style IN ('lager', 'ipa', 'stout', 'pilsner', 'wheat')),
  ibu SMALLINT CHECK (ibu BETWEEN 0 AND 100),
  fermentation_type VARCHAR(50),
  brewery VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS accessories (
  product_id INT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  accessory_type VARCHAR(50) CHECK (accessory_type IN ('glassware', 'decanters', 'tools', 'gifts')),
  material VARCHAR(50),
  compatible_with_product_type VARCHAR(50)
);

-- caracteristici speciale
CREATE TABLE IF NOT EXISTS product_features (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  key VARCHAR(50) NOT NULL, -- organic, vegan, awards, etc.
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_reviews (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indecsi performanta
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_wines_grape_variety ON wines(grape_variety);
CREATE INDEX IF NOT EXISTS idx_spirits_age ON spirits(age_statement);