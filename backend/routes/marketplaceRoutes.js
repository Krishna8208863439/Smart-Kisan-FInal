import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (jpeg, jpg, png, webp) are allowed"));
    }
  }
});

// POST /api/marketplace/upload (Upload product photo)
router.post("/upload", protect, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({ imageUrl: fileUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Failed to upload image" });
  }
});

const SEED_PRODUCTS = [
  {
    name: "Mahyco Sonalika Organic Wheat Seeds",
    category: "Seeds",
    seller: "Green Agro Solutions",
    rating: 4.8,
    reviews: 234,
    price: 850,
    unit: "/kg",
    stock: "In Stock",
    image: "/uploads/organic_wheat_seeds.png",
    description: "Certified high-yielding organic wheat seeds suitable for Rabi season sowing. Treated for natural disease resistance. [Germination Rate: 96%]"
  },
  {
    name: "IFFCO NPK 19:19:19 Bio-Fertilizer",
    category: "Fertilizers",
    seller: "FarmTech India",
    rating: 4.8,
    reviews: 456,
    price: 1200,
    unit: "/25kg bag",
    stock: "In Stock",
    image: "/uploads/bio_fertilizer_npk.png",
    description: "Balanced macronutrient formula containing organic nitrogen, phosphorus, and potash compounds. Promotes healthy root growth and vegetative development. [NPK Formula: 19:19:19]"
  },
  {
    name: "Jain Drip Irrigation Kit (1 Acre)",
    category: "Tools",
    seller: "Irrigation Pro",
    rating: 4.6,
    reviews: 89,
    price: 15000,
    unit: "/set",
    stock: "In Stock",
    image: "/uploads/drip_irrigation_kit.png",
    description: "Complete drip line kit with drippers, filters, valves, lateral pipes, and micro-sprinklers. Saves up to 60% water."
  },
  {
    name: "Pioneer Hybrid Maize Seeds (30Y92)",
    category: "Seeds",
    seller: "AgriGrow Seeds",
    rating: 4.4,
    reviews: 120,
    price: 950,
    unit: "/kg",
    stock: "In Stock",
    image: "/uploads/hybrid_maize_seeds.png",
    description: "Premium hybrid corn seeds optimized for dry-land cultivation. Early maturing variety. [Germination Rate: 94%]"
  },
  {
    name: "Multiplex Liquid Micro-Nutrient Mix",
    category: "Fertilizers",
    seller: "Nutrient Plus",
    rating: 4.3,
    reviews: 98,
    price: 480,
    unit: "/litre",
    stock: "In Stock",
    image: "/uploads/liquid_micronutrient.png",
    description: "Foliar spray liquid nutrition rich in zinc, iron, boron, and chelated trace minerals. [NPK Formula: 5:10:5]"
  },
  {
    name: "Aspee Knapsack Hand Sprayer Pump (16L)",
    category: "Equipment",
    seller: "Kisan Equip Co.",
    rating: 4.1,
    reviews: 64,
    price: 2200,
    unit: "/unit",
    stock: "In Stock",
    image: "/uploads/hand_sprayer_pump.png",
    description: "Ergonomic 16-liter manual knapsack sprayer with adjustable brass nozzles and heavy-duty battery backup."
  },
  {
    name: "Eco Pesticide (Margosom Neem Based)",
    category: "Pesticides",
    seller: "SafeCrop Bio",
    rating: 4.5,
    reviews: 142,
    price: 650,
    unit: "/litre",
    stock: "In Stock",
    image: "/uploads/eco_pesticide.png",
    description: "Pure cold-pressed neem oil formulation containing 1500ppm Azadirachtin. Controls sucking pests naturally."
  },
  {
    name: "Mahyco Bollgard-II Premium Cotton Seeds",
    category: "Seeds",
    seller: "Green Agro Solutions",
    rating: 4.7,
    reviews: 165,
    price: 1100,
    unit: "/kg",
    stock: "In Stock",
    image: "/uploads/organic_wheat_seeds.png",
    description: "High-yield cotton seeds for rainfed farming. Highly resistant to bollworm. [Germination Rate: 98%]"
  },
  {
    name: "Jaivik Bharat Organic Vermicompost",
    category: "Fertilizers",
    seller: "EcoHumus Ltd.",
    rating: 4.9,
    reviews: 312,
    price: 450,
    unit: "/50kg bag",
    stock: "In Stock",
    image: "/uploads/bio_fertilizer_npk.png",
    description: "Nutrient-rich natural organic vermicompost prepared from premium cow dung and plant waste. [NPK Formula: 3:1:2]"
  },
  {
    name: "SmartFarm 3-in-1 Soil pH Meter",
    category: "Tools",
    seller: "SmartFarm Sensors",
    rating: 4.5,
    reviews: 78,
    price: 1800,
    unit: "/unit",
    stock: "In Stock",
    image: "/uploads/drip_irrigation_kit.png",
    description: "3-in-1 soil tester for measuring pH level, moisture percentage, and ambient sunlight intensity."
  },
  {
    name: "Kisan Tech Solar Insect Trap",
    category: "Equipment",
    seller: "Kisan Tech",
    rating: 4.4,
    reviews: 53,
    price: 3200,
    unit: "/unit",
    stock: "In Stock",
    image: "/uploads/hand_sprayer_pump.png",
    description: "Automated solar-powered insect trap with UV light attraction sensor. Extremely effective for crop orchards."
  },
  {
    name: "SafeCrop Natural Bio-Herbicide",
    category: "Pesticides",
    seller: "SafeCrop Bio",
    rating: 4.2,
    reviews: 41,
    price: 890,
    unit: "/litre",
    stock: "In Stock",
    image: "/uploads/eco_pesticide.png",
    description: "Organic selective herbicide that controls broadleaf weeds without damaging local crops or soil health."
  },
  {
    name: "Rajesh Patil's Fresh Basmati Rice (Surplus)",
    category: "Produce",
    seller: "Rajesh Patil (Farmer)",
    rating: 5.0,
    reviews: 15,
    price: 75,
    unit: "/kg",
    stock: "In Stock",
    image: "/uploads/Ripening-heads-rice-Oryza-sativa-1781186046446-329740.webp",
    description: "Aroma-rich premium extra long grain Basmati rice from organic fields. [Harvest Date: 05/10/2026]"
  },
  {
    name: "Suresh Mandloi's Red Potatoes (Bulk)",
    category: "Produce",
    seller: "Suresh Mandloi (Farmer)",
    rating: 4.8,
    reviews: 24,
    price: 18,
    unit: "/kg",
    stock: "In Stock",
    image: "/uploads/organic_wheat_seeds.png",
    description: "Freshly dug red potatoes, medium to large sizing. Perfect for wholesale distribution. [Harvest Date: 05/15/2026]"
  },
  {
    name: "Devgad Organic Alphonso Mangoes",
    category: "Produce",
    seller: "Vikram Dev (Farmer)",
    rating: 5.0,
    reviews: 32,
    price: 650,
    unit: "/box (12pcs)",
    stock: "In Stock",
    image: "/uploads/hybrid_maize_seeds.png",
    description: "Sweet and highly aromatic chemical-free export grade Alphonso mangoes from Devgad orchards. [Harvest Date: 06/01/2026]"
  },
  {
    name: "Sangli Organic Turmeric Rhizomes",
    category: "Produce",
    seller: "Amit Rao (Farmer)",
    rating: 4.9,
    reviews: 19,
    price: 120,
    unit: "/kg",
    stock: "In Stock",
    image: "/uploads/liquid_micronutrient.png",
    description: "Fresh and heavy turmeric roots containing high curcumin value. Harvested naturally. [Harvest Date: 04/22/2026]"
  },
  {
    name: "Shakti Solar Water Pump System (3HP)",
    category: "Equipment",
    seller: "SolarAgro India",
    rating: 4.7,
    reviews: 34,
    price: 45000,
    unit: "/set",
    stock: "In Stock",
    image: "/uploads/hand_sprayer_pump.png",
    description: "High discharge submersible solar water pumping system complete with panels, controller, and mounting structures."
  },
  {
    name: "Pioneer High-Yield Mustard Seeds (45S46)",
    category: "Seeds",
    seller: "AgriGrow Seeds",
    rating: 4.6,
    reviews: 112,
    price: 140,
    unit: "/kg",
    stock: "In Stock",
    image: "/uploads/organic_wheat_seeds.png",
    description: "Early maturity black mustard seeds with high oil concentration percentage. [Germination Rate: 95%]"
  }
];

// Helper to seed products if database is empty or outdated
async function seedProductsIfNeeded() {
  const count = await Product.countDocuments({ sellerId: { $exists: false } });
  if (count < SEED_PRODUCTS.length) {
    // Clear default products first to prevent duplicates
    await Product.deleteMany({ sellerId: { $exists: false } });
    await Product.insertMany(SEED_PRODUCTS);
    console.log("Database seeded with updated maximum products list!");
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
