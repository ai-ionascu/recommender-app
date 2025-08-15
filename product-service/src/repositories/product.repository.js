import { pool } from '../config/db.js';

export const ProductRepository = {
    async createProduct(client, data) {
        const {
        name, slug, price, category, country, region, description,
        highlight, stock, alcohol_content, volume_ml, featured
        } = data;

        const { rows } = await client.query(
        `INSERT INTO products (
            name, slug, price, category, country, region, description,
            highlight, stock, alcohol_content, volume_ml, featured
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *`,
        [
            name, slug, price, category, country ?? null, region ?? null,
            description ?? null, highlight ?? null, stock ?? 0,
            alcohol_content ?? null, volume_ml ?? null, featured ?? false
        ]
        );
        return rows[0];
    },

    async updateProduct(client, id, data) {
        const {
        name, price, description, stock, featured,
        region, country, alcohol_content, volume_ml
        } = data;

        const { rows } = await client.query(
        `UPDATE products SET
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
        RETURNING *`,
        [name, price, description, stock, featured, region, country, alcohol_content, volume_ml, id]
        );
        return rows[0];
    },

    async getAllProducts(filters = {}) {
        const { category, featured } = filters;
        let query = 'SELECT * FROM products';
        const params = [];
        if (category) {
            params.push(category);
            query += ` WHERE category = $${params.length}`;
        }
        if (featured !== undefined) {
            params.push(featured === true || featured === 'true');
            query += category ? ` AND featured = $${params.length}` : ` WHERE featured = $${params.length}`;
        }
        query += ' ORDER BY id DESC';
        const { rows } = await pool.query(query, params);
        return rows;
    },

    async getProductById(id) {
        const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        return rows[0];
    },

    async deleteProduct(client, id) {
        await client.query('DELETE FROM products WHERE id = $1', [id]);
    },

    async decrementStockTx(client, productId, qty) {
        // do not drop stock below 0
        const { rows } = await client.query(
        `UPDATE products
        SET stock = stock - $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND stock >= $2
        RETURNING id, stock`,
        [productId, qty]
        );
        return rows[0] || null;
    },

    async begin(client) { await client.query('BEGIN'); },
    async commit(client) { await client.query('COMMIT'); },
    async rollback(client) { await client.query('ROLLBACK'); }
};

export async function slugExists(slug) {
    const result = await pool.query(
        'SELECT 1 FROM products WHERE slug = $1 LIMIT 1',
        [slug]
    );
    return result.rowCount > 0;
}