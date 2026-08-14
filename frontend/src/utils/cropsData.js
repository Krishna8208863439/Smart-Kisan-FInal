// 140 Crops List from the dataset (cleaned up by removing " plant")
export const RAW_CROPS = [
  "Aji pepper", "Almonds", "Amaranth", "Apples", "Artichoke", 
  "Avocados", "Açaí", "Bananas", "Barley", "Beets", 
  "Black pepper", "Blueberries", "Bok choy", "Brazil nuts", "Broccoli", 
  "Brussels sprout", "Buckwheat", "Cabbages and other brassicas", "Camucamu", "Carrots and turnips", 
  "Cashew nuts", "Cassava", "Cauliflower", "Celery", "Cherimoya", 
  "Cherry", "Chestnuts", "Chickpeas", "Chili peppers and green peppers", "Cinnamon", 
  "Cloves", "Cocoa beans", "Coconuts", "Coffee (green)", "Collards", 
  "Cotton lint", "Cranberries", "Cucumbers and gherkins", "Dates", "Dry beans", 
  "Dry peas", "Durian", "Eggplants (Aubergines)", "Endive", "Fava bean", 
  "Figs", "Flax fiber and tow", "Flaxseed (Linseed)", "Fonio", "Garlic", 
  "Ginger", "Gooseberries", "Grapes", "Groundnuts (Peanuts)", "Guarana", 
  "Guavas", "Hhabanero pepper", "Hazelnuts", "Hemp", "Hen eggs (shell weight)", 
  "Horseradish", "Jackfruit", "Jute", "Kale", "Kohlrabi", 
  "Leeks", "Lemons and limes", "Lentils", "Lettuce and chicory", "Lima bean", 
  "Longan", "Lupins", "Lychee", "Maize (Corn)", "Mandarins, clementines, satsumas", 
  "Mangoes, mangosteens, guavas", "Maracuja(Passionfruit)", "Millet", "Mint", 
  "Mung bean", "Mustard greens", "Mustard seeds", "Navy bean", "Oats", 
  "Oil palm fruit", "Okra", "Olives", "Onions (dry)", "Oranges", 
  "Oregano", "Papayas", "Parsley", "Peaches and nectarines", "Peas (Green)", 
  "Persimmons", "Pine nuts", "Pineapples", "Pinto bean", "Pistachios", 
  "Plantains", "Pomegranates", "Potatoes", "Pumpkins, squash and gourds", "Quinoa", 
  "Radishes and similar roots", "Rambutan", "Rapeseed (Canola)", "Raspberries", "Rice (Paddy)", 
  "Rosemary", "Rubber (natural)", "Rye", "Saffron", "Sage", 
  "Scallions", "Sorghum", "Soursop", "Soybeans", "Spinach", 
  "Starfruit", "Strawberries", "Sugar beet", "Sugar cane", "Sunflower seeds", 
  "Sweet potatoes", "Swiss chard", "Tamarind", "Taro (cocoyam)", "Tea", 
  "Teff", "Thyme", "Tomatoes", "Triticale", "Turmeric", 
  "Turnip greens", "Vanilla beans", "Walnuts", "Watermelons", "Wheat", 
  "Yams"
];

// Categorize crop and return metadata
export function getCropMetadata(cropName) {
  const name = (cropName || "").toLowerCase().trim();
  
  if (name.includes("pepper") || name.includes("chili") || name.includes("habanero") || name.includes("aji")) {
    return {
      category: "peppers",
      groupEn: "Peppers & Spices",
      groupMr: "मिरची आणि मसाले",
      soilEn: "Well-drained loamy soil, pH 6.0–6.8",
      soilMr: "उत्कृष्ट निचऱ्याची सुपीक पोयटा माती, सामू ६.०-६.८",
      seasonEn: "Kharif & Zaid (Warm climate)",
      seasonMr: "खरीप आणि उन्हाळी हंगाम (उबदार हवामान)",
      infoEn: "Requires consistent warmth, direct sunlight, and moderate watering. High risk of damping off and sucking pests.",
      infoMr: "सतत उबदार हवामान, थेट सूर्यप्रकाश आणि मध्यम पाणी आवश्यक. रोप कोलमडणे आणि रस शोषणाऱ्या किडींचा जास्त धोका असतो."
    };
  }
  
  if (name.includes("bean") || name.includes("pea") || name.includes("chickpea") || name.includes("lentil") || name.includes("lupin") || name.includes("soybean")) {
    return {
      category: "legumes",
      groupEn: "Pulses & Legumes",
      groupMr: "कडधान्ये आणि शेंगावर्गीय पिके",
      soilEn: "Sandy loam to clay loam, pH 6.0–7.5",
      soilMr: "वाळूमिश्रित पोयटा ते चिकणमाती, सामू ६.०-७.५",
      seasonEn: "Kharif or Rabi (depending on variety)",
      seasonMr: "खरीप किंवा रब्बी (जातीनुसार भिन्न)",
      infoEn: "Legumes fix atmospheric nitrogen. Avoid waterlogging and ensure phosphorus application at sowing.",
      infoMr: "शेंगावर्गीय पिके हवेतील नायट्रोजन जमिनीत स्थिरावतात. पाणी साचू देऊ नका आणि पेरणीच्या वेळी स्फुरद (फॉस्फरस) खत द्या."
    };
  }

  if (name.includes("wheat") || name.includes("rice") || name.includes("paddy") || name.includes("maize") || name.includes("corn") || name.includes("barley") || name.includes("oats") || name.includes("rye") || name.includes("millet") || name.includes("sorghum") || name.includes("teff") || name.includes("quinoa") || name.includes("triticale") || name.includes("buckwheat") || name.includes("amaranth")) {
    return {
      category: "cereals",
      groupEn: "Cereals & Grains",
      groupMr: "तृणधान्ये आणि कडधान्ये",
      soilEn: "Clayey loam to alluvial soil, pH 5.5–7.0",
      soilMr: "चिकणमाती ते गाळाची सुपीक माती, सामू ५.५-७.०",
      seasonEn: "Rabi (Wheat, Barley) / Kharif (Rice, Millet, Maize)",
      seasonMr: "रब्बी (गहू, बार्ली) / खरीप (भात, बाजरी, मका)",
      infoEn: "Staple grain crops. Require high nitrogen fertilization split-dosed during active vegetative and tillering stages.",
      infoMr: "मुख्य अन्नधान्य पिके. शाकीय वाढीच्या आणि फुटवे येण्याच्या अवस्थेत नायट्रोजन (युरिया) खताचे विभागून डोस देणे आवश्यक."
    };
  }

  if (name.includes("potato") || name.includes("yam") || name.includes("beet") || name.includes("carrot") || name.includes("turnip") || name.includes("radish") || name.includes("taro") || name.includes("cassava") || name.includes("sweet potato")) {
    return {
      category: "tubers",
      groupEn: "Tubers & Root Vegetables",
      groupMr: "कंदमुळे आणि मूळ भाज्या",
      soilEn: "Loose, sandy loam, deep tillable soil, pH 5.5–6.5",
      soilMr: "भुसभुशीत, खोल वाळूयुक्त पोयट्याची माती, सामू ५.५-६.५",
      seasonEn: "Rabi (Cool climate preferred)",
      seasonMr: "रब्बी (थंड हवामान अनुकूल)",
      infoEn: "Requires loose soil bed for healthy tuber expansion. Susceptible to soil-borne fungi and late blight.",
      infoMr: "कंदांच्या चांगल्या वाढीसाठी भुसभुशीत गादीवाफा आवश्यक. जमिनीतील बुरशी आणि करपा रोगाचा जास्त प्रादुर्भाव होतो."
    };
  }

  if (name.includes("apple") || name.includes("banana") || name.includes("cherry") || name.includes("grape") || name.includes("orange") || name.includes("lemon") || name.includes("lime") || name.includes("mandarin") || name.includes("clementine") || name.includes("satsuma") || name.includes("mango") || name.includes("papaya") || name.includes("peach") || name.includes("pear") || name.includes("plum") || name.includes("apricot") || name.includes("avocado") || name.includes("fig") || name.includes("date") || name.includes("pineapple") || name.includes("pomegranate") || name.includes("watermelon") || name.includes("melon") || name.includes("lychee") || name.includes("longan") || name.includes("durian") || name.includes("jackfruit") || name.includes("rambutan") || name.includes("starfruit") || name.includes("soursop") || name.includes("cherimoya") || name.includes("camucamu") || name.includes("maracuja") || name.includes("blueberry") || name.includes("cranberry") || name.includes("gooseberry") || name.includes("raspberry") || name.includes("strawberry") || name.includes("açaí")) {
    return {
      category: "fruits",
      groupEn: "Fruits & Orchards",
      groupMr: "फळबागा व फळे",
      soilEn: "Deep loamy, rich organic soil, pH 6.0–7.5",
      soilMr: "सेंद्रिय पदार्थांनी समृद्ध खोल पोयटा माती, सामू ६.०-७.५",
      seasonEn: "Perennial / Annual crop cycles",
      seasonMr: "बहुवार्षिक / वार्षिक पीक चक्रे",
      infoEn: "Requires pruning, micronutrient sprays (Boron, Zinc), and clean weeding. Prone to anthracnose fruit spot and powdery mildew.",
      infoMr: "वेळोवेळी छाटणी, सूक्ष्म अन्नद्रव्ये (बोरॉन, जस्त) फवारणी आवश्यक. फळांवरील करपा आणि भुरी रोगाचा जास्त धोका असतो."
    };
  }

  if (name.includes("mint") || name.includes("oregano") || name.includes("parsley") || name.includes("rosemary") || name.includes("sage") || name.includes("thyme") || name.includes("basil") || name.includes("cinnamon") || name.includes("clove") || name.includes("turmeric") || name.includes("ginger") || name.includes("saffron") || name.includes("vanilla")) {
    return {
      category: "herbs",
      groupEn: "Herbs & Spices",
      groupMr: "औषधी वनस्पती व मसाले",
      soilEn: "Humus-rich loamy soil, good drainage, pH 6.0–7.0",
      soilMr: "सेंद्रिय खतयुक्त पोयट्याची माती, चांगला निचरा, सामू ६.०-७.०",
      seasonEn: "Kharif planting (Turmeric, Ginger) / Perennial",
      seasonMr: "खरीप लागवड (हळद, आले) / बहुवार्षिक",
      infoEn: "High value crop requiring partial shade or controlled moisture. Root rot is a major threat in waterlogged fields.",
      infoMr: "अंशतः सावली किंवा नियंत्रित ओलावा आवश्यक असणारे महागडे पीक. पाणी साचल्यास कंदकुज किंवा मूळकुज रोगाचा मोठा धोका असतो."
    };
  }

  if (name.includes("cabbage") || name.includes("broccoli") || name.includes("cauliflower") || name.includes("brussels") || name.includes("kale") || name.includes("collards") || name.includes("spinach") || name.includes("lettuce") || name.includes("endive") || name.includes("swiss chard") || name.includes("bok choy")) {
    return {
      category: "leafy",
      groupEn: "Leafy Vegetables",
      groupMr: "पालेभाज्या",
      soilEn: "Silt loam to clay loam, rich in organic matter, pH 6.0–7.0",
      soilMr: "गाळाची सुपीक मध्यम ते भारी माती, भरपूर सेंद्रिय कर्ब, सामू ६.०-७.०",
      seasonEn: "Rabi & late winter",
      seasonMr: "रब्बी आणि हिवाळी हंगाम",
      infoEn: "Fast growing. Needs high nitrogen inputs and frequent light irrigations. Susceptible to caterpillars and aphids.",
      infoMr: "जलद वाढणारे पीक. जास्त नायट्रोजन आणि वारंवार हलके पाणी देणे आवश्यक. अळ्या आणि मावा किडीचा जास्त प्रादुर्भाव होतो."
    };
  }

  if (name.includes("almond") || name.includes("cashew") || name.includes("walnut") || name.includes("chestnut") || name.includes("pistachio") || name.includes("hazelnut") || name.includes("brazil nut") || name.includes("pine nut") || name.includes("coconut") || name.includes("oil palm") || name.includes("sunflower") || name.includes("rapeseed") || name.includes("canola") || name.includes("flaxseed") || name.includes("linseed")) {
    return {
      category: "nuts",
      groupEn: "Nuts & Oilseeds",
      groupMr: "तेलबिया आणि नट्स पिके",
      soilEn: "Sandy loam, deep gravelly well-drained soil, pH 6.0–7.5",
      soilMr: "वाळूमिश्रित किंवा मुरमाड निचऱ्याची खोल जमीन, सामू ६.०-७.५",
      seasonEn: "Annual / Perennial plantation cycles",
      seasonMr: "वार्षिक / बहुवार्षिक लागवड चक्र",
      infoEn: "Requires dry harvest period. Adequate potassium is critical for nut filling and oil yield parameters.",
      infoMr: "काढणीच्या वेळी कोरडे हवामान आवश्यक. नट्स भरण्यासाठी आणि तेलाचे प्रमाण वाढवण्यासाठी पोटॅश खत महत्त्वाचे ठरते."
    };
  }

  // Default: General Cash Crops/Vegetables (Okra, Eggplant, Cotton, Sugarcane, Tea, Coffee, Rubber)
  return {
    category: "general",
    groupEn: "General Cash Crops",
    groupMr: "नगदी पिके आणि भाजीपाला",
    soilEn: "Medium black soil to clay loam, pH 6.0–7.8",
    soilMr: "मध्यम काळी ते पोयटा चिकणमाती, सामू ६.०-७.८",
    seasonEn: "Kharif / Rabi long-duration crop",
    seasonMr: "खरीप / रब्बी यांत्रिक पद्धतीने लागवड केलेले पीक",
    infoEn: "Commercial crops. Require high inputs, balanced NPK application, and integrated pest management (IPM).",
    infoMr: "व्यावसायिक पिके. जास्त खतांची मात्रा, संतुलित एनपीके आणि एकात्मिक कीड व्यवस्थापन (IPM) आवश्यक."
  };
}

// Generate localized crop fallback disease diagnostics
export function getCropDiseaseFallback(cropName, language = "en") {
  const metadata = getCropMetadata(cropName);
  const cleanName = cropName.replace(" plant", "").replace(" (Paddy)", "").replace(" (Corn)", "").trim();

  const fallbacks = {
    peppers: {
      diseaseEn: "Anthracnose Fruit Spot (Colletotrichum capsici)",
      diseaseMr: "फळांवरील करपा रोग (अँथ्रॅकनोज)",
      severity: "high",
      adviceEn: "Dry brown lesions on leaves and sunken black circular spots on fruit. Spray Mancozeb 75 WP (2 g/L) or Carbendazim 50 WP (1 g/L) at fruit development. Destroy affected fruits. Rotate crops next season.",
      adviceMr: "पानांवर कोरडे तपकिरी ठिपके आणि फळांवर खोल काळे वर्तुळाकार चट्टे पडतात. फळधारणेच्या वेळी मॅन्कोझेब ७५ डब्ल्यूपी (२ ग्रॅम/लीटर) किंवा कार्बेन्डाझिम ५० डब्ल्यूपी (१ ग्रॅम/लीटर) फवारा. बाधित फळे नष्ट करा."
    },
    legumes: {
      diseaseEn: "Root Rot & Wilt Complex (Fusarium oxysporum)",
      diseaseMr: "मूळकुज आणि मर रोग (फ्युसेरिअम)",
      severity: "high",
      adviceEn: "Yellowing leaves followed by sudden wilting of plant. Drench soil with Copper Oxychloride 50 WP (3 g/L) or Carbendazim (2 g/L). Treat seeds with Trichoderma viride bio-agent (4 g/kg seed) before sowing.",
      adviceMr: "पाने पिवळी पडतात आणि झाड अचानक वाळते. कॉपर ऑक्सीक्लोराईड ५० डब्ल्यूपी (३ ग्रॅम/लीटर) किंवा कार्बेन्डाझिम (२ ग्रॅम/लीटर) मुळाशी टाका. पेरणीपूर्वी ट्रायकोडर्मा विरिडीची बीजप्रक्रिया करा."
    },
    cereals: {
      diseaseEn: "Leaf Blast & Stem Rust (Magnaporthe / Puccinia)",
      diseaseMr: "तपकिरी करपा आणि तांबेरा रोग",
      severity: "high",
      adviceEn: "Spindle-shaped grey lesions on leaves or rust pustules on stems. Spray Tricyclazole 75 WP (0.6 g/L) or Propiconazole 25 EC (1 ml/L). Avoid excess nitrogen (Urea) application during cloudy days.",
      adviceMr: "पानांवर जहाजाच्या आकाराचे राखाडी ठिपके किंवा खोडावर तांबूस रंगाचे पुळ्या येतात. ट्रायसायक्लॅझोल ७५ डब्ल्यूपी (०.६ ग्रॅम/लीटर) किंवा प्रोपिकोनाझोल २५ ईसी (१ मिली/लीटर) फवारा. ढगाळ हवामानात जास्त युरिया देणे टाळा."
    },
    tubers: {
      diseaseEn: "Early & Late Blight (Alternaria / Phytophthora)",
      diseaseMr: "लवकर आणि उशिरा येणारा करपा रोग",
      severity: "high",
      adviceEn: "Dark targets-board spots or water-soaked lesions with white mold on leaf undersides. Spray Cymoxanil 8% + Mancozeb 64% WP (3 g/L) or Metalaxyl 8% + Mancozeb 64% (2.5 g/L). Avoid overhead irrigation.",
      adviceMr: "पानांच्या खालच्या बाजूस राखाडी पाण्याचे डाग आणि पांढरी बुरशी दिसते. सायकॉक्झानिल ८% + मॅन्कोझेब ६४% डब्ल्यूपी (३ ग्रॅम/लीटर) किंवा मेटलॅक्सिल + मॅन्कोझेब (२.५ ग्रॅम/लीटर) फवारा."
    },
    fruits: {
      diseaseEn: "Anthracnose & Fruit Rot (Colletotrichum gloeosporioides)",
      diseaseMr: "फळांवरील करपा आणि कुजणे",
      severity: "medium",
      adviceEn: "Sunken dark spots on fruits and leaf necrosis. Spray Carbendazim 50 WP (1 g/L) or Copper Oxychloride 50 WP (3 g/L) at fruit set. Harvest and prune dead twigs during winter. Clean fruit beds.",
      adviceMr: "फळांवर काळे डाग पडतात आणि फळे मऊ होऊन कुजतात. फळधारणेदरम्यान कार्बेन्डाझिम ५० डब्ल्यूपी (१ ग्रॅम/लीटर) किंवा कॉपर ऑक्सीक्लोराईड ५० डब्ल्यूपी (३ ग्रॅम/लीटर) फवारा. झाडांची वाळलेली अंगे छाटून टाका."
    },
    herbs: {
      diseaseEn: "Leaf Blight & Rhizome Rot (Pythium aphanidermatum)",
      diseaseMr: "पाने करपणे आणि कंदकुज रोग",
      severity: "high",
      adviceEn: "Water-soaked lesions on leaf borders, yellowing, and decay of underground parts. Drench bed with Metalaxyl + Mancozeb (2.5 g/L). Ensure proper soil aeration and prevent soil waterlogging.",
      adviceMr: "पानांच्या कडा करपतात, पाने पिवळी पडतात आणि जमिनीतील आले/हळद कुजते. गादीवाफ्यावर मेटलॅक्सिल + मॅन्कोझेब (२.५ ग्रॅम/लीटर) टाका. शेतात पाणी साचू न देता पाण्याचा निचरा करा."
    },
    leafy: {
      diseaseEn: "Downy Mildew & Bacterial Leaf Spot",
      diseaseMr: "केवडा (डाउनी मिल्ड्यू) आणि जिवाणूजन्य ठिपके",
      severity: "medium",
      adviceEn: "Yellow patches on upper leaf surfaces and purplish mold growth underneath. Spray Copper Hydroxide 77 WP (2 g/L) or Ridomil Gold (2 g/L). Avoid harvesting within 10 days of spray.",
      adviceMr: "पानांच्या वरच्या भागावर पिवळे चट्टे आणि खालच्या बाजूस जांभळट रंगाची बुरशी येते. कॉपर हायड्रॉक्साइड ७७ डब्ल्यूपी (२ ग्रॅम/लीटर) किंवा रिडोमिल गोल्ड (२ ग्रॅम/लीटर) फवारा. फवारणीनंतर १० दिवस काढणी करू नका."
    },
    nuts: {
      diseaseEn: "Stem Bleeding & Bud Rot (Thielaviopsis / Phytophthora)",
      diseaseMr: "खोडाची सड आणि शेंडा कुजणे",
      severity: "high",
      adviceEn: "Reddish brown fluid bleeding from trunk or rotting of palm heart. Apply Bordeaux paste (10%) on bleeding patches. Spray Copper Oxychloride 50 WP (3 g/L) on crown regions. Improve field drainage.",
      adviceMr: "खोडातून लालसर तपकिरी स्राव वाहतो किंवा शेंडा कुजतो. स्राव वाहणाऱ्या जागी बोर्डो पेस्ट (१०%) लावा. शेंड्यावर कॉपर ऑक्सीक्लोराईड ५० डब्ल्यूपी (३ ग्रॅम/लीटर) औषध फवारा."
    },
    general: {
      diseaseEn: "Leaf Spot & Mosaic Virus Complex",
      diseaseMr: "पानावरील ठिपके आणि मोझॅक व्हायरस",
      severity: "medium",
      adviceEn: "Mottled yellow-green leaves and crinkling. Vector-borne (Aphids/Whitefly). Spray Acetamiprid 20 SP (0.3 g/L) or Dimethoate 30 EC (2 ml/L) to control vectors. Remove and burn heavily infected plants.",
      adviceMr: "पानांवर पिवळे-हिरवे चट्टे पडून पाने आकसतात. पांढरी माशी किंवा मावा या किडींद्वारे प्रसार होतो. कीड नियंत्रणासाठी ॲसिटामिप्रीड २० एसपी (०.३ ग्रॅम/लीटर) फवारा. बाधित रोपे उपटून नष्ट करा."
    }
  };

  const groupData = fallbacks[metadata.category] || fallbacks.general;
  
  return {
    crop: cleanName,
    disease: language === "mr" ? groupData.diseaseMr : groupData.diseaseEn,
    severity: groupData.severity,
    confidence: 0.55,
    advice: language === "mr" ? groupData.adviceMr : groupData.adviceEn,
    gemini_powered: false,
    ai_model: "Offline Reference Database",
    image_analysis: language === "mr"
      ? `सर्व्हर ऑफलाइन आहे. ${cleanName} साठी स्थानिक डेटाबेसमधून अचूक संदर्भ सल्ला लोड केला आहे.`
      : `Server offline. Local dataset reference disease advice loaded for ${cleanName}.`
  };
}
