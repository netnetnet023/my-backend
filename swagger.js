import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Product API",
      version: "1.0.0",
      description: "API documentation for the Product Management System",
    },
  },
  apis: ["./backend.js", "./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };
