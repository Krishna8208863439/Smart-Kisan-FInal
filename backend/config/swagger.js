/**
 * Smart Kisan — Swagger / OpenAPI Configuration
 * Auto-generates API docs from JSDoc comments in route files.
 * Accessible at GET /api/docs
 */
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Smart Kisan AI — API",
      version: "1.0.0",
      description: `
**Smart Kisan AI-Driven Agricultural Advisory Portal**

A production-grade API for Indian farmers providing:
- 🌾 **Crop & Leaf Disease Diagnostics** (2-stage CV pipeline)
- 📊 **Crop & Fertilizer Recommendations** (ML model)
- 🌤️ **Live Weather & Agmarknet Market Prices**
- 🗺️ **Farm Management & GIS Mapping**
- 🤖 **Multilingual RAG Chatbot** (LangChain + FAISS)
- 🛒 **Marketplace & Equipment Rental**
- 🏛️ **Government Scheme Eligibility Checker**
- 👨‍⚕️ **Expert Consultation Booking**
- 🔔 **Push Notifications** (FCM)

**Authentication:** Bearer JWT (access token, 15m) + Refresh token rotation (7d)
      `,
      contact: {
        name: "Smart Kisan Support",
        email: "support@smartkisan.in"
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || "http://localhost:5000",
        description: "Development server"
      },
      {
        url: "https://api.smartkisan.in",
        description: "Production server"
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Access token from /api/auth/login (expires in 15 minutes)"
        }
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            error: { type: "object", nullable: true, example: null }
          }
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            data: { type: "object", nullable: true, example: null },
            error: {
              type: "object",
              properties: {
                code: { type: "integer", example: 400 },
                message: { type: "string", example: "Validation error" },
                details: { type: "array", items: { type: "string" } }
              }
            }
          }
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            role: {
              type: "string",
              enum: ["farmer", "expert", "admin", "govt_officer", "seller", "buyer", "merchant"]
            },
            emailVerified: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" }
          }
        }
      }
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Authentication & session management" },
      { name: "Farms", description: "Farm/field management & GIS" },
      { name: "Disease Detection", description: "Crop & leaf disease diagnostics" },
      { name: "Recommendations", description: "Crop & fertilizer recommendations" },
      { name: "Weather", description: "Live weather & farming alerts" },
      { name: "Market Prices", description: "Agmarknet mandi prices" },
      { name: "Marketplace", description: "Product catalog, cart, rental booking" },
      { name: "Govt Schemes", description: "Eligibility checker & application links" },
      { name: "Experts", description: "Expert directory & appointment booking" },
      { name: "Chat", description: "Multilingual RAG chatbot" },
      { name: "Notifications", description: "FCM push notifications" },
      { name: "Admin", description: "Admin-only management endpoints" }
    ]
  },
  apis: ["./routes/*.js", "./models/*.js"]  // Scan all route & model files for JSDoc
};

export const swaggerSpec = swaggerJsdoc(options);
