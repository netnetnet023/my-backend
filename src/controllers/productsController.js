import { pool } from "../db.js";

export async function getProducts(req, res) {
    try {
        const result = await pool.query("SELECT * FROM products");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function addProduct(req, res) {
    try {
        const { name, price } = req.body;
        const result = await pool.query(
            "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *",
            [name, price]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
