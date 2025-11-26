import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { swaggerUi, swaggerSpec } from "./swagger.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Swagger route (ONLY ONCE)
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false }
});

app.get('/', (req, res) => {
  res.send('Backend is working');
});

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Get all products
 *     responses:
 *       200:
 *         description: Returns list of products
 */

// GET all products
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Returns a single product
 */


// GET product by ID
app.get('/products/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id=$1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Create a new product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Returns the created product
 */


// CREATE product
app.post('/products', async (req, res) => {
  const { name, price } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid name" });
  }
  if (isNaN(price) || price < 0) {
    return res.status(400).json({ error: "Invalid price" });
  }

  try {
    const result = await pool.query(
      'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *',
      [name, price]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Returns updated product
 */


// UPDATE product
app.put('/products/:id', async (req, res) => {
  const id = req.params.id;
  const { name, price } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid name" });
  }
  if (isNaN(price) || price < 0) {
    return res.status(400).json({ error: "Invalid price" });
  }

  try {
    const result = await pool.query(
      'UPDATE products SET name=$1, price=$2 WHERE id=$3 RETURNING *',
      [name, price, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database update failed" });
  }
});

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Confirms deletion
 */


// DELETE product
app.delete('/products/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id=$1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database delete failed" });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Internal server error:", err);
  res.status(500).json({ error: "Something went wrong" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
