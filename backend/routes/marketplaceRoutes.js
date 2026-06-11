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
    image: "http://localhost:5000/uploads/organic_wheat_seeds.png"
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
    image: "http://localhost:5000/uploads/bio_fertilizer_npk.png"
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
    image: "http://localhost:5000/uploads/drip_irrigation_kit.png"
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
    image: "http://localhost:5000/uploads/hybrid_maize_seeds.png"
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
    image: "http://localhost:5000/uploads/liquid_micronutrient.png"
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
    image: "http://localhost:5000/uploads/hand_sprayer_pump.png"
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
    image: "http://localhost:5000/uploads/eco_pesticide.png"
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

// GET /api/marketplace/my-listings (Seller listings)
router.get("/my-listings", protect, async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
    return res.json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch user listings" });
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

// PATCH /api/marketplace/:id/stock (Toggle stock status)
router.patch("/:id/stock", protect, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
    if (!product) {
      return res.status(404).json({ message: "Listing not found or unauthorized" });
    }
    product.stock = product.stock === "In Stock" ? "Sold Out" : "In Stock";
    await product.save();
    return res.json(product);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update stock status" });
  }
});

// DELETE /api/marketplace/:id (Delete listing)
router.delete("/:id", protect, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, sellerId: req.user._id });
    if (!product) {
      return res.status(404).json({ message: "Listing not found or unauthorized" });
    }
    return res.json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete listing" });
  }
});

export default router;
