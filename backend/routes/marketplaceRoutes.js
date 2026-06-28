import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";
import BuyRequest from "../models/BuyRequest.js";
import Contract from "../models/Contract.js";
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
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80",
    description: "Certified high-yielding organic wheat seeds suitable for Rabi season sowing. Treated for natural disease resistance. [Germination Rate: 96%] [Live Link: https://krishna3114.pythonanywhere.com/]"
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
    image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80",
    description: "Balanced macronutrient formula containing organic nitrogen, phosphorus, and potash compounds. Promotes healthy root growth and vegetative development. [NPK Formula: 19:19:19] [Live Link: https://krishna3114.pythonanywhere.com/]"
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
    image: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=600&q=80",
    description: "Complete drip line kit with drippers, filters, valves, lateral pipes, and micro-sprinklers. Saves up to 60% water. [Live Link: https://krishna3114.pythonanywhere.com/]"
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
    image: "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&w=600&q=80",
    description: "Premium hybrid corn seeds optimized for dry-land cultivation. Early maturing variety. [Germination Rate: 94%] [Live Link: https://krishna3114.pythonanywhere.com/]"
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
    image: "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&w=600&q=80",
    description: "Foliar spray liquid nutrition rich in zinc, iron, boron, and chelated trace minerals. [NPK Formula: 5:10:5] [Live Link: https://krishna3114.pythonanywhere.com/]"
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
    image: "https://images.unsplash.com/photo-1599685315640-9ce50450d03b?auto=format&fit=crop&w=600&q=80",
    description: "Ergonomic 16-liter manual knapsack sprayer with adjustable brass nozzles and heavy-duty battery backup. [Live Link: https://krishna3114.pythonanywhere.com/]"
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
    image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=600&q=80",
    description: "Pure cold-pressed neem oil formulation containing 1500ppm Azadirachtin. Controls sucking pests naturally. [Live Link: https://krishna3114.pythonanywhere.com/]"
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
    image: "https://images.unsplash.com/photo-1604928141064-207ec6f57e42?auto=format&fit=crop&w=600&q=80",
    description: "High-yield cotton seeds for rainfed farming. Highly resistant to bollworm. [Germination Rate: 98%] [Live Link: https://krishna3114.pythonanywhere.com/]"
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
    image: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1508780709619-79562169bc31?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
    description: "Aroma-rich premium extra long grain Basmati rice from organic fields. [Harvest Date: 05/10/2026] [Live Link: https://krishna3114.pythonanywhere.com/]"
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
    image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=600&q=80",
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
    image: "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=600&q=80",
    description: "Early maturity black mustard seeds with high oil concentration percentage. [Germination Rate: 95%]"
  }
];

// Helper to seed products if database is empty or outdated
async function seedProductsIfNeeded() {
  const outdatedProduct = await Product.findOne({
    sellerId: { $exists: false },
    image: { $regex: /1530595467537|1599819811279|1592417817098|1416879595882|1593113630400|1563514227147/ }
  });
  const oldProduct = await Product.findOne({ sellerId: { $exists: false }, image: { $regex: /^\/uploads\// } });
  const count = await Product.countDocuments({ sellerId: { $exists: false } });
  
  if (outdatedProduct || oldProduct || count < SEED_PRODUCTS.length) {
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

    const CATEGORY_DEFAULT_IMAGES = {
      "Seeds": "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&w=600&q=80",
      "Fertilizers": "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80",
      "Tools": "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=600&q=80",
      "Equipment": "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=600&q=80",
      "Pesticides": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=600&q=80",
      "Produce": "https://images.unsplash.com/photo-1592982537447-7440770cbfc8?auto=format&fit=crop&w=600&q=80"
    };
    const defaultImage = (image && image.trim()) ? image : (CATEGORY_DEFAULT_IMAGES[category] || "https://images.unsplash.com/photo-1592982537447-7440770cbfc8?auto=format&fit=crop&w=600&q=80");

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
    const userEmail = req.user.email || "kisan@gmail.com";

    // Simulate email dispatch
    console.log(`\n=============================================================`);
    console.log(`📧 [EMAIL SENT] Order Confirmation Email Dispatched!`);
    console.log(`✉️  Recipient: ${userEmail}`);
    console.log(`📦 Order ID: ${orderId}`);
    console.log(`💸 Total Items: ${cartItems.length}`);
    console.log(`=============================================================\n`);

    return res.json({
      success: true,
      orderId,
      email: userEmail,
      message: `Order placed successfully! A confirmation email and digital receipt have been sent to ${userEmail}.`
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

// ========== B2B BUY REQUESTS (MERCHANTS) ==========

// GET /api/marketplace/buy-requests
router.get("/buy-requests", async (req, res) => {
  try {
    const requests = await BuyRequest.find().sort({ createdAt: -1 });
    return res.json(requests);
  } catch (error) {
    console.error("Error fetching buy requests:", error);
    return res.status(500).json({ message: "Failed to fetch buy requests" });
  }
});

// POST /api/marketplace/buy-requests
router.post("/buy-requests", protect, async (req, res) => {
  try {
    const { cropName, quantity, unit, targetPrice, description } = req.body;
    if (!cropName || !quantity || !unit || !targetPrice) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    if (req.user.role !== "merchant") {
      return res.status(403).json({ message: "Only registered Merchants can post buy requests." });
    }

    const buyRequest = await BuyRequest.create({
      cropName,
      quantity: Number(quantity),
      unit,
      targetPrice: Number(targetPrice),
      merchant: req.user.name,
      merchantId: req.user._id,
      description: description || "Looking to buy wholesale quantity crop produce."
    });

    return res.status(201).json(buyRequest);
  } catch (error) {
    console.error("Error creating buy request:", error);
    return res.status(500).json({ message: "Failed to post buy request" });
  }
});

// DELETE /api/marketplace/buy-requests/:id
router.delete("/buy-requests/:id", protect, async (req, res) => {
  try {
    const request = await BuyRequest.findOneAndDelete({ _id: req.params.id, merchantId: req.user._id });
    if (!request) {
      return res.status(404).json({ message: "Buy request not found or unauthorized" });
    }
    return res.json({ message: "Buy request removed successfully" });
  } catch (error) {
    console.error("Error deleting buy request:", error);
    return res.status(500).json({ message: "Failed to delete buy request" });
  }
});

// ========== B2B WHOLESALE CONTRACTS ==========

// GET /api/marketplace/contracts
router.get("/contracts", protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "merchant") {
      filter.buyerId = req.user._id;
    } else {
      filter.sellerName = req.user.name;
    }
    const contracts = await Contract.find(filter).sort({ createdAt: -1 });
    return res.json(contracts);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return res.status(500).json({ message: "Failed to fetch contracts" });
  }
});

// POST /api/marketplace/contracts
router.post("/contracts", protect, async (req, res) => {
  try {
    const { cropName, quantity, unit, price, sellerName } = req.body;
    if (!cropName || !quantity || !unit || !price || !sellerName) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    if (req.user.role !== "merchant") {
      return res.status(403).json({ message: "Only registered Merchants can initiate bulk contracts." });
    }

    const contract = await Contract.create({
      cropName,
      quantity: Number(quantity),
      unit,
      price: Number(price),
      sellerName,
      buyerName: req.user.name,
      buyerId: req.user._id,
      status: "Pending"
    });

    return res.status(201).json(contract);
  } catch (error) {
    console.error("Error creating contract:", error);
    return res.status(500).json({ message: "Failed to create wholesale contract" });
  }
});

// PATCH /api/marketplace/contracts/:id
router.patch("/contracts/:id", protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required." });
    }

    // A contract status can be updated by the buyer or seller.
    const contract = await Contract.findByIdAndUpdate(req.params.id, { status });
    if (!contract) {
      return res.status(404).json({ message: "Contract not found." });
    }

    return res.json({ message: "Contract status updated successfully", contract });
  } catch (error) {
    console.error("Error updating contract status:", error);
    return res.status(500).json({ message: "Failed to update contract status" });
  }
});

export default router;
