import express from 'express';
import { pool } from '../config/db.js';
import slugify from 'slugify';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import multer from 'multer';
import { validateProductData, normalize } from '../../common/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '../../../.env');
  dotenv.config({ path: envPath });
}

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function parseNullableInt(value) {
  return value === undefined || value === null || value === '' ? null : parseInt(value);
}

router.post('/', async (req, res) => {
  console.log('Received product data:', normalize(req.body));

  const data = normalize(req.body);
  const validationErrors = validateProductData(data);
  console.log('Validation errors:', validationErrors);
  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }
  const client = await pool.connect();
  let responseSent = false;
  
  try {
    const {
      name,
      price,
      category,
      country,
      region,
      description,
      highlight,
      stock,
      alcohol_content,
      volume_ml,
      featured,
      images,
      features,
      // features per type
      wine_type, grape_variety, vintage, appellation, serving_temperature,
      spirit_type, age_statement, distillation_year, cask_type,
      style, ibu, fermentation_type, brewery,
      accessory_type, material, compatible_with_product_type
    } = req.body;

    // check image count and main image constraint
    if (images?.length > 3) {
      return res.status(400).json({ error: 'You can associate at most 3 images per product.' });
    }

    if (images?.length > 0) {
      const mainCount = images.filter(img => img.is_main).length;
      if (mainCount !== 1) {
        return res.status(400).json({ error: 'Exactly one image must be marked as main.' });
      }
    }

    
    await client.query('BEGIN');

    const slug = slugify(name, { lower: true, strict: true });

    // insert main product
    const productResult = await client.query(`
      INSERT INTO products (
        name, slug, price, category, country, region,
        description, highlight, stock,
        alcohol_content, volume_ml, featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        name,
        slug,
        price,
        category,
        country || null,
        region || null,
        description || null,
        highlight || null,
        parseNullableInt(stock) || 0,
        parseNullableInt(alcohol_content) || null,
        parseNullableInt(volume_ml) || null,
        featured || false
      ]
    );
    const newProduct = productResult.rows[0];

    // insert subtype details based on category
    switch (category) {
      case 'wine':
        await client.query(`
          INSERT INTO wines (
            product_id, wine_type, grape_variety, vintage,
            appellation, serving_temperature
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newProduct.id, wine_type, grape_variety, parseNullableInt(vintage) || null,
            appellation || null, serving_temperature || null
          ]);
        break;
      case 'spirits':
        await client.query(`
          INSERT INTO spirits (
            product_id, spirit_type, age_statement,
            distillation_year, cask_type
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            newProduct.id, spirit_type, parseNullableInt(age_statement) || null,
            parseNullableInt(distillation_year) || null, cask_type || null
          ]);
        break;
      case 'beer':
        await client.query(`
          INSERT INTO beers (
            product_id, style, ibu,
            fermentation_type, brewery
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            newProduct.id, style, parseNullableInt(ibu) || null,
            fermentation_type, brewery
          ]);
        break;
      case 'accessories':
        await client.query(`
          INSERT INTO accessories (
            product_id, accessory_type, material,
            compatible_with_product_type
          ) VALUES ($1, $2, $3, $4)`,
          [
            newProduct.id, accessory_type, material,
            compatible_with_product_type || null
          ]);
        break;
      default:
        throw new Error(`Unknown category: ${category}`);
    }

    // upload images to Cloudinary if any
    if (images?.length > 0) {
      await Promise.all(images.map(async (img) => {
        try {
          const upload = await cloudinary.uploader.upload(img.url, {
            folder: 'products',
          });

          await client.query(`
            INSERT INTO product_images (
              product_id, url, alt_text, is_main
            ) VALUES ($1, $2, $3, $4)`,
            [
              newProduct.id,
              upload.secure_url,
              img.alt_text || `${name}`,
              !!img.is_main
            ]);
        } catch (err) {
          console.error('Cloudinary upload error:', err);
        }
      }));
    }

    // insert into product_features if any features defined
    if (features?.length > 0) {
      await Promise.all(features.map(feature => {
        return client.query(`
          INSERT INTO product_features (
            product_id, label, value
          ) VALUES ($1, $2, $3)`,
          [
            newProduct.id,
            feature.label,
            feature.value
          ]);
      }));
    }

    await client.query('COMMIT');

    if (!responseSent) {
      responseSent = true;
      res.status(201).json({
        ...newProduct,
        images: images || [],
        features: features || []
      });
    }

  } catch (err) {

    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }

    // postgres error handling
    if (err.code === '22001' && !responseSent) { // value too long for type
      responseSent = true;
      return res.status(400).json({
        error: 'Input too long for one of the fields.'
      });
    }

    if (err.code === '23502' && !responseSent) { // NOT NULL violation
      responseSent = true;
      return res.status(400).json({
        error: `Missing required field: ${err.column || 'unknown'}`
      });
    }

    if (err.code === '23503' && !responseSent) { // fk violation
      responseSent = true;
      return res.status(400).json({
        error: `Missing foreign key: ${err.column || 'unknown'}`
      });
    }

    if (err.code === '23505' && !responseSent) {
      responseSent = true;

      // Extract constraint name if possible
      const constraint = err.constraint || '';
      let field = 'unknown';

      if (constraint.includes('unique_product_name')) {
        field = 'name';
      } else if (constraint.includes('products_slug_key')) {
        field = 'slug';
      } else if (constraint.includes('unique_feature_per_product_label')) {
        field = 'feature label';
      } else if (constraint.includes('unique_review_per_user_product')) {
        field = 'review';
      }

      return res.status(400).json({
        error: `Duplicate value for unique field: ${field}.`
      });
    }

    console.error('Error in POST /products:', err);

    if (!responseSent && (err instanceof SyntaxError || err instanceof TypeError ||
       err instanceof ReferenceError || err instanceof RangeError || 
       err instanceof EvalError)) {
      responseSent = true;
      return res.status(400).json({ error: err.message });
    }

    if (!responseSent) {
      res.status(500).json({ error: 'Server error: ' + err.message });
    }

  } finally {
    if (client) {
      client.release();
    }
  }
});

// Products - read many + filtering
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = 'SELECT * FROM products';
    const params = [];

    if (category) {
      params.push(category);
      query += ` WHERE category = $${params.length}`;
    }

    if (featured) {
      params.push(featured === 'true');
      query += category ? ` AND featured = $${params.length}` : ` WHERE featured = $${params.length}`;
    }

    const { rows: products } = await pool.query(query, params);

    const enrichedProducts = await Promise.all(products.map(async (product) => {
      const [imagesRes, featuresRes, reviewsRes] = await Promise.all([
        pool.query(
          'SELECT id, url, alt_text, is_main FROM product_images WHERE product_id = $1 ORDER BY is_main DESC',
          [product.id]
        ),
        pool.query(
          'SELECT id, label, value FROM product_features WHERE product_id = $1',
          [product.id]
        ),
        pool.query(
          'SELECT id, user_id, rating, comment, approved, created_at FROM product_reviews WHERE product_id = $1 AND approved = true ORDER BY created_at DESC',
          [product.id]
        )
      ]);

      let details = null;

      switch (product.category) {
        case 'wine':
          details = await pool.query('SELECT * FROM wines WHERE product_id = $1', [product.id]);
          details = details.rows[0] || null;
          break;
        case 'spirits':
          details = await pool.query('SELECT * FROM spirits WHERE product_id = $1', [product.id]);
          details = details.rows[0] || null;
          break;
        case 'beer':
          details = await pool.query('SELECT * FROM beers WHERE product_id = $1', [product.id]);
          details = details.rows[0] || null;
          break;
        case 'accessories':
          details = await pool.query('SELECT * FROM accessories WHERE product_id = $1', [product.id]);
          details = details.rows[0] || null;
          break;
      }

      return {
        ...product,
        images: imagesRes.rows,
        features: featuresRes.rows,
        reviews: reviewsRes.rows,
        details
      };
    }));

    res.json(enrichedProducts);
  } catch (err) {
    console.error('Error fetching products with details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Products - read one with details
router.get('/:id', async (req, res) => {
  try {
    const productQuery = 'SELECT * FROM products WHERE id = $1';
    const productResult = await pool.query(productQuery, [req.params.id]);
    
    if(!productResult.rows[0]) {
      return res.status(404).json({ error: 'Product unavailable.' });
    }
    
    const product = productResult.rows[0];
    
    let subTypeQuery;

    switch(product.category) {
      case 'wine':
        subTypeQuery = 'SELECT * FROM wines WHERE product_id = $1';
        break;
      case 'beer':
        subTypeQuery = 'SELECT * FROM beers WHERE product_id = $1';
        break;
      case 'spirits':
        subTypeQuery = 'SELECT * FROM spirits WHERE product_id = $1';
        break;
      case 'accessories':
        subTypeQuery = 'SELECT * FROM accessories WHERE product_id = $1';
        break;
    }

    if (!subTypeQuery) {
      return res.status(400).json({ error: 'Invalid product category.' });
    }

    const subTypeResult = await pool.query(subTypeQuery, [req.params.id]);
    product.details = subTypeResult.rows[0];
    
    // Add images
    const images = await pool.query(
      'SELECT * FROM product_images WHERE product_id = $1', 
      [req.params.id]
    );
    product.images = images.rows;
    
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// update products
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // images check
    const images = req.body.images || [];
    if (images.length > 3) {
      return res.status(400).json({ error: 'You can associate at most 3 images per product.' });
    }
    if (images.length > 0) {
      const mainCount = images.filter(img => img.is_main).length;
      if (mainCount !== 1) {
        return res.status(400).json({ error: 'Exactly one image must be marked as main.' });
      }
    }

    // update main product details
    if (!req.body.name || !req.body.category) {
      return res.status(400).json({ error: 'Name and category are required.' });
    }
    console.log(req.body);

    const updateQuery = `
      UPDATE products SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        description = COALESCE($3, description),
        stock = COALESCE($4, stock),
        featured = COALESCE($5, featured),
        region = COALESCE($6, region),
        country = COALESCE($7, country),
        alcohol_content = COALESCE($8, alcohol_content),
        volume_ml = COALESCE($9, volume_ml),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *`;
    
    const baseValues = [
      req.body.name,
      req.body.price,
      req.body.description,
      req.body.stock,
      req.body.featured,
      req.body.region,
      req.body.country,
      req.body.alcohol_content,
      req.body.volume_ml,
      req.params.id
    ];
    
    const { rows } = await client.query(updateQuery, baseValues);
    const updatedProduct = rows[0];

    if (!updatedProduct) {
      throw new Error(`Product with ID ${req.params.id} not found.`);
    }

    // subtypes
    if (req.body.details) {
      switch (updatedProduct.category) {
        case 'wine':
          await client.query(`
            UPDATE wines SET
              wine_type = COALESCE($1, wine_type),
              grape_variety = COALESCE($2, grape_variety),
              vintage = COALESCE($3, vintage),
              appellation = COALESCE($4, appellation),
              serving_temperature = COALESCE($5, serving_temperature)
            WHERE product_id = $6`, [
              req.body.details.wine_type,
              req.body.details.grape_variety,
              req.body.details.vintage,
              req.body.details.appellation,
              req.body.details.serving_temperature,
              req.params.id
          ]);
          break;

        case 'spirits':
          await client.query(`
            UPDATE spirits SET
              spirit_type = COALESCE($1, spirit_type),
              age_statement = COALESCE($2, age_statement),
              distillation_year = COALESCE($3, distillation_year),
              cask_type = COALESCE($4, cask_type)
            WHERE product_id = $5`, [
              req.body.details.spirit_type,
              req.body.details.age_statement,
              req.body.details.distillation_year,
              req.body.details.cask_type,
              req.params.id
          ]);
          break;

        case 'beer':
          await client.query(`
            UPDATE beers SET
              style = COALESCE($1, style),
              ibu = COALESCE($2, ibu),
              fermentation_type = COALESCE($3, fermentation_type),
              brewery = COALESCE($4, brewery)
            WHERE product_id = $5`, [
              req.body.details.style,
              req.body.details.ibu,
              req.body.details.fermentation_type,
              req.body.details.brewery,
              req.params.id
          ]);
          break;

        case 'accessories':
          await client.query(`
            UPDATE accessories SET
              accessory_type = COALESCE($1, accessory_type),
              material = COALESCE($2, material),
              compatible_with_product_type = COALESCE($3, compatible_with_product_type)
            WHERE product_id = $4`, [
              req.body.details.accessory_type,
              req.body.details.material,
              req.body.details.compatible_with_product_type,
              req.params.id
          ]);
          break;
      }
    }
    // delete existing images
    await client.query('DELETE FROM product_images WHERE product_id = $1', [req.params.id]);

    // upload and insert new images into Cloudinary
    if (images.length > 0) {
      for (const image of images) {
        try {
          const upload = await cloudinary.uploader.upload(image.url, {
            folder: 'products',
          });

          await client.query(`
            INSERT INTO product_images (product_id, url, alt_text, is_main)
            VALUES ($1, $2, $3, $4)
          `, [
            req.params.id,
            upload.secure_url,
            image.alt_text || updatedProduct.name,
            !!image.is_main
          ]);
        } catch (err) {
          console.error('Cloudinary upload failed:', err);
          throw new Error('Failed to upload image to Cloudinary');
        }
      }
    }


    await client.query('COMMIT');
    res.json(updatedProduct);
  } catch (err) {
    await client.query('ROLLBACK');

    if (err.code === '23505') {
      // Unique constraint violation (ex: slug, name)
      const detail = err.detail || '';
      const match = detail.match(/\((.*?)\)=/); // Extract field name
      const field = match?.[1] || 'unknown';
      return res.status(400).json({
        error: `Duplicate value for unique field: ${field}.`
      });
    }

    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});


// Delete products
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy endpoint Unsplash + Pexels API
router.get('/images/search', async (req, res) => {
  const { query, per_page = 30, page = 1 } = req.query;

  try {
    // Try Unsplash
    const unsplashRes = await axios.get('https://api.unsplash.com/search/photos', {
      params: { query, per_page, page },
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
    });

    if (unsplashRes.data.results && unsplashRes.data.results.length > 0) {
      const images = unsplashRes.data.results.map(img => ({
        url: img.urls.regular,
        alt_text: img.alt_description || 'Image'
      }));
      return res.json(images);
    }

    // Fallback Pexels
    const pexelsRes = await axios.get('https://api.pexels.com/v1/search', {
      params: { query, per_page, page },
      headers: { Authorization: PEXELS_API_KEY }
    });

    if (pexelsRes.data.photos && pexelsRes.data.photos.length > 0) {
      const images = pexelsRes.data.photos.map(img => ({
        url: img.src.large,
        alt_text: img.alt || 'Image'
      }));
      return res.json(images);
    }

    // No images found in both APIs
    return res.status(404).json({ message: 'No images found.' });

  } catch (error) {
    console.error('Error fetching images:', error.message);
    return res.status(500).json({ message: 'Image fetch failed.' });
  }
});

// PUT /products/:productId/images/set-main
router.put('/:productId/images/set-main', async (req, res) => {
  const { url } = req.body;
  const { productId } = req.params;

  if (!url) {
    return res.status(400).json({ error: 'Image URL is required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Reset is_main for all images
    await client.query(
      `UPDATE product_images SET is_main = false WHERE product_id = $1`,
      [productId]
    );

    // Set is_main = true for the selected image
    const result = await client.query(
      `UPDATE product_images SET is_main = true WHERE product_id = $1 AND url = $2 RETURNING *`,
      [productId, url]
    );

    await client.query('COMMIT');

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    return res.json({ message: 'Main image updated successfully.', image: result.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error setting main image:', err);
    res.status(500).json({ error: 'Failed to set main image.' });
  } finally {
    client.release();
  }
});

// PUT /products/:id/images
router.put('/:id/images', upload.single('image'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.url;
    const altText = req.body.alt_text || '';

    // delete existing
    await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);

    // insert new
    const result = await client.query(
      `INSERT INTO product_images (product_id, url, alt_text, is_main) VALUES ($1, $2, $3, true) RETURNING *`,
      [id, imageUrl, altText]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;