import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { swaggerUi, swaggerSpec } from "./swagger.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Swagger Docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Database
const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false }
});

// Base route
app.get('/', (req, res) => {
  res.send('Backend is working');
});

// Register
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const hashed = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
      [email, hashed]
    );
    res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

  if (user.rows.length === 0)
    return res.status(400).json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.rows[0].password);
  if (!valid)
    return res.status(400).json({ error: "Invalid password" });

  const token = jwt.sign(
    { userId: user.rows[0].id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

// Auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Protect all product routes
app.use("/products", authMiddleware);

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Get all products
 *     responses:
 *       200:
 *         description: Returns list of products
 */

// GET products
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database query failed" });
  }
});

// GET product by ID
app.get('/products/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id=$1',
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Product not found" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Database query failed" });
  }
});

// CREATE product
app.post('/products', async (req, res) => {
  const { name, price } = req.body;

  if (!name || typeof name !== "string")
    return res.status(400).json({ error: "Invalid name" });

  if (isNaN(price) || price < 0)
    return res.status(400).json({ error: "Invalid price" });

  try {
    const result = await pool.query(
      'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *',
      [name, price]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Database insert failed" });
  }
});

// UPDATE product
app.put('/products/:id', async (req, res) => {
  const id = req.params.id;
  const { name, price } = req.body;

  if (!name || typeof name !== "string")
    return res.status(400).json({ error: "Invalid name" });

  if (isNaN(price) || price < 0)
    return res.status(400).json({ error: "Invalid price" });

  try {
    const result = await pool.query(
      'UPDATE products SET name=$1, price=$2 WHERE id=$3 RETURNING *',
      [name, price, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Product not found" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Database update failed" });
  }
});

// DELETE product
app.delete('/products/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id=$1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Product not found" });

    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Database delete failed" });
  }
});

// Error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: "Something went wrong" });
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
