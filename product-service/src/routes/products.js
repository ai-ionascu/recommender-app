import express from 'express';
import { pool } from '../db/db.js';
import slugify from 'slugify';

const router = express.Router();

// Create product
router.post('/', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const slug = slugify(req.body.name, { lower: true, strict: true });
      
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
          
        // to fill for the other product types
      }
      
      await client.query('COMMIT');
      res.status(201).json(newProduct);
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
    
    if(category) {
      query += ' WHERE category = $1';
      params.push(category);
      if(featured) {
        query += ' AND featured = $2';
        params.push(featured === 'true');
      }
    }
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
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

export default router;