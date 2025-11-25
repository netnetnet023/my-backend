import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import productRoutes from "./src/routes/products.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// routes
app.use("/api/products", productRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
