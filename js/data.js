const MEAL_DATABASE = [
  // Breakfasts
  {
    id: "b1",
    name: "Idli with Podi & Sambar",
    type: "breakfast",
    tags: ["veg", "south-indian"],
    effort: 1,
    time: 15,
    ingredients: [
      { name: "Idli Batter", qty: 250, unit: "ml" },
      { name: "Idli Podi / Ghee", qty: 2, unit: "tbsp" },
      { name: "Mixed Dal Sambar", qty: 200, unit: "ml" }
    ],
    prepNote: "Use pre-fermented batter. Sambar cooked in batch."
  },
  {
    id: "b2",
    name: "Crispy Dosa with Coconut Chutney",
    type: "breakfast",
    tags: ["veg", "south-indian"],
    effort: 1,
    time: 15,
    ingredients: [
      { name: "Dosa Batter", qty: 250, unit: "ml" },
      { name: "Fresh Grated Coconut", qty: 0.5, unit: "cup" },
      { name: "Green Chillies", qty: 2, unit: "pcs" }
    ],
    prepNote: "Grind fresh coconut chutney while tawa heats up."
  },
  {
    id: "b3",
    name: "Vegetable Rava Upma",
    type: "breakfast",
    tags: ["veg", "south-indian"],
    effort: 1,
    time: 20,
    ingredients: [
      { name: "Roasted Sooji / Rava", qty: 1, unit: "cup" },
      { name: "Diced Carrots & Beans", qty: 0.5, unit: "cup" },
      { name: "Mustard & Curry Leaves", qty: 1, unit: "tsp" }
    ],
    prepNote: "Pre-roast rava during weekend batch prep."
  },
  {
    id: "b4",
    name: "Egg Bhurji with Multigrain Toast",
    type: "breakfast",
    tags: ["non-veg"],
    effort: 1,
    time: 15,
    ingredients: [
      { name: "Eggs", qty: 2, unit: "pcs" },
      { name: "Onion & Tomato", qty: 1, unit: "each" },
      { name: "Multigrain Bread", qty: 2, unit: "slices" }
    ],
    prepNote: "Whisk eggs with turmeric and ground black pepper."
  },
  {
    id: "b5",
    name: "Ven Pongal & Coconut Chutney",
    type: "breakfast",
    tags: ["veg", "south-indian"],
    effort: 2,
    time: 25,
    ingredients: [
      { name: "Raw Rice & Moong Dal", qty: 1, unit: "cup" },
      { name: "Black Pepper & Cumin", qty: 1, unit: "tbsp" },
      { name: "Cashews & Pure Ghee", qty: 2, unit: "tbsp" }
    ],
    prepNote: "Pressure cook dal and rice together."
  },

  // Lunches
  {
    id: "l1",
    name: "Drumstick Sambar Rice & Potato Roast",
    type: "lunch",
    tags: ["veg", "south-indian"],
    effort: 2,
    time: 30,
    ingredients: [
      { name: "Toor Dal", qty: 0.75, unit: "cup" },
      { name: "Drumstick & Shallots", qty: 150, unit: "g" },
      { name: "Potatoes", qty: 2, unit: "pcs" },
      { name: "Ponni Boiled Rice", qty: 1.5, unit: "cups" }
    ],
    prepNote: "Boil potatoes and peel on Sunday night."
  },
  {
    id: "l2",
    name: "Pepper Chicken Masala with Steamed Rice",
    type: "lunch",
    tags: ["non-veg", "south-indian"],
    effort: 2,
    time: 25,
    ingredients: [
      { name: "Chicken (Curry Cut)", qty: 350, unit: "g" },
      { name: "Crushed Black Pepper", qty: 1.5, unit: "tbsp" },
      { name: "Curry Leaves & Onions", qty: 2, unit: "pcs" },
      { name: "Ponni Boiled Rice", qty: 1.5, unit: "cups" }
    ],
    prepNote: "Keep chicken marinated in pepper, curd, and salt."
  },
  {
    id: "l3",
    name: "Curd Rice with Lemon Pickle & Pomegranate",
    type: "lunch",
    tags: ["veg", "south-indian"],
    effort: 1,
    time: 15,
    ingredients: [
      { name: "Cooked Rice", qty: 2, unit: "cups" },
      { name: "Fresh Thick Curd", qty: 1.5, unit: "cups" },
      { name: "Pomegranate Arils", qty: 0.25, unit: "cup" },
      { name: "Mustard Tempering", qty: 1, unit: "tsp" }
    ],
    prepNote: "Mash warm rice with a splash of milk before adding curd."
  },
  {
    id: "l4",
    name: "Fish Curry (Meen Kulambu) & Rice",
    type: "lunch",
    tags: ["non-veg", "south-indian"],
    effort: 3,
    time: 35,
    ingredients: [
      { name: "Fish Steaks", qty: 300, unit: "g" },
      { name: "Tamarind Pulp", qty: 2, unit: "tbsp" },
      { name: "Shallots & Fenugreek", qty: 100, unit: "g" },
      { name: "Ponni Boiled Rice", qty: 1.5, unit: "cups" }
    ],
    prepNote: "Extract tamarind pulp ahead of time."
  },
  {
    id: "l5",
    name: "Cabbage Chana Dal Kootu & Rasam",
    type: "lunch",
    tags: ["veg", "south-indian"],
    effort: 1,
    time: 20,
    ingredients: [
      { name: "Cabbage (Shredded)", qty: 200, unit: "g" },
      { name: "Chana Dal", qty: 0.5, unit: "cup" },
      { name: "Rasam Powder & Tomatoes", qty: 2, unit: "pcs" }
    ],
    prepNote: "Pre-chop cabbage into airtight containers."
  },

  // Dinners
  {
    id: "d1",
    name: "Phulka with Paneer Butter Masala",
    type: "dinner",
    tags: ["veg"],
    effort: 2,
    time: 25,
    ingredients: [
      { name: "Whole Wheat Atta", qty: 1.5, unit: "cups" },
      { name: "Paneer Cubes", qty: 200, unit: "g" },
      { name: "Tomato Puree & Kasuri Methi", qty: 1, unit: "cup" }
    ],
    prepNote: "Keep kneaded atta rested in airtight box."
  },
  {
    id: "d2",
    name: "Egg Kothu Parotta (Street Style)",
    type: "dinner",
    tags: ["non-veg", "south-indian"],
    effort: 2,
    time: 20,
    ingredients: [
      { name: "Shredded Parottas", qty: 3, unit: "pcs" },
      { name: "Eggs", qty: 2, unit: "pcs" },
      { name: "Salna / Chicken Gravy", qty: 0.5, unit: "cup" }
    ],
    prepNote: "Shred parottas and keep leftover salna ready."
  },
  {
    id: "d3",
    name: "Crispy Rava Dosa with Tomato-Garlic Chutney",
    type: "dinner",
    tags: ["veg", "south-indian"],
    effort: 1,
    time: 20,
    ingredients: [
      { name: "Sooji & Rice Flour Mix", qty: 1, unit: "cup" },
      { name: "Cumin & Green Chillies", qty: 1, unit: "tbsp" },
      { name: "Tomatoes & Garlic", qty: 3, unit: "cloves" }
    ],
    prepNote: "Instant thin batter mix - no fermentation required."
  },
  {
    id: "d4",
    name: "Grilled Chicken Strips with Mint Dressing",
    type: "dinner",
    tags: ["non-veg"],
    effort: 1,
    time: 15,
    ingredients: [
      { name: "Chicken Breast Strips", qty: 250, unit: "g" },
      { name: "Cucumber & Cherry Tomatoes", qty: 1, unit: "cup" },
      { name: "Hung Curd & Mint Sauce", qty: 3, unit: "tbsp" }
    ],
    prepNote: "Chicken pre-boiled or baked in batch."
  }
];

const SUNDAY_PREP_ROUTINE = [
  { task: "Ferment Dosa/Idli Batter", detail: "Grind or unpack 2kg batter into two distinct airtight boxes." },
  { task: "Boil & Peel Potatoes", detail: "Pressure-cook 6 medium potatoes; store unmashed with skin off." },
  { task: "Chop Aromatics", detail: "Dice 1kg onions and mince 200g garlic/ginger in food processor." },
  { task: "Roast Rava & Nuts", detail: "Dry-roast 500g rava with mustard seeds and cashews for instant upma." },
  { task: "Batch Tamarind & Tomato Paste", detail: "Cook down 400g crushed tomatoes with turmeric for rasam/curry bases." }
];
