import express from 'express';
import { pool } from '../db/db.js';
import slugify from 'slugify';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '../../../.env');
  dotenv.config({ path: envPath });
}

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const slug = slugify(req.body.name, { lower: true, strict: true });
      
      // Creare produs principal
      const productQuery = `INSERT INTO products (
                            name, slug, price, category, country, region, 
                            description, highlight, stock, 
                            alcohol_content, volume_ml, featured)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                            RETURNING *`;
      
      const productValues = [
        req.body.name,
        slug,
        req.body.price,
        req.body.category,
        req.body.country,
        req.body.region,
        req.body.description,
        req.body.highlight,
        req.body.stock || 0,
        req.body.alcohol_content,
        req.body.volume_ml,
        req.body.featured || false
      ];
      
      const productResult = await client.query(productQuery, productValues);
      const newProduct = productResult.rows[0];
      
      // Creare sub-tip produs
      let subTypeQuery;
      switch(newProduct.category) {
        case 'wine':
          subTypeQuery = `INSERT INTO wines (
                          product_id, wine_type, grape_variety, vintage, 
                          appellation, serving_temperature)
                          VALUES ($1, $2, $3, $4, $5, $6)
                          RETURNING *`;
          await client.query(subTypeQuery, [
            newProduct.id,
            req.body.wine_type,
            req.body.grape_variety,
            req.body.vintage,
            req.body.appellation,
            req.body.serving_temperature,
          ]);
          break;
          
        case 'spirit':
          subTypeQuery = `INSERT INTO spirits (
                          product_id, spirit_type, age_statement, 
                          distillation_year, cask_type)
                          VALUES ($1, $2, $3, $4, $5)
                          RETURNING *`;
          await client.query(subTypeQuery, [
            newProduct.id,
            req.body.spirit_type,
            req.body.age_statement,
            req.body.distillation_year,
            req.body.cask_type
          ]);
          break;
          
        case 'beer':
          subTypeQuery = `INSERT INTO beers (
                          product_id, style, ibu, 
                          fermentation_type, brewery)
                          VALUES ($1, $2, $3, $4, $5)
                          RETURNING *`;
          await client.query(subTypeQuery, [
            newProduct.id,
            req.body.style,
            req.body.ibu,
            req.body.fermentation_type,
            req.body.brewery
          ]);
          break;
          
        case 'accessory':
          subTypeQuery = `INSERT INTO accessories (
                          product_id, accessory_type, material, 
                          compatible_with_product_type)
                          VALUES ($1, $2, $3, $4)
                          RETURNING *`;
          await client.query(subTypeQuery, [
            newProduct.id,
            req.body.accessory_type,
            req.body.material,
            req.body.compatible_with_product_type
          ]);
          break;
          
        default:
          throw new Error('Categorie produs invalidă');
      }

      // Save images to Cloudinary and database
if (req.body.images && req.body.images.length > 0) {
  const uploadedImages = await Promise.all(
    req.body.images.map(async (img, index) => {
      try {
        const uploadResult = await cloudinary.uploader.upload(img.url, {
          folder: 'products',
        });

        await client.query(
          `INSERT INTO product_images (product_id, url, alt_text, is_main)
           VALUES ($1, $2, $3, $4)`,
          [
            newProduct.id,
            uploadResult.secure_url,
            img.alt_text || `${newProduct.name}`,
            index === 0, // first image is main
          ]
        );
      } catch (uploadErr) {
        console.error('Cloudinary error:', uploadErr);
      }
    })
  );
}

      // Save features
      if(req.body.features && req.body.features.length > 0) {
        await Promise.all(req.body.features.map(async feature => {
          await client.query(
            `INSERT INTO product_features (
              product_id, key, value
            ) VALUES ($1, $2, $3)`,
            [
              newProduct.id,
              feature.key,
              feature.value
            ]
          );
        }));
      }
      
      await client.query('COMMIT');
      res.status(201).json({
        ...newProduct,
        images: req.body.images || [],
        features: req.body.features || []
      });
      
    } finally {
      client.release();
    }
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
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
      const [images, features] = await Promise.all([
        pool.query('SELECT url, alt_text, is_main FROM product_images WHERE product_id = $1', [product.id]),
        pool.query('SELECT key, value FROM product_features WHERE product_id = $1', [product.id])
      ]);

      let details = null;

      switch (product.category) {
        case 'wine':
          details = await pool.query('SELECT * FROM wines WHERE product_id = $1', [product.id]);
          details = details.rows[0] || null;
          break;
        case 'spirit':
          details = await pool.query('SELECT * FROM spirits WHERE product_id = $1', [product.id]);
          details = details.rows[0] || null;
          break;
        case 'beer':
          details = await pool.query('SELECT * FROM beers WHERE product_id = $1', [product.id]);
          details = details.rows[0] || null;
          break;
        case 'accessory':
          details = await pool.query('SELECT * FROM accessories WHERE product_id = $1', [product.id]);
          details = details.rows[0] || null;
          break;
      }

      return {
        ...product,
        images: images.rows,
        features: features.rows,
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
      // Fill for the othe categories
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
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const updateQuery = `
        UPDATE products SET
          name = COALESCE($1, name),
          price = COALESCE($2, price),
          description = COALESCE($3, description),
          stock = COALESCE($4, stock),
          featured = COALESCE($5, featured)
        WHERE id = $6
        RETURNING *`;
      
      const updateValues = [
        req.body.name,
        req.body.price,
        req.body.description,
        req.body.stock,
        req.body.featured,
        req.params.id
      ];
      
      const updateResult = await client.query(updateQuery, updateValues);
      
      // update subtype
      if(req.body.details) {
        let subTypeUpdate;
        switch(updateResult.rows[0].category) {
          case 'wine':
            subTypeUpdate = `
              UPDATE wines SET
                wine_type = COALESCE($1, wine_type),
                grape_variety = COALESCE($2, grape_variety),
                vintage = COALESCE($3, vintage)
              WHERE product_id = $4`;
            await client.query(subTypeUpdate, [
              req.body.details.wine_type,
              req.body.details.grape_variety,
              req.body.details.vintage,
              req.params.id
            ]);
            break;
        }
      }
      
      await client.query('COMMIT');
      res.json(updateResult.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
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
router.put('/products/:productId/images/set-main', async (req, res) => {
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

export default router;