BEGIN;

INSERT INTO products (id, name, slug, price, category, stock)
VALUES
  -- 5 Wines
  (1 , 'Château Rouge'     , 'chateau-rouge'     , 25.00, 'wine'       , 50),
  (2 , 'Domaine Blanc'     , 'domaine-blanc'     , 30.00, 'wine'       , 40),
  (3 , 'Vin de Soleil'     , 'vin-de-soleil'     , 18.50, 'wine'       , 60),
  (4 , 'Cuvée Prestige'    , 'cuvee-prestige'    , 45.00, 'wine'       , 20),
  (5 , 'Rosé d’Été'        , 'rose-d-ete'        , 22.00, 'wine'       , 30),

  -- 5 Spirits
  (6 , 'Old Oak Whiskey'   , 'old-oak-whiskey'   , 55.00, 'spirits'    , 25),
  (7 , 'Pure Vodka'        , 'pure-vodka'        , 40.00, 'spirits'    , 35),
  (8 , 'Gin de Montagne'   , 'gin-de-montagne'   , 50.00, 'spirits'    , 30),
  (9 , 'Tequila Azul'      , 'tequila-azul'      , 48.00, 'spirits'    , 28),
  (10, 'Brandy Royale'     , 'brandy-royale'     , 60.00, 'spirits'    , 15),

  -- 5 Beers
  (11, 'Pilsner Light'     , 'pilsner-light'     , 5.00 , 'beer'       , 100),
  (12, 'Stout Strong'      , 'stout-strong'      , 6.50 , 'beer'       , 80),
  (13, 'IPA Hoppy'         , 'ipa-hoppy'         , 7.00 , 'beer'       , 75),
  (14, 'Wheat Ale'         , 'wheat-ale'         , 6.00 , 'beer'       , 90),
  (15, 'Porter Dark'       , 'porter-dark'       , 6.75 , 'beer'       , 65),

  -- 5 Accessories
  (16, 'Crystal Decanter'  , 'crystal-decanter'  , 85.00, 'accessories', 10),
  (17, 'Cork Screw Pro'    , 'cork-screw-pro'    , 12.00, 'accessories', 50),
  (18, 'Wine Glass Set'    , 'wine-glass-set'    , 45.00, 'accessories', 20),
  (19, 'Beer Mug Pack'     , 'beer-mug-pack'     , 35.00, 'accessories', 25),
  (20, 'Bottle Opener Key' , 'bottle-opener-key' , 15.00, 'accessories', 40)
;

-- 2) SUBTYPE DETAILS
-- Wines (1–5)
INSERT INTO wines    (product_id, wine_type, grape_variety, vintage, appellation, serving_temperature) VALUES
  (1,'red'     ,'Merlot' ,2018,'AOC Bordeaux','16'),
  (2,'white'   ,'Chardonnay',2019,'AOC Burgundy','12'),
  (3,'sparkling','Pinot Noir',2020,'Champagne','8'),
  (4,'red'     ,'Cabernet' ,2017,'AOC Bordeaux','18'),
  (5,'rose'    ,'Grenache' ,2021,'Provence','10')
;

-- Spirits (6–10)
INSERT INTO spirits  (product_id, spirit_type, age_statement, distillation_year, cask_type) VALUES
  (6,'whiskey',12,2008,'Oak'),
  (7,'vodka'  ,null,2022,null),
  (8,'gin'    ,null,2021,null),
  (9,'tequila',5,2016,'American Oak'),
  (10,'brandy',8,2012,'Chestnut')
;

-- Beers (11–15)
INSERT INTO beers    (product_id, style, ibu, fermentation_type, brewery) VALUES
  (11,'pilsner',25,'lager','Pilsner Co'),
  (12,'stout'  ,40,'ale','Stout Inc'),
  (13,'ipa'    ,60,'ale','Hoppy Brewers'),
  (14,'wheat'  ,15,'ale','Wheat Works'),
  (15,'porter' ,35,'ale','Porter House')
;

-- Accessories (16–20)
INSERT INTO accessories (product_id, accessory_type, material, compatible_with_product_type) VALUES
  (16,'decanter' ,'crystal','wine'),
  (17,'opener'   ,'steel'  ,'all'),
  (18,'glassware','glass'  ,'wine'),
  (19,'glassware','ceramic','beer'),
  (20,'opener'   ,'metal'  ,'spirits')
;

-- 3) FEATURES (doar pentru produse 1–5 și 11–15)
INSERT INTO product_features (product_id, label, value) VALUES
  (1 ,'organic'  ,'yes'),
  (1 ,'award'    ,'Gold 2019'),
  (2 ,'vegan'    ,'true'),
  (2 ,'region'   ,'Côte d''Or'),
  (3 ,'sparkling','true'),
  (3 ,'sweetness','Brut'),
  (4 ,'oak-aged' ,'true'),
  (4 ,'limited'  ,'1000 bottles'),
  (5 ,'rosé'     ,'dry'),
  (5 ,'fruity'   ,'strawberry'),

  (11,'light'    ,'true'),
  (11,'crisp'    ,'yes'),
  (12,'dark'     ,'rich'),
  (12,'creamy'   ,'true'),
  (13,'hoppy'    ,'intense'),
  (13,'bitter'   ,'medium'),
  (14,'smooth'   ,'yes'),
  (14,'citrus'   ,'lemon'),
  (15,'smoky'    ,'true'),
  (15,'roasty'   ,'yes')
;

-- 4) REVIEWS (doar pentru produse 1–5 și 11–15)
INSERT INTO product_reviews (product_id, user_id, rating, comment, approved) VALUES
  (1 , 101, 5, 'Exceptional wine, very smooth.', true),
  (1 , 102, 4, 'Great value for the price.', true),
  (2 , 103, 5, 'Absolutely loved it!', true),
  (2 , 104, 3, 'Good but a bit dry for my taste.', true),
  (3 , 105, 4, 'Nice bubbles and flavor.', true),
  (3 , 106, 5, 'Best sparkling I''ve tried.', true),
  (4 , 107, 5, 'Rich and complex.', true),
  (4 , 108, 4, 'Very nice, but pricey.', true),
  (5 , 109, 4, 'Fresh and fruity.', true),
  (5 , 110, 5, 'My new favorite rosé!', true),

  (11, 201, 4, 'Light and refreshing.', true),
  (11, 202, 3, 'A bit too light for me.', true),
  (12, 203, 5, 'Perfect stout on a cold night.', true),
  (12, 204, 4, 'Creamy texture is great.', true),
  (13, 205, 5, 'Love the hoppy kick!', true),
  (13, 206, 4, 'Good, but a bit bitter.', true),
  (14, 207, 4, 'Smooth and easy to drink.', true),
  (14, 208, 3, 'Wish it had more flavor.', true),
  (15, 209, 5, 'Smoky aroma is wonderful.', true),
  (15, 210, 4, 'Nice porter, very drinkable.', true)
;

-- 5) RESET SEQUENCES
SELECT setval('products_id_seq',      (SELECT MAX(id) FROM products));
SELECT setval('wines_product_id_seq', (SELECT MAX(product_id) FROM wines));
SELECT setval('spirits_product_id_seq',(SELECT MAX(product_id) FROM spirits));
SELECT setval('beers_product_id_seq', (SELECT MAX(product_id) FROM beers));
SELECT setval('accessories_product_id_seq',(SELECT MAX(product_id) FROM accessories));
SELECT setval('product_features_id_seq',    (SELECT MAX(id) FROM product_features));
SELECT setval('product_reviews_id_seq',     (SELECT MAX(id) FROM product_reviews));

COMMIT;