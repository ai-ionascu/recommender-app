import { pool } from '../config/db.js';

export const SubtypeRepository = {

  async createSubtype(client, productId, data) {
    switch (data.category) {
      case 'wine':
        await client.query(
          `INSERT INTO wines (product_id, wine_type, grape_variety, vintage, appellation, serving_temperature)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [productId, data.wine_type, data.grape_variety, data.vintage ?? null, data.appellation ?? null, data.serving_temperature ?? null]
        );
        break;
      case 'spirits':
        await client.query(
          `INSERT INTO spirits (product_id, spirit_type, age_statement, distillation_year, cask_type)
           VALUES ($1,$2,$3,$4,$5)`,
          [productId, data.spirit_type, data.age_statement ?? null, data.distillation_year ?? null, data.cask_type ?? null]
        );
        break;
      case 'beer':
        await client.query(
          `INSERT INTO beers (product_id, style, ibu, fermentation_type, brewery)
           VALUES ($1,$2,$3,$4,$5)`,
          [productId, data.style, data.ibu ?? null, data.fermentation_type ?? null, data.brewery]
        );
        break;
      case 'accessories':
        await client.query(
          `INSERT INTO accessories (product_id, accessory_type, material, compatible_with_product_type)
           VALUES ($1,$2,$3,$4)`,
          [productId, data.accessory_type, data.material ?? null, data.compatible_with_product_type ?? null]
        );
        break;
      default:
        // nimic
    }
  },

  async updateSubtype(client, productId, category, details) {
    if (!details) return;
    switch (category) {
      case 'wine':
        await client.query(
          `UPDATE wines SET
            wine_type = COALESCE($1, wine_type),
            grape_variety = COALESCE($2, grape_variety),
            vintage = COALESCE($3, vintage),
            appellation = COALESCE($4, appellation),
            serving_temperature = COALESCE($5, serving_temperature)
           WHERE product_id = $6`,
          [details.wine_type, details.grape_variety, details.vintage, details.appellation, details.serving_temperature, productId]
        );
        break;
      case 'spirits':
        await client.query(
          `UPDATE spirits SET
            spirit_type = COALESCE($1, spirit_type),
            age_statement = COALESCE($2, age_statement),
            distillation_year = COALESCE($3, distillation_year),
            cask_type = COALESCE($4, cask_type)
           WHERE product_id = $5`,
          [details.spirit_type, details.age_statement, details.distillation_year, details.cask_type, productId]
        );
        break;
      case 'beer':
        await client.query(
          `UPDATE beers SET
            style = COALESCE($1, style),
            ibu = COALESCE($2, ibu),
            fermentation_type = COALESCE($3, fermentation_type),
            brewery = COALESCE($4, brewery)
           WHERE product_id = $5`,
          [details.style, details.ibu, details.fermentation_type, details.brewery, productId]
        );
        break;
      case 'accessories':
        await client.query(
          `UPDATE accessories SET
            accessory_type = COALESCE($1, accessory_type),
            material = COALESCE($2, material),
            compatible_with_product_type = COALESCE($3, compatible_with_product_type)
           WHERE product_id = $4`,
          [details.accessory_type, details.material, details.compatible_with_product_type, productId]
        );
        break;
    }
  },

  async getSubtype(productId, category) {
    switch (category) {
      case 'wine': {
        const { rows } = await pool.query('SELECT * FROM wines WHERE product_id = $1', [productId]);
        return rows[0] || null;
      }
      case 'spirits': {
        const { rows } = await pool.query('SELECT * FROM spirits WHERE product_id = $1', [productId]);
        return rows[0] || null;
      }
      case 'beer': {
        const { rows } = await pool.query('SELECT * FROM beers WHERE product_id = $1', [productId]);
        return rows[0] || null;
      }
      case 'accessories': {
        const { rows } = await pool.query('SELECT * FROM accessories WHERE product_id = $1', [productId]);
        return rows[0] || null;
      }
      default:
        return null;
    }
  }
};
