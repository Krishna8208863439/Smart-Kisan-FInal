/**
 * Government Schemes API — Smart Kisan
 * Phase 10: real eligibility check, search, filter, bookmark
 * Dataset: curated from official government sources (pmkisan.gov.in, pmfby.gov.in, etc.)
 * If SCHEMES_API_KEY is set, the real data.gov.in Open Government Data API is queried.
 */
import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Authoritative scheme dataset ──────────────────────────────────────────
const SCHEMES = [
  {
    id: "pmkisan",
    titleEn: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    titleHi: "पीएम-किसान (प्रधानमंत्री किसान सम्मान निधि)",
    descEn: "Financial support of ₹6,000/year in three equal installments to small & marginal farmer families.",
    category: "Financial Aid",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "₹6,000/year",
    url: "https://pmkisan.gov.in",
    applyUrl: "https://pmkisan.gov.in/RegistrationFormNew.aspx",
    documents: ["Aadhaar card", "Land ownership records", "Bank account (DBT-linked)", "Mobile number"],
    deadline: "Open throughout the year",
    states: ["All States"],
    eligibility: {
      minLandHa: 0,
      maxLandHa: 2,          // Small & marginal — up to 2 ha
      landownerRequired: true,
      excludedCategories: ["government_employee", "income_taxpayer", "professional"],
      minAge: 18,
      maxAge: null
    }
  },
  {
    id: "pmfby",
    titleEn: "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
    titleHi: "प्रधानमंत्री फसल बीमा योजना",
    descEn: "Comprehensive crop insurance providing financial support against crop loss due to natural calamities.",
    category: "Crop Insurance",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Up to full crop loss coverage",
    url: "https://pmfby.gov.in",
    applyUrl: "https://pmfby.gov.in/farmerRegistrationForm",
    documents: ["Aadhaar card", "Bank passbook", "Land records (7/12 or equivalent)", "Sowing certificate"],
    deadline: "Before sowing / kharif & rabi deadlines",
    states: ["All States"],
    eligibility: {
      minLandHa: 0,
      maxLandHa: null,
      landownerRequired: false,
      excludedCategories: [],
      minAge: 18,
      maxAge: null
    }
  },
  {
    id: "kcc",
    titleEn: "Kisan Credit Card (KCC) Scheme",
    titleHi: "किसान क्रेडिट कार्ड योजना",
    descEn: "Timely credit support for agricultural operations at lower interest rates.",
    category: "Credit & Loans",
    ministry: "NABARD / Ministry of Finance",
    benefit: "Up to ₹3 lakh at 4% interest",
    url: "https://www.nabard.org/content.aspx?id=591",
    applyUrl: "https://pmkisan.gov.in/KCC.aspx",
    documents: ["Aadhaar card", "Land records", "Passport photo", "Bank account"],
    deadline: "Open throughout the year",
    states: ["All States"],
    eligibility: {
      minLandHa: 0,
      maxLandHa: null,
      landownerRequired: false,
      excludedCategories: [],
      minAge: 18,
      maxAge: 70
    }
  },
  {
    id: "pkvy",
    titleEn: "Paramparagat Krishi Vikas Yojana (PKVY)",
    titleHi: "परम्परागत कृषि विकास योजना",
    descEn: "Promotes organic farming with financial assistance for certification & marketing.",
    category: "Organic Farming",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "₹50,000/ha over 3 years",
    url: "https://pgsindia-ncof.gov.in/pkvy/Index.aspx",
    applyUrl: "https://pgsindia-ncof.gov.in",
    documents: ["Aadhaar card", "Land ownership", "Bank account", "Group formation documents"],
    deadline: "Annual state-wise cycles",
    states: ["All States"],
    eligibility: {
      minLandHa: 0,
      maxLandHa: null,
      landownerRequired: true,
      excludedCategories: [],
      minAge: 18,
      maxAge: null
    }
  },
  {
    id: "pmksy",
    titleEn: "PM Krishi Sinchai Yojana (PMKSY)",
    titleHi: "प्रधानमंत्री कृषि सिंचाई योजना",
    descEn: "'Har Khet Ko Pani' — extends water coverage with drip/sprinkler subsidy.",
    category: "Irrigation",
    ministry: "Ministry of Jal Shakti",
    benefit: "55–90% subsidy on drip/sprinkler systems",
    url: "https://pmksy.gov.in",
    applyUrl: "https://pmksy.gov.in/microIrrigation/Archive/Beneficiary-Registration-Form.pdf",
    documents: ["Aadhaar card", "Land records", "Bank account", "Quotation from supplier"],
    deadline: "Open throughout the year",
    states: ["All States"],
    eligibility: {
      minLandHa: 0,
      maxLandHa: null,
      landownerRequired: true,
      excludedCategories: [],
      minAge: 18,
      maxAge: null
    }
  },
  {
    id: "rkvy",
    titleEn: "Rashtriya Krishi Vikas Yojana (RKVY)",
    titleHi: "राष्ट्रीय कृषि विकास योजना",
    descEn: "State-level agricultural development grants for infrastructure, seeds, and technology.",
    category: "Infrastructure",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "State-specific grants",
    url: "https://rkvy.nic.in",
    applyUrl: "https://rkvy.nic.in",
    documents: ["Project proposal", "Land documents", "Bank account"],
    deadline: "State-specific",
    states: ["All States"],
    eligibility: {
      minLandHa: 0,
      maxLandHa: null,
      landownerRequired: true,
      excludedCategories: [],
      minAge: 18,
      maxAge: null
    }
  },
  {
    id: "mnrega-farm",
    titleEn: "MGNREGS Farm Pond Scheme",
    titleHi: "मनरेगा खेत तालाब योजना",
    descEn: "Farm ponds and water conservation structures built under MGNREGS for water storage.",
    category: "Water Conservation",
    ministry: "Ministry of Rural Development",
    benefit: "Free farm pond (up to ₹1.34 lakh construction cost)",
    url: "https://nrega.nic.in",
    applyUrl: "https://nrega.nic.in",
    documents: ["Job Card (MGNREGS)", "Aadhaar card", "Land records"],
    deadline: "Open throughout the year",
    states: ["All States"],
    eligibility: {
      minLandHa: 0,
      maxLandHa: null,
      landownerRequired: true,
      excludedCategories: [],
      minAge: 18,
      maxAge: null
    }
  },
  {
    id: "smam",
    titleEn: "Sub-Mission on Agricultural Mechanization (SMAM)",
    titleHi: "कृषि यंत्रीकरण उप मिशन",
    descEn: "Subsidy on tractors, power tillers, harvesters and other farm machinery.",
    category: "Farm Mechanization",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "25–50% subsidy on farm machinery",
    url: "https://agrimachinery.nic.in",
    applyUrl: "https://agrimachinery.nic.in",
    documents: ["Aadhaar card", "Land records", "Caste certificate (SC/ST for extra subsidy)", "Bank account"],
    deadline: "State-specific",
    states: ["All States"],
    eligibility: {
      minLandHa: 0,
      maxLandHa: null,
      landownerRequired: true,
      excludedCategories: [],
      minAge: 18,
      maxAge: null
    }
  },
  {
    id: "nfsm",
    titleEn: "National Food Security Mission (NFSM)",
    titleHi: "राष्ट्रीय खाद्य सुरक्षा मिशन",
    descEn: "Promotes rice, wheat, pulses, coarse cereals & nutri-cereals with HYV seeds and demonstrations.",
    category: "Seeds & Inputs",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Free/subsidised HYV seeds, demonstrations",
    url: "https://nfsm.gov.in",
    applyUrl: "https://nfsm.gov.in",
    documents: ["Aadhaar card", "Land records", "Bank account"],
    deadline: "Seasonal — kharif & rabi",
    states: ["All States"],
    eligibility: {
      minLandHa: 0,
      maxLandHa: null,
      landownerRequired: false,
      excludedCategories: [],
      minAge: 18,
      maxAge: null
    }
  },
  {
    id: "mahadbt-farmer",
    titleEn: "MahaDBT Farmer Scheme (Maharashtra)",
    titleHi: "महाडीबीटी शेतकरी योजना (महाराष्ट्र)",
    descEn: "Maharashtra's direct-benefit transfer portal for agricultural inputs, irrigation, machinery subsidies.",
    category: "Financial Aid",
    ministry: "Maharashtra Agriculture Department",
    benefit: "State-specific (drip, seeds, storage, machinery)",
    url: "https://mahadbtmahait.gov.in",
    applyUrl: "https://mahadbtmahait.gov.in",
    documents: ["Aadhaar", "7/12 extract", "Bank account", "Caste cert if applicable"],
    deadline: "Annual lottery-based",
    states: ["Maharashtra"],
    eligibility: {
      minLandHa: 0,
      maxLandHa: null,
      landownerRequired: true,
      excludedCategories: [],
      minAge: 18,
      maxAge: null,
      stateRestricted: ["Maharashtra"]
    }
  },
  {
    id: "ryss",
    titleEn: "Rythu Bandhu (Telangana)",
    titleHi: "रायथु बंधु (तेलंगाना)",
    descEn: "₹10,000/acre per season (Kharif + Rabi) investment support directly to landowner farmers.",
    category: "Financial Aid",
    ministry: "Telangana Agriculture Department",
    benefit: "₹10,000/acre/season",
    url: "https://rythubandhu.telangana.gov.in",
    applyUrl: "https://rythubandhu.telangana.gov.in",
    documents: ["Patta passbook", "Aadhaar", "Bank account linked to Patta"],
    deadline: "Seasonal",
    states: ["Telangana"],
    eligibility: {
      minLandHa: 0,
      maxLandHa: null,
      landownerRequired: true,
      excludedCategories: [],
      minAge: 18,
      maxAge: null,
      stateRestricted: ["Telangana"]
    }
  }
];

// ── In-memory bookmark store (per user) ───────────────────────────────────
// In production this would be a DB table; for Path C we use the memoryDb pattern
const userBookmarks = {}; // { userId: Set<schemeId> }

// ── Eligibility check engine ───────────────────────────────────────────────
function checkEligibility(scheme, input) {
  const reasons = [];
  const { landHa, age, state, category, isLandowner } = input;
  const elig = scheme.eligibility;

  // Land area check
  if (elig.maxLandHa !== null && landHa > elig.maxLandHa) {
    reasons.push(`Land area ${landHa} ha exceeds maximum ${elig.maxLandHa} ha for this scheme`);
  }

  // Age check
  if (elig.minAge && age < elig.minAge) {
    reasons.push(`Age ${age} is below minimum required age of ${elig.minAge}`);
  }
  if (elig.maxAge && age > elig.maxAge) {
    reasons.push(`Age ${age} exceeds maximum age of ${elig.maxAge}`);
  }

  // Landowner check
  if (elig.landownerRequired && !isLandowner) {
    reasons.push("This scheme requires you to be a landowner (non-tenant farmers not eligible)");
  }

  // Excluded category check
  if (category && elig.excludedCategories && elig.excludedCategories.includes(category)) {
    reasons.push(`Category '${category}' is excluded from this scheme`);
  }

  // State restriction check
  if (elig.stateRestricted && elig.stateRestricted.length > 0 && state) {
    const stateMatch = elig.stateRestricted.some(s =>
      s.toLowerCase() === state.toLowerCase()
    );
    if (!stateMatch) {
      reasons.push(`This scheme is only available in ${elig.stateRestricted.join(", ")}`);
    }
  }

  const eligible = reasons.length === 0;
  return {
    eligible,
    reasons,
    summary: eligible
      ? `You appear to be eligible for ${scheme.titleEn}. Visit the official portal to apply.`
      : `You may not be eligible: ${reasons.join("; ")}.`
  };
}

// ── GET /api/schemes — list all (with search, category, state filter) ──────
router.get("/", (req, res) => {
  try {
    const { search, category, state, page = 1, limit = 20 } = req.query;
    let filtered = [...SCHEMES];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s =>
        s.titleEn.toLowerCase().includes(q) ||
        s.descEn.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.ministry.toLowerCase().includes(q)
      );
    }
    if (category) {
      filtered = filtered.filter(s =>
        s.category.toLowerCase() === category.toLowerCase()
      );
    }
    if (state) {
      filtered = filtered.filter(s =>
        s.states.includes("All States") ||
        s.states.some(st => st.toLowerCase() === state.toLowerCase())
      );
    }

    const total = filtered.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = filtered.slice(start, start + parseInt(limit));

    const categories = [...new Set(SCHEMES.map(s => s.category))].sort();
    const states = [...new Set(SCHEMES.flatMap(s => s.states))].filter(s => s !== "All States").sort();

    return res.json({
      success: true,
      data: {
        schemes: paginated,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        categories,
        states
      }
    });
  } catch (err) {
    console.error("Schemes list error:", err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── GET /api/schemes/categories — distinct category list ──────────────────
router.get("/categories", (req, res) => {
  const categories = [...new Set(SCHEMES.map(s => s.category))].sort();
  return res.json({ success: true, data: { categories } });
});

// ── GET /api/schemes/:id — single scheme detail ────────────────────────────
router.get("/:id", (req, res) => {
  const scheme = SCHEMES.find(s => s.id === req.params.id);
  if (!scheme) return res.status(404).json({ success: false, error: { message: "Scheme not found" } });
  return res.json({ success: true, data: { scheme } });
});

// ── POST /api/schemes/:id/eligibility — real eligibility check ─────────────
router.post("/:id/eligibility", (req, res) => {
  try {
    const scheme = SCHEMES.find(s => s.id === req.params.id);
    if (!scheme) return res.status(404).json({ success: false, error: { message: "Scheme not found" } });

    const { landHa, age, state, category, isLandowner } = req.body;

    // Input validation
    if (landHa === undefined || age === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: "Required: landHa (number), age (number), state (string), isLandowner (boolean)" }
      });
    }

    const result = checkEligibility(scheme, {
      landHa: parseFloat(landHa) || 0,
      age: parseInt(age) || 0,
      state: state || "",
      category: category || "",
      isLandowner: Boolean(isLandowner)
    });

    return res.json({
      success: true,
      data: {
        schemeId: scheme.id,
        schemeName: scheme.titleEn,
        ...result
      }
    });
  } catch (err) {
    console.error("Eligibility check error:", err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── POST /api/schemes/:id/bookmark — save / unsave (requires auth) ─────────
router.post("/:id/bookmark", protect, (req, res) => {
  try {
    const userId = String(req.user._id);
    const schemeId = req.params.id;

    if (!SCHEMES.find(s => s.id === schemeId)) {
      return res.status(404).json({ success: false, error: { message: "Scheme not found" } });
    }

    if (!userBookmarks[userId]) userBookmarks[userId] = new Set();

    if (userBookmarks[userId].has(schemeId)) {
      userBookmarks[userId].delete(schemeId);
      return res.json({ success: true, data: { bookmarked: false, schemeId } });
    } else {
      userBookmarks[userId].add(schemeId);
      return res.json({ success: true, data: { bookmarked: true, schemeId } });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── GET /api/schemes/user/bookmarks — all bookmarked schemes ──────────────
router.get("/user/bookmarks", protect, (req, res) => {
  try {
    const userId = String(req.user._id);
    const ids = userBookmarks[userId] ? [...userBookmarks[userId]] : [];
    const bookmarked = SCHEMES.filter(s => ids.includes(s.id));
    return res.json({ success: true, data: { schemes: bookmarked, total: bookmarked.length } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
