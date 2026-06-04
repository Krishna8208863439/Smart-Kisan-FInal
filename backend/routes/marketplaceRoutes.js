import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";

const router = express.Router();

const SEED_PRODUCTS = [
  {
    name: "Organic Wheat Seeds",
    category: "Seeds",
    seller: "Green Agro Solutions",
    rating: 4.8,
    reviews: 234,
    price: 850,
    unit: "/kg",
    stock: "In Stock",
    image: "https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Bio-Fertilizer NPK",
    category: "Fertilizers",
    seller: "FarmTech India",
    rating: 4.8,
    reviews: 456,
    price: 1200,
    unit: "/25kg bag",
    stock: "In Stock",
    image: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Drip Irrigation Kit",
    category: "Tools",
    seller: "Irrigation Pro",
    rating: 4.6,
    reviews: 89,
    price: 15000,
    unit: "/set",
    stock: "In Stock",
    image: "https://images.unsplash.com/photo-1592982537447-7440770cbfc8?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Hybrid Maize Seeds",
    category: "Seeds",
    seller: "AgriGrow Seeds",
    rating: 4.4,
    reviews: 120,
    price: 950,
    unit: "/kg",
    stock: "In Stock",
    image: "https://images.unsplash.com/photo-1524594154908-edd360252e60?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Liquid Micro-Nutrient Mix",
    category: "Fertilizers",
    seller: "Nutrient Plus",
    rating: 4.3,
    reviews: 98,
    price: 480,
    unit: "/litre",
    stock: "In Stock",
    image: "https://images.unsplash.com/photo-1518595088350-4c9392ee05b3?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Hand Sprayer Pump",
    category: "Equipment",
    seller: "Kisan Equip Co.",
    rating: 4.1,
    reviews: 64,
    price: 2200,
    unit: "/unit",
    stock: "In Stock",
    image: "https://images.unsplash.com/photo-1592998385386-5c9b75434c8f?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Eco Pesticide (Neem Based)",
    category: "Pesticides",
    seller: "SafeCrop Bio",
    rating: 4.5,
    reviews: 142,
    price: 650,
    unit: "/litre",
    stock: "In Stock",
    image: "https://images.unsplash.com/photo-1589924749450-74c7fb10ae8c?auto=format&fit=crop&w=900&q=80"
  }
];

// Helper to seed products if database is empty
async function seedProductsIfNeeded() {
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany(SEED_PRODUCTS);
    console.log("Database seeded with default products!");
  }
}

// GET /api/marketplace
router.get("/", async (req, res) => {
  try {
    await seedProductsIfNeeded();
    const products = await Product.find().sort({ createdAt: -1 });
    return res.json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
});

// POST /api/marketplace (Sell produce - Farmers Bazaar)
router.post("/", protect, async (req, res) => {
  try {
    const { name, category, price, unit, image, description } = req.body;
    if (!name || !category || !price || !unit) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    const defaultImage = image || "https://images.unsplash.com/photo-1592982537447-7440770cbfc8?auto=format&fit=crop&w=900&q=80";

    const product = await Product.create({
      name,
      category,
      seller: req.user.name,
      sellerId: req.user._id,
      price: Number(price),
      unit,
      stock: "In Stock",
      rating: 5.0,
      reviews: 0,
      image: defaultImage,
      description: description || "Fresh farm produce directly listed by farmer."
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to list item for sale" });
  }
});

// POST /api/marketplace/checkout
router.post("/checkout", protect, async (req, res) => {
  try {
    const { cartItems } = req.body;
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Mock successful order
    const orderId = "ORD-" + Date.now() + "-" + Math.floor(1000 + Math.random() * 9000);
    return res.json({
      success: true,
      orderId,
      message: "Order placed successfully! Verified by Kisan SMS network."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Checkout failed" });
  }
});

export default router;
