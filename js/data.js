// ============================================================
// BUSYWOMEN COOK SCHEDULE — DATA
// effort: 1 = easy/quick, 2 = moderate, 3 = weekend style
// ingredients: quantities are for a 2-person base serving;
// the grocery aggregator scales these by the portion selector.
// ============================================================

const CONFIG = {
  amazonTag: "kingcloud-21",
  amazonDomain: "amazon.in",
  // Feedback address is stored encoded so it is not sitting in plain text in the source.
  feedbackEmailB64: "bWFzc2tpbmdzbGluQHlhaG9vLmNvbQ==",
  // Optional but recommended: a free Web3Forms access key (web3forms.com). When set, feedback is
  // delivered to your inbox WITHOUT ever exposing your email address to visitors.
  web3formsKey: "",
  gaMeasurementId: "G-XXXXXXXXXX"
};

const DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const CAT_LABEL = { "veg":"Veg", "non-veg":"Non-veg", "south-indian":"South Indian" };
const PEPPER = { 1:"🌶", 2:"🌶🌶", 3:"🌶🌶🌶" };

// ---------------- GROCERY PACK CATALOG ----------------
// Maps each ingredient (by exact name, as used above) to the smallest realistic
// Amazon pantry/grocery pack for it. "perPack" is expressed in the ingredient's
// own recipe unit (cup/tbsp/tsp/g/pcs/leaves/slices) so the grocery list can do
// packsNeeded = ceil(totalRecipeQty / perPack) without any further conversion.
// This is what lets "you need 2.3 cups of rice" become "buy 1 × 1 kg pack".
const PACK_CATALOG = {
  // ---- staples sold by weight, measured in cups (grams-per-cup baked into perPack) ----
  "Basmati rice":            { perPack: 5,    label: "1 kg pack", priceINR: 120, aisle: "Grains & Pulses" },
  "Toor dal":                { perPack: 5,    label: "1 kg pack", priceINR: 160, aisle: "Grains & Pulses" },
  "Urad dal":                { perPack: 5,    label: "1 kg pack", priceINR: 150, aisle: "Grains & Pulses" },
  "Moong dal":               { perPack: 5,    label: "1 kg pack", priceINR: 140, aisle: "Grains & Pulses" },
  "Rajma (kidney beans)":    { perPack: 5,    label: "1 kg pack", priceINR: 150, aisle: "Grains & Pulses" },
  "Kabuli chana (chickpeas)":{ perPack: 5.25, label: "1 kg pack", priceINR: 110, aisle: "Grains & Pulses" },
  "Mixed dals":              { perPack: 5,    label: "1 kg pack", priceINR: 150, aisle: "Grains & Pulses" },
  "Mixed lentils (adai mix)":{ perPack: 5,    label: "1 kg pack", priceINR: 150, aisle: "Grains & Pulses" },
  "Idli rice":               { perPack: 5,    label: "1 kg pack", priceINR: 70, aisle: "Grains & Pulses" },
  "Dosa rice":               { perPack: 5,    label: "1 kg pack", priceINR: 70, aisle: "Grains & Pulses" },
  "Raw rice":                { perPack: 5,    label: "1 kg pack", priceINR: 65, aisle: "Grains & Pulses" },
  "Whole wheat atta":        { perPack: 8.3,  label: "1 kg pack", priceINR: 55, aisle: "Grains & Pulses" },
  "Maida flour":             { perPack: 8.3,  label: "1 kg pack", priceINR: 50, aisle: "Grains & Pulses" },
  "Besan (gram flour)":      { perPack: 4.2,  label: "500 g pack", priceINR: 65, aisle: "Grains & Pulses" },
  "Broken wheat daliya":     { perPack: 2.8,  label: "500 g pack", priceINR: 55, aisle: "Grains & Pulses" },
  "Rava (semolina)":         { perPack: 6.25, label: "1 kg pack", priceINR: 55, aisle: "Grains & Pulses" },
  "Poha (flattened rice)":   { perPack: 10,   label: "500 g pack", priceINR: 45, aisle: "Grains & Pulses" },
  "Rice flour (appam)":      { perPack: 3.3,  label: "500 g pack", priceINR: 45, aisle: "Grains & Pulses" },
  "Rice flour (idiyappam)":  { perPack: 3.3,  label: "500 g pack", priceINR: 45, aisle: "Grains & Pulses" },
  "Rice flour coating":      { perPack: 3.3,  label: "500 g pack", priceINR: 45, aisle: "Grains & Pulses" },
  "Naan flour mix":          { perPack: 4.2,  label: "500 g pack", priceINR: 70, aisle: "Grains & Pulses" },
  "Dosa batter mix":         { perPack: 4.2,  label: "1 kg tetra pack", priceINR: 90, aisle: "Grains & Pulses" },
  "Mixed vegetables":        { perPack: 3.3,  label: "500 g pack", priceINR: 60, aisle: "Vegetables & Produce" },
  "Coconut":                 { perPack: 2.5,  label: "200 g frozen grated pack", priceINR: 60, aisle: "Vegetables & Produce" },
  "Coconut milk":            { perPack: 1.67, label: "400 ml tetra pack", priceINR: 60, aisle: "Pantry, Oils & Sauces" },
  "Chicken stock":           { perPack: 4.2,  label: "1 L tetra pack", priceINR: 150, aisle: "Pantry, Oils & Sauces" },
  "Curd":                    { perPack: 1.6,  label: "400 g cup", priceINR: 40, aisle: "Dairy & Paneer" },
  "Tomato puree":            { perPack: 0.82, label: "200 g tetra pack", priceINR: 40, aisle: "Pantry, Oils & Sauces" },
  "Onion tomato masala":     { perPack: 1,    label: "250 g pack", priceINR: 60, aisle: "Pantry, Oils & Sauces" },
  "Salad greens":            { perPack: 2.5,  label: "100 g pack", priceINR: 40, aisle: "Vegetables & Produce" },

  // ---- spice powders / masalas / pastes, measured in tbsp ----
  "Biryani masala":          { perPack: 6.7,  label: "100 g pack", priceINR: 90, aisle: "Spices & Masalas" },
  "Bisi bele bath powder":   { perPack: 13.3, label: "200 g pack", priceINR: 110, aisle: "Spices & Masalas" },
  "Chettinad masala":        { perPack: 6.7,  label: "100 g pack", priceINR: 90, aisle: "Spices & Masalas" },
  "Chole masala":            { perPack: 6.7,  label: "100 g pack", priceINR: 80, aisle: "Spices & Masalas" },
  "Rasam powder":            { perPack: 13.3, label: "200 g pack", priceINR: 100, aisle: "Spices & Masalas" },
  "Sambar powder":           { perPack: 13.3, label: "200 g pack", priceINR: 100, aisle: "Spices & Masalas" },
  "Spice masala":            { perPack: 6.7,  label: "100 g pack", priceINR: 85, aisle: "Spices & Masalas" },
  "Butter":                  { perPack: 7.1,  label: "100 g pack", priceINR: 60, aisle: "Dairy & Paneer" },
  "Fresh cream":             { perPack: 13.3, label: "200 ml pack", priceINR: 55, aisle: "Dairy & Paneer" },
  "Ghee":                    { perPack: 33.3, label: "500 g jar", priceINR: 320, aisle: "Dairy & Paneer" },
  "Ginger":                  { perPack: 13.3, label: "200 g pack", priceINR: 50, aisle: "Vegetables & Produce" },
  "Ginger garlic paste":     { perPack: 13.3, label: "200 g jar", priceINR: 70, aisle: "Spices & Masalas" },
  "Mayonnaise":              { perPack: 16.7, label: "250 g jar", priceINR: 110, aisle: "Pantry, Oils & Sauces" },
  "Olive oil":               { perPack: 35.7, label: "500 ml bottle", priceINR: 450, aisle: "Pantry, Oils & Sauces" },
  "Peanuts":                 { perPack: 20,   label: "200 g pack", priceINR: 60, aisle: "Pantry, Oils & Sauces" },
  "Soy sauce":               { perPack: 13.3, label: "200 ml bottle", priceINR: 90, aisle: "Pantry, Oils & Sauces" },
  "Tamarind":                { perPack: 13.3, label: "200 g pack", priceINR: 45, aisle: "Spices & Masalas" },

  // ---- small-quantity spices, measured in tsp ----
  "Black pepper":            { perPack: 20,   label: "100 g pack", priceINR: 110, aisle: "Spices & Masalas" },
  "Cumin seeds":             { perPack: 20,   label: "100 g pack", priceINR: 70, aisle: "Spices & Masalas" },
  "Fenugreek seeds":         { perPack: 20,   label: "100 g pack", priceINR: 55, aisle: "Spices & Masalas" },
  "Garam masala":            { perPack: 20,   label: "100 g pack", priceINR: 75, aisle: "Spices & Masalas" },
  "Mustard seeds":           { perPack: 20,   label: "100 g pack", priceINR: 45, aisle: "Spices & Masalas" },
  "Whole garam masala":      { perPack: 20,   label: "100 g pack", priceINR: 90, aisle: "Spices & Masalas" },

  // ---- meat / seafood / paneer, already measured in grams ----
  "Chicken":                 { perPack: 500,  label: "500 g pack", priceINR: 160, aisle: "Meat, Fish & Seafood" },
  "Chicken breast":          { perPack: 500,  label: "500 g pack", priceINR: 190, aisle: "Meat, Fish & Seafood" },
  "Chicken curry cut":       { perPack: 500,  label: "500 g pack", priceINR: 160, aisle: "Meat, Fish & Seafood" },
  "Chicken pieces":          { perPack: 500,  label: "500 g pack", priceINR: 160, aisle: "Meat, Fish & Seafood" },
  "Minced mutton keema":     { perPack: 500,  label: "500 g pack", priceINR: 320, aisle: "Meat, Fish & Seafood" },
  "Mutton curry cut":        { perPack: 500,  label: "500 g pack", priceINR: 350, aisle: "Meat, Fish & Seafood" },
  "Fish fillet":             { perPack: 500,  label: "500 g pack", priceINR: 220, aisle: "Meat, Fish & Seafood" },
  "Prawns":                  { perPack: 500,  label: "500 g pack", priceINR: 280, aisle: "Meat, Fish & Seafood" },
  "Paneer":                  { perPack: 200,  label: "200 g pack", priceINR: 90, aisle: "Dairy & Paneer" },
  "Spinach":                 { perPack: 250,  label: "250 g bunch/pack", priceINR: 30, aisle: "Vegetables & Produce" },

  // ---- produce sold by weight, measured in pcs (grams-per-piece baked in) ----
  "Onion":                   { perPack: 6.7,  label: "1 kg bag", priceINR: 40, aisle: "Vegetables & Produce" },
  "Potatoes":                { perPack: 6.7,  label: "1 kg bag", priceINR: 35, aisle: "Vegetables & Produce" },
  "Tomato":                  { perPack: 4.2,  label: "500 g pack", priceINR: 30, aisle: "Vegetables & Produce" },
  "Capsicum":                { perPack: 3.3,  label: "500 g pack", priceINR: 45, aisle: "Vegetables & Produce" },
  "Brinjal (eggplant)":      { perPack: 2.8,  label: "500 g pack", priceINR: 35, aisle: "Vegetables & Produce" },
  "Green chilli":            { perPack: 12.5, label: "100 g pack", priceINR: 15, aisle: "Vegetables & Produce" },
  "Lemon":                   { perPack: 5,    label: "250 g pack (≈5 pcs)", priceINR: 25, aisle: "Vegetables & Produce" },

  // ---- count-based packs (no weight conversion — sold as a fixed count) ----
  "Eggs":                    { perPack: 6,    label: "tray of 6", priceINR: 45, aisle: "Dairy & Paneer" },
  "Chicken sausages":        { perPack: 6,    label: "pack of 6", priceINR: 150, aisle: "Meat, Fish & Seafood" },
  "Tortilla wrap":           { perPack: 6,    label: "pack of 6", priceINR: 90, aisle: "Pantry, Oils & Sauces" },
  "Vegetable stock cube":    { perPack: 6,    label: "pack of 6", priceINR: 110, aisle: "Pantry, Oils & Sauces" },
  "Bread loaf":              { perPack: 12,   label: "1 loaf (≈12 slices)", priceINR: 45, aisle: "Pantry, Oils & Sauces" },
  "Curry leaves":            { perPack: 20,   label: "1 bunch", priceINR: 15, aisle: "Vegetables & Produce" },
  "Lettuce":                 { perPack: 10,   label: "1 pack", priceINR: 40, aisle: "Vegetables & Produce" },

  // ---- ready-to-eat / instant packs — priced per single pack (unit already 'pack') ----
  "Instant Poha Mix": { priceINR: 60, aisle: "Ready-to-eat / Instant" },
  "Instant Oats Cup": { priceINR: 55, aisle: "Ready-to-eat / Instant" },
  "Breakfast Cereal": { priceINR: 180, aisle: "Ready-to-eat / Instant" },
  "Frozen Aloo Paratha": { priceINR: 90, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Upma": { priceINR: 70, aisle: "Ready-to-eat / Instant" },
  "Instant Rava Idli Mix": { priceINR: 85, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Idli & Sambar": { priceINR: 90, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Egg Bhurji": { priceINR: 95, aisle: "Ready-to-eat / Instant" },
  "Frozen Chicken Sausages": { priceINR: 150, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Dal Makhani": { priceINR: 90, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Rajma": { priceINR: 90, aisle: "Ready-to-eat / Instant" },
  "Instant Vegetable Pulao Mix": { priceINR: 80, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Sambar Rice": { priceINR: 90, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Curd Rice Mix": { priceINR: 85, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Chicken Curry": { priceINR: 130, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Chicken Biryani": { priceINR: 150, aisle: "Ready-to-eat / Instant" },
  "Instant Khichdi Mix": { priceINR: 75, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Palak Paneer": { priceINR: 110, aisle: "Ready-to-eat / Instant" },
  "Frozen Paneer Tikka": { priceINR: 160, aisle: "Ready-to-eat / Instant" },
  "Frozen Appam Pack": { priceINR: 90, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Vegetable Stew": { priceINR: 90, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Chicken Stew": { priceINR: 140, aisle: "Ready-to-eat / Instant" },
  "Ready-to-eat Fish Curry": { priceINR: 150, aisle: "Ready-to-eat / Instant" },
};

const DISHES = [
  // ---------------- BREAKFAST — VEG ----------------
  {name:"Poha", meal:"breakfast", category:"veg", effort:1, time:15, ingredients:[
    {name:"Poha (flattened rice)", qty:1.5, unit:"cup"},{name:"Peanuts", qty:2, unit:"tbsp"},{name:"Curry leaves", qty:8, unit:"leaves"}]},
  {name:"Vegetable Upma", meal:"breakfast", category:"veg", effort:1, time:20, ingredients:[
    {name:"Rava (semolina)", qty:1, unit:"cup"},{name:"Mixed vegetables", qty:1, unit:"cup"},{name:"Mustard seeds", qty:0.5, unit:"tsp"}]},
  {name:"Besan Chilla", meal:"breakfast", category:"veg", effort:1, time:15, ingredients:[
    {name:"Besan (gram flour)", qty:1, unit:"cup"},{name:"Onion", qty:1, unit:"pcs"},{name:"Green chilli", qty:2, unit:"pcs"}]},
  {name:"Stuffed Aloo Paratha", meal:"breakfast", category:"veg", effort:2, time:30, ingredients:[
    {name:"Whole wheat atta", qty:2, unit:"cup"},{name:"Potatoes", qty:3, unit:"pcs"},{name:"Ghee", qty:2, unit:"tbsp"}]},
  {name:"Vegetable Daliya", meal:"breakfast", category:"veg", effort:1, time:20, ingredients:[
    {name:"Broken wheat daliya", qty:1, unit:"cup"},{name:"Mixed vegetables", qty:1, unit:"cup"},{name:"Cumin seeds", qty:0.5, unit:"tsp"}]},
  {name:"Moong Dal Chilla", meal:"breakfast", category:"veg", effort:2, time:25, ingredients:[
    {name:"Moong dal", qty:1, unit:"cup"},{name:"Ginger", qty:1, unit:"tbsp"},{name:"Green chilli", qty:2, unit:"pcs"}]},
  {name:"Vegetable Sandwich", meal:"breakfast", category:"veg", effort:1, time:10, ingredients:[
    {name:"Bread loaf", qty:6, unit:"slices"},{name:"Mixed vegetables", qty:1, unit:"cup"},{name:"Butter", qty:2, unit:"tbsp"}]},

  // ---------------- BREAKFAST — NON-VEG ----------------
  {name:"Egg Bhurji", meal:"breakfast", category:"non-veg", effort:1, time:15, ingredients:[
    {name:"Eggs", qty:4, unit:"pcs"},{name:"Onion", qty:1, unit:"pcs"},{name:"Tomato", qty:1, unit:"pcs"}]},
  {name:"Omelette & Toast", meal:"breakfast", category:"non-veg", effort:1, time:10, ingredients:[
    {name:"Eggs", qty:3, unit:"pcs"},{name:"Bread loaf", qty:4, unit:"slices"},{name:"Butter", qty:1, unit:"tbsp"}]},
  {name:"Chicken Sausage Wrap", meal:"breakfast", category:"non-veg", effort:1, time:15, ingredients:[
    {name:"Chicken sausages", qty:4, unit:"pcs"},{name:"Tortilla wrap", qty:2, unit:"pcs"},{name:"Lettuce", qty:4, unit:"leaves"}]},
  {name:"Egg Paratha", meal:"breakfast", category:"non-veg", effort:2, time:25, ingredients:[
    {name:"Whole wheat atta", qty:2, unit:"cup"},{name:"Eggs", qty:3, unit:"pcs"},{name:"Onion", qty:1, unit:"pcs"}]},
  {name:"Keema Paratha", meal:"breakfast", category:"non-veg", effort:3, time:40, ingredients:[
    {name:"Minced mutton keema", qty:300, unit:"g"},{name:"Whole wheat atta", qty:2, unit:"cup"},{name:"Ginger garlic paste", qty:1, unit:"tbsp"}]},
  {name:"Boiled Egg Salad", meal:"breakfast", category:"non-veg", effort:1, time:10, ingredients:[
    {name:"Eggs", qty:4, unit:"pcs"},{name:"Lettuce", qty:6, unit:"leaves"},{name:"Black pepper", qty:0.5, unit:"tsp"}]},
  {name:"Chicken Sandwich", meal:"breakfast", category:"non-veg", effort:1, time:15, ingredients:[
    {name:"Chicken breast", qty:200, unit:"g"},{name:"Bread loaf", qty:6, unit:"slices"},{name:"Mayonnaise", qty:2, unit:"tbsp"}]},

  // ---------------- BREAKFAST — SOUTH INDIAN ----------------
  {name:"Idli & Sambar", meal:"breakfast", category:"south-indian", effort:2, time:25, ingredients:[
    {name:"Idli rice", qty:1, unit:"cup"},{name:"Urad dal", qty:0.25, unit:"cup"},{name:"Toor dal", qty:0.5, unit:"cup"}]},
  {name:"Plain Dosa", meal:"breakfast", category:"south-indian", effort:2, time:25, ingredients:[
    {name:"Dosa rice", qty:1, unit:"cup"},{name:"Urad dal", qty:0.25, unit:"cup"},{name:"Fenugreek seeds", qty:0.5, unit:"tsp"}]},
  {name:"Masala Dosa", meal:"breakfast", category:"south-indian", effort:3, time:35, ingredients:[
    {name:"Dosa batter mix", qty:2, unit:"cup"},{name:"Potatoes", qty:3, unit:"pcs"},{name:"Mustard seeds", qty:0.5, unit:"tsp"}]},
  {name:"Uttapam", meal:"breakfast", category:"south-indian", effort:2, time:25, ingredients:[
    {name:"Dosa batter mix", qty:2, unit:"cup"},{name:"Onion", qty:1, unit:"pcs"},{name:"Tomato", qty:1, unit:"pcs"}]},
  {name:"Ven Pongal", meal:"breakfast", category:"south-indian", effort:2, time:25, ingredients:[
    {name:"Raw rice", qty:1, unit:"cup"},{name:"Moong dal", qty:0.5, unit:"cup"},{name:"Black pepper", qty:1, unit:"tsp"}]},
  {name:"Rava Idli", meal:"breakfast", category:"south-indian", effort:1, time:20, ingredients:[
    {name:"Rava (semolina)", qty:1, unit:"cup"},{name:"Curd", qty:0.5, unit:"cup"},{name:"Mustard seeds", qty:0.5, unit:"tsp"}]},
  {name:"Medu Vada", meal:"breakfast", category:"south-indian", effort:3, time:40, ingredients:[
    {name:"Urad dal", qty:1, unit:"cup"},{name:"Black pepper", qty:1, unit:"tsp"},{name:"Curry leaves", qty:8, unit:"leaves"}]},

  // ---------------- LUNCH — VEG ----------------
  {name:"Dal Tadka & Rice", meal:"lunch", category:"veg", effort:1, time:25, ingredients:[
    {name:"Toor dal", qty:1, unit:"cup"},{name:"Basmati rice", qty:1.5, unit:"cup"},{name:"Cumin seeds", qty:0.5, unit:"tsp"}]},
  {name:"Mixed Veg Curry & Roti", meal:"lunch", category:"veg", effort:2, time:35, ingredients:[
    {name:"Mixed vegetables", qty:3, unit:"cup"},{name:"Whole wheat atta", qty:2, unit:"cup"},{name:"Garam masala", qty:1, unit:"tsp"}]},
  {name:"Rajma Chawal", meal:"lunch", category:"veg", effort:2, time:40, ingredients:[
    {name:"Rajma (kidney beans)", qty:1, unit:"cup"},{name:"Basmati rice", qty:1.5, unit:"cup"},{name:"Onion", qty:2, unit:"pcs"}]},
  {name:"Chole Bhature", meal:"lunch", category:"veg", effort:3, time:50, ingredients:[
    {name:"Kabuli chana (chickpeas)", qty:1, unit:"cup"},{name:"Maida flour", qty:2, unit:"cup"},{name:"Chole masala", qty:1, unit:"tbsp"}]},
  {name:"Paneer Butter Masala & Roti", meal:"lunch", category:"veg", effort:2, time:35, ingredients:[
    {name:"Paneer", qty:250, unit:"g"},{name:"Tomato puree", qty:1, unit:"cup"},{name:"Fresh cream", qty:3, unit:"tbsp"}]},
  {name:"Vegetable Pulao", meal:"lunch", category:"veg", effort:2, time:30, ingredients:[
    {name:"Basmati rice", qty:1.5, unit:"cup"},{name:"Mixed vegetables", qty:2, unit:"cup"},{name:"Whole garam masala", qty:1, unit:"tsp"}]},
  {name:"Kadhi Chawal", meal:"lunch", category:"veg", effort:2, time:30, ingredients:[
    {name:"Besan (gram flour)", qty:0.5, unit:"cup"},{name:"Curd", qty:1, unit:"cup"},{name:"Basmati rice", qty:1.5, unit:"cup"}]},

  // ---------------- LUNCH — NON-VEG ----------------
  {name:"Chicken Curry & Rice", meal:"lunch", category:"non-veg", effort:2, time:40, ingredients:[
    {name:"Chicken curry cut", qty:500, unit:"g"},{name:"Onion", qty:2, unit:"pcs"},{name:"Basmati rice", qty:1.5, unit:"cup"}]},
  {name:"Egg Curry & Roti", meal:"lunch", category:"non-veg", effort:1, time:25, ingredients:[
    {name:"Eggs", qty:4, unit:"pcs"},{name:"Onion tomato masala", qty:1, unit:"cup"},{name:"Whole wheat atta", qty:2, unit:"cup"}]},
  {name:"Fish Curry & Rice", meal:"lunch", category:"non-veg", effort:2, time:35, ingredients:[
    {name:"Fish fillet", qty:400, unit:"g"},{name:"Coconut", qty:0.5, unit:"cup"},{name:"Basmati rice", qty:1.5, unit:"cup"}]},
  {name:"Mutton Curry & Rice", meal:"lunch", category:"non-veg", effort:3, time:60, ingredients:[
    {name:"Mutton curry cut", qty:500, unit:"g"},{name:"Onion", qty:2, unit:"pcs"},{name:"Basmati rice", qty:1.5, unit:"cup"}]},
  {name:"Chicken Biryani", meal:"lunch", category:"non-veg", effort:3, time:55, ingredients:[
    {name:"Basmati rice", qty:2, unit:"cup"},{name:"Chicken curry cut", qty:500, unit:"g"},{name:"Biryani masala", qty:2, unit:"tbsp"}]},
  {name:"Butter Chicken & Naan", meal:"lunch", category:"non-veg", effort:3, time:50, ingredients:[
    {name:"Chicken", qty:500, unit:"g"},{name:"Butter", qty:3, unit:"tbsp"},{name:"Naan flour mix", qty:2, unit:"cup"}]},
  {name:"Prawn Masala & Rice", meal:"lunch", category:"non-veg", effort:2, time:35, ingredients:[
    {name:"Prawns", qty:300, unit:"g"},{name:"Coconut", qty:0.5, unit:"cup"},{name:"Basmati rice", qty:1.5, unit:"cup"}]},

  // ---------------- LUNCH — SOUTH INDIAN ----------------
  {name:"Sambar Rice", meal:"lunch", category:"south-indian", effort:1, time:25, ingredients:[
    {name:"Toor dal", qty:1, unit:"cup"},{name:"Sambar powder", qty:1, unit:"tbsp"},{name:"Raw rice", qty:1.5, unit:"cup"}]},
  {name:"Rasam Rice", meal:"lunch", category:"south-indian", effort:1, time:20, ingredients:[
    {name:"Rasam powder", qty:1, unit:"tbsp"},{name:"Tamarind", qty:1, unit:"tbsp"},{name:"Raw rice", qty:1.5, unit:"cup"}]},
  {name:"Curd Rice", meal:"lunch", category:"south-indian", effort:1, time:10, ingredients:[
    {name:"Raw rice", qty:1.5, unit:"cup"},{name:"Curd", qty:1, unit:"cup"},{name:"Mustard seeds", qty:0.5, unit:"tsp"}]},
  {name:"Bisi Bele Bath", meal:"lunch", category:"south-indian", effort:2, time:35, ingredients:[
    {name:"Raw rice", qty:1, unit:"cup"},{name:"Toor dal", qty:0.5, unit:"cup"},{name:"Bisi bele bath powder", qty:2, unit:"tbsp"}]},
  {name:"Lemon Rice", meal:"lunch", category:"south-indian", effort:1, time:20, ingredients:[
    {name:"Raw rice", qty:1.5, unit:"cup"},{name:"Lemon", qty:2, unit:"pcs"},{name:"Peanuts", qty:2, unit:"tbsp"}]},
  {name:"Vegetable Kootu & Rice", meal:"lunch", category:"south-indian", effort:2, time:30, ingredients:[
    {name:"Mixed vegetables", qty:2, unit:"cup"},{name:"Toor dal", qty:0.5, unit:"cup"},{name:"Raw rice", qty:1.5, unit:"cup"}]},
  {name:"Chettinad Chicken & Rice", meal:"lunch", category:"south-indian", effort:3, time:50, ingredients:[
    {name:"Chicken curry cut", qty:500, unit:"g"},{name:"Chettinad masala", qty:2, unit:"tbsp"},{name:"Basmati rice", qty:1.5, unit:"cup"}]},

  // ---------------- DINNER — VEG ----------------
  {name:"Vegetable Soup & Bread", meal:"dinner", category:"veg", effort:1, time:15, ingredients:[
    {name:"Mixed vegetables", qty:2, unit:"cup"},{name:"Bread loaf", qty:4, unit:"slices"},{name:"Vegetable stock cube", qty:1, unit:"pcs"}]},
  {name:"Palak Paneer & Roti", meal:"dinner", category:"veg", effort:2, time:30, ingredients:[
    {name:"Spinach", qty:300, unit:"g"},{name:"Paneer", qty:200, unit:"g"},{name:"Whole wheat atta", qty:2, unit:"cup"}]},
  {name:"Vegetable Khichdi", meal:"dinner", category:"veg", effort:1, time:25, ingredients:[
    {name:"Moong dal", qty:0.5, unit:"cup"},{name:"Basmati rice", qty:1, unit:"cup"},{name:"Mixed vegetables", qty:1, unit:"cup"}]},
  {name:"Baingan Bharta & Roti", meal:"dinner", category:"veg", effort:2, time:30, ingredients:[
    {name:"Brinjal (eggplant)", qty:2, unit:"pcs"},{name:"Onion", qty:1, unit:"pcs"},{name:"Whole wheat atta", qty:2, unit:"cup"}]},
  {name:"Stuffed Capsicum", meal:"dinner", category:"veg", effort:3, time:40, ingredients:[
    {name:"Capsicum", qty:4, unit:"pcs"},{name:"Potatoes", qty:2, unit:"pcs"},{name:"Spice masala", qty:1, unit:"tbsp"}]},
  {name:"Mixed Dal & Roti", meal:"dinner", category:"veg", effort:1, time:25, ingredients:[
    {name:"Mixed dals", qty:1, unit:"cup"},{name:"Whole wheat atta", qty:2, unit:"cup"},{name:"Ghee", qty:1, unit:"tbsp"}]},
  {name:"Vegetable Fried Rice", meal:"dinner", category:"veg", effort:2, time:25, ingredients:[
    {name:"Basmati rice", qty:1.5, unit:"cup"},{name:"Mixed vegetables", qty:1.5, unit:"cup"},{name:"Soy sauce", qty:1, unit:"tbsp"}]},

  // ---------------- DINNER — NON-VEG ----------------
  {name:"Grilled Chicken & Salad", meal:"dinner", category:"non-veg", effort:2, time:30, ingredients:[
    {name:"Chicken breast", qty:300, unit:"g"},{name:"Salad greens", qty:2, unit:"cup"},{name:"Olive oil", qty:1, unit:"tbsp"}]},
  {name:"Egg Fried Rice", meal:"dinner", category:"non-veg", effort:1, time:20, ingredients:[
    {name:"Eggs", qty:3, unit:"pcs"},{name:"Basmati rice", qty:1.5, unit:"cup"},{name:"Soy sauce", qty:1, unit:"tbsp"}]},
  {name:"Chicken Stew & Appam", meal:"dinner", category:"non-veg", effort:3, time:45, ingredients:[
    {name:"Chicken", qty:400, unit:"g"},{name:"Coconut milk", qty:1, unit:"cup"},{name:"Rice flour (appam)", qty:1, unit:"cup"}]},
  {name:"Fish Fry & Rice", meal:"dinner", category:"non-veg", effort:2, time:30, ingredients:[
    {name:"Fish fillet", qty:400, unit:"g"},{name:"Rice flour coating", qty:0.5, unit:"cup"},{name:"Basmati rice", qty:1.5, unit:"cup"}]},
  {name:"Chicken Soup", meal:"dinner", category:"non-veg", effort:1, time:20, ingredients:[
    {name:"Chicken stock", qty:3, unit:"cup"},{name:"Chicken pieces", qty:200, unit:"g"},{name:"Black pepper", qty:0.5, unit:"tsp"}]},
  {name:"Mutton Stew", meal:"dinner", category:"non-veg", effort:3, time:50, ingredients:[
    {name:"Mutton curry cut", qty:500, unit:"g"},{name:"Coconut milk", qty:1, unit:"cup"},{name:"Potatoes", qty:2, unit:"pcs"}]},
  {name:"Prawn Fried Rice", meal:"dinner", category:"non-veg", effort:2, time:30, ingredients:[
    {name:"Prawns", qty:300, unit:"g"},{name:"Basmati rice", qty:1.5, unit:"cup"},{name:"Soy sauce", qty:1, unit:"tbsp"}]},

  // ---------------- DINNER — SOUTH INDIAN ----------------
  {name:"Dosa & Coconut Chutney", meal:"dinner", category:"south-indian", effort:2, time:25, ingredients:[
    {name:"Dosa batter mix", qty:2, unit:"cup"},{name:"Coconut", qty:0.5, unit:"cup"},{name:"Green chilli", qty:2, unit:"pcs"}]},
  {name:"Idiyappam & Veg Curry", meal:"dinner", category:"south-indian", effort:3, time:40, ingredients:[
    {name:"Rice flour (idiyappam)", qty:2, unit:"cup"},{name:"Mixed vegetables", qty:2, unit:"cup"},{name:"Coconut milk", qty:1, unit:"cup"}]},
  {name:"Adai & Chutney", meal:"dinner", category:"south-indian", effort:2, time:30, ingredients:[
    {name:"Mixed lentils (adai mix)", qty:1, unit:"cup"},{name:"Raw rice", qty:0.5, unit:"cup"},{name:"Coconut", qty:0.5, unit:"cup"}]},
  {name:"Vegetable Stew & Appam", meal:"dinner", category:"south-indian", effort:2, time:35, ingredients:[
    {name:"Mixed vegetables", qty:2, unit:"cup"},{name:"Coconut milk", qty:1, unit:"cup"},{name:"Rice flour (appam)", qty:1, unit:"cup"}]},
  {name:"Rava Upma", meal:"dinner", category:"south-indian", effort:1, time:20, ingredients:[
    {name:"Rava (semolina)", qty:1, unit:"cup"},{name:"Mustard seeds", qty:0.5, unit:"tsp"},{name:"Curry leaves", qty:8, unit:"leaves"}]},
  {name:"Curd Vada", meal:"dinner", category:"south-indian", effort:3, time:40, ingredients:[
    {name:"Urad dal", qty:1, unit:"cup"},{name:"Curd", qty:1, unit:"cup"},{name:"Mustard seeds", qty:0.5, unit:"tsp"}]},
  {name:"Vegetable Uttapam", meal:"dinner", category:"south-indian", effort:1, time:20, ingredients:[
    {name:"Dosa batter mix", qty:2, unit:"cup"},{name:"Mixed vegetables", qty:1, unit:"cup"},{name:"Onion", qty:1, unit:"pcs"}]},

  // ---------------- MORE DISHES ----------------
  {name:"Suji Chilla", meal:"breakfast", category:"veg", effort:1, time:15, ingredients:[
    {name:"Rava (semolina)", qty:1, unit:"cup"},{name:"Curd", qty:0.5, unit:"cup"},{name:"Green chilli", qty:2, unit:"pcs"}]},
  {name:"Bread Upma", meal:"breakfast", category:"veg", effort:1, time:15, ingredients:[
    {name:"Bread loaf", qty:6, unit:"slices"},{name:"Onion", qty:1, unit:"pcs"},{name:"Mustard seeds", qty:0.5, unit:"tsp"}]},
  {name:"Methi Thepla", meal:"breakfast", category:"veg", effort:2, time:30, ingredients:[
    {name:"Whole wheat atta", qty:2, unit:"cup"},{name:"Besan (gram flour)", qty:0.25, unit:"cup"},{name:"Cumin seeds", qty:0.5, unit:"tsp"}]},
  {name:"Aloo Sandwich", meal:"breakfast", category:"veg", effort:1, time:15, ingredients:[
    {name:"Bread loaf", qty:6, unit:"slices"},{name:"Potatoes", qty:2, unit:"pcs"},{name:"Butter", qty:2, unit:"tbsp"}]},
  {name:"Masala Omelette Roll", meal:"breakfast", category:"non-veg", effort:1, time:15, ingredients:[
    {name:"Eggs", qty:3, unit:"pcs"},{name:"Whole wheat atta", qty:1, unit:"cup"},{name:"Onion", qty:1, unit:"pcs"}]},
  {name:"Egg Sandwich", meal:"breakfast", category:"non-veg", effort:1, time:10, ingredients:[
    {name:"Eggs", qty:3, unit:"pcs"},{name:"Bread loaf", qty:4, unit:"slices"},{name:"Butter", qty:1, unit:"tbsp"}]},
  {name:"Keema Egg Toast", meal:"breakfast", category:"non-veg", effort:2, time:25, ingredients:[
    {name:"Minced mutton keema", qty:200, unit:"g"},{name:"Eggs", qty:2, unit:"pcs"},{name:"Bread loaf", qty:4, unit:"slices"}]},
  {name:"Tomato Dosa", meal:"breakfast", category:"south-indian", effort:2, time:25, ingredients:[
    {name:"Dosa rice", qty:1, unit:"cup"},{name:"Tomato", qty:2, unit:"pcs"},{name:"Urad dal", qty:0.25, unit:"cup"}]},
  {name:"Onion Uttapam", meal:"breakfast", category:"south-indian", effort:2, time:25, ingredients:[
    {name:"Dosa batter mix", qty:2, unit:"cup"},{name:"Onion", qty:2, unit:"pcs"},{name:"Green chilli", qty:2, unit:"pcs"}]},
  {name:"Pesarattu", meal:"breakfast", category:"south-indian", effort:2, time:25, ingredients:[
    {name:"Moong dal", qty:1, unit:"cup"},{name:"Green chilli", qty:2, unit:"pcs"},{name:"Ginger", qty:1, unit:"tbsp"}]},
  {name:"Rava Dosa", meal:"breakfast", category:"south-indian", effort:2, time:25, ingredients:[
    {name:"Rava (semolina)", qty:1, unit:"cup"},{name:"Rice flour (appam)", qty:0.5, unit:"cup"},{name:"Curd", qty:0.5, unit:"cup"}]},
  {name:"Jeera Rice & Dal Fry", meal:"lunch", category:"veg", effort:1, time:30, ingredients:[
    {name:"Basmati rice", qty:1.5, unit:"cup"},{name:"Moong dal", qty:0.5, unit:"cup"},{name:"Cumin seeds", qty:1, unit:"tsp"}]},
  {name:"Matar Paneer & Roti", meal:"lunch", category:"veg", effort:2, time:35, ingredients:[
    {name:"Paneer", qty:200, unit:"g"},{name:"Tomato", qty:2, unit:"pcs"},{name:"Whole wheat atta", qty:2, unit:"cup"}]},
  {name:"Vegetable Biryani", meal:"lunch", category:"veg", effort:3, time:50, ingredients:[
    {name:"Basmati rice", qty:2, unit:"cup"},{name:"Mixed vegetables", qty:2, unit:"cup"},{name:"Biryani masala", qty:2, unit:"tbsp"}]},
  {name:"Chana Masala & Rice", meal:"lunch", category:"veg", effort:2, time:40, ingredients:[
    {name:"Kabuli chana (chickpeas)", qty:1, unit:"cup"},{name:"Chole masala", qty:1, unit:"tbsp"},{name:"Basmati rice", qty:1.5, unit:"cup"}]},
  {name:"Aloo Jeera & Roti", meal:"lunch", category:"veg", effort:1, time:25, ingredients:[
    {name:"Potatoes", qty:3, unit:"pcs"},{name:"Cumin seeds", qty:1, unit:"tsp"},{name:"Whole wheat atta", qty:2, unit:"cup"}]},
  {name:"Chicken Pulao", meal:"lunch", category:"non-veg", effort:2, time:40, ingredients:[
    {name:"Chicken curry cut", qty:400, unit:"g"},{name:"Basmati rice", qty:1.5, unit:"cup"},{name:"Garam masala", qty:1, unit:"tsp"}]},
  {name:"Egg Biryani", meal:"lunch", category:"non-veg", effort:2, time:40, ingredients:[
    {name:"Eggs", qty:4, unit:"pcs"},{name:"Basmati rice", qty:2, unit:"cup"},{name:"Biryani masala", qty:2, unit:"tbsp"}]},
  {name:"Keema Rice", meal:"lunch", category:"non-veg", effort:2, time:35, ingredients:[
    {name:"Minced mutton keema", qty:300, unit:"g"},{name:"Basmati rice", qty:1.5, unit:"cup"},{name:"Onion", qty:1, unit:"pcs"}]},
  {name:"Chicken Kadai & Roti", meal:"lunch", category:"non-veg", effort:3, time:45, ingredients:[
    {name:"Chicken curry cut", qty:500, unit:"g"},{name:"Capsicum", qty:2, unit:"pcs"},{name:"Whole wheat atta", qty:2, unit:"cup"}]},
  {name:"Tamarind Rice (Puliyogare)", meal:"lunch", category:"south-indian", effort:2, time:30, ingredients:[
    {name:"Raw rice", qty:1.5, unit:"cup"},{name:"Tamarind", qty:2, unit:"tbsp"},{name:"Peanuts", qty:2, unit:"tbsp"}]},
  {name:"Coconut Rice", meal:"lunch", category:"south-indian", effort:1, time:20, ingredients:[
    {name:"Raw rice", qty:1.5, unit:"cup"},{name:"Coconut", qty:0.5, unit:"cup"},{name:"Mustard seeds", qty:0.5, unit:"tsp"}]},
  {name:"Tomato Rice", meal:"lunch", category:"south-indian", effort:1, time:25, ingredients:[
    {name:"Raw rice", qty:1.5, unit:"cup"},{name:"Tomato", qty:3, unit:"pcs"},{name:"Curry leaves", qty:8, unit:"leaves"}]},
  {name:"Kerala Egg Curry & Rice", meal:"lunch", category:"south-indian", effort:2, time:35, ingredients:[
    {name:"Eggs", qty:4, unit:"pcs"},{name:"Coconut milk", qty:0.5, unit:"cup"},{name:"Raw rice", qty:1.5, unit:"cup"}]},
  {name:"Veg Pulao & Raita", meal:"dinner", category:"veg", effort:2, time:30, ingredients:[
    {name:"Basmati rice", qty:1.5, unit:"cup"},{name:"Mixed vegetables", qty:1.5, unit:"cup"},{name:"Curd", qty:0.5, unit:"cup"}]},
  {name:"Paneer Bhurji & Roti", meal:"dinner", category:"veg", effort:1, time:25, ingredients:[
    {name:"Paneer", qty:200, unit:"g"},{name:"Onion", qty:1, unit:"pcs"},{name:"Whole wheat atta", qty:2, unit:"cup"}]},
  {name:"Tomato Soup & Toast", meal:"dinner", category:"veg", effort:1, time:20, ingredients:[
    {name:"Tomato", qty:4, unit:"pcs"},{name:"Bread loaf", qty:4, unit:"slices"},{name:"Butter", qty:1, unit:"tbsp"}]},
  {name:"Dal Palak & Rice", meal:"dinner", category:"veg", effort:2, time:30, ingredients:[
    {name:"Toor dal", qty:0.5, unit:"cup"},{name:"Spinach", qty:250, unit:"g"},{name:"Basmati rice", qty:1, unit:"cup"}]},
  {name:"Chicken Fried Rice", meal:"dinner", category:"non-veg", effort:2, time:30, ingredients:[
    {name:"Chicken breast", qty:200, unit:"g"},{name:"Basmati rice", qty:1.5, unit:"cup"},{name:"Soy sauce", qty:1, unit:"tbsp"}]},
  {name:"Chicken Tikka & Salad", meal:"dinner", category:"non-veg", effort:2, time:35, ingredients:[
    {name:"Chicken breast", qty:300, unit:"g"},{name:"Curd", qty:0.5, unit:"cup"},{name:"Salad greens", qty:2, unit:"cup"}]},
  {name:"Fish Masala Fry & Roti", meal:"dinner", category:"non-veg", effort:2, time:30, ingredients:[
    {name:"Fish fillet", qty:400, unit:"g"},{name:"Whole wheat atta", qty:2, unit:"cup"},{name:"Green chilli", qty:2, unit:"pcs"}]},
  {name:"Keema Matar & Roti", meal:"dinner", category:"non-veg", effort:2, time:40, ingredients:[
    {name:"Minced mutton keema", qty:300, unit:"g"},{name:"Whole wheat atta", qty:2, unit:"cup"},{name:"Onion", qty:1, unit:"pcs"}]},
  {name:"Podi Idli", meal:"dinner", category:"south-indian", effort:2, time:25, ingredients:[
    {name:"Idli rice", qty:1, unit:"cup"},{name:"Urad dal", qty:0.25, unit:"cup"},{name:"Sambar powder", qty:1, unit:"tbsp"}]},
  {name:"Kerala Egg Roast & Appam", meal:"dinner", category:"south-indian", effort:3, time:40, ingredients:[
    {name:"Eggs", qty:4, unit:"pcs"},{name:"Onion", qty:2, unit:"pcs"},{name:"Rice flour (appam)", qty:1, unit:"cup"}]},
  {name:"Vegetable Pongal", meal:"dinner", category:"south-indian", effort:1, time:25, ingredients:[
    {name:"Raw rice", qty:1, unit:"cup"},{name:"Moong dal", qty:0.5, unit:"cup"},{name:"Mixed vegetables", qty:1, unit:"cup"}]},
  {name:"Fish Moilee & Rice", meal:"dinner", category:"south-indian", effort:3, time:40, ingredients:[
    {name:"Fish fillet", qty:400, unit:"g"},{name:"Coconut milk", qty:1, unit:"cup"},{name:"Raw rice", qty:1.5, unit:"cup"}]},

  // ---------------- READY-MADE / INSTANT (store-bought, quick) ----------------
  {name:"Instant Poha Mix", meal:"breakfast", category:"veg", effort:1, time:5, readymade:true, ingredients:[{name:"Instant Poha Mix", qty:1, unit:"pack"}]},
  {name:"Instant Oats Cup", meal:"breakfast", category:"veg", effort:1, time:5, readymade:true, ingredients:[{name:"Instant Oats Cup", qty:1, unit:"pack"}]},
  {name:"Cereal & Milk", meal:"breakfast", category:"veg", effort:1, time:5, readymade:true, ingredients:[{name:"Breakfast Cereal", qty:1, unit:"pack"}]},
  {name:"Frozen Aloo Paratha", meal:"breakfast", category:"veg", effort:1, time:8, readymade:true, ingredients:[{name:"Frozen Aloo Paratha", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Upma", meal:"breakfast", category:"south-indian", effort:1, time:5, readymade:true, ingredients:[{name:"Ready-to-eat Upma", qty:1, unit:"pack"}]},
  {name:"Instant Rava Idli Mix", meal:"breakfast", category:"south-indian", effort:1, time:10, readymade:true, ingredients:[{name:"Instant Rava Idli Mix", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Idli & Sambar", meal:"breakfast", category:"south-indian", effort:1, time:5, readymade:true, ingredients:[{name:"Ready-to-eat Idli & Sambar", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Egg Bhurji", meal:"breakfast", category:"non-veg", effort:1, time:8, readymade:true, ingredients:[{name:"Ready-to-eat Egg Bhurji", qty:1, unit:"pack"}]},
  {name:"Frozen Chicken Sausages", meal:"breakfast", category:"non-veg", effort:1, time:10, readymade:true, ingredients:[{name:"Frozen Chicken Sausages", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Dal Makhani", meal:"lunch", category:"veg", effort:1, time:5, readymade:true, ingredients:[{name:"Ready-to-eat Dal Makhani", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Rajma", meal:"lunch", category:"veg", effort:1, time:5, readymade:true, ingredients:[{name:"Ready-to-eat Rajma", qty:1, unit:"pack"}]},
  {name:"Instant Vegetable Pulao Mix", meal:"lunch", category:"veg", effort:1, time:10, readymade:true, ingredients:[{name:"Instant Vegetable Pulao Mix", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Sambar Rice", meal:"lunch", category:"south-indian", effort:1, time:5, readymade:true, ingredients:[{name:"Ready-to-eat Sambar Rice", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Curd Rice Mix", meal:"lunch", category:"south-indian", effort:1, time:5, readymade:true, ingredients:[{name:"Ready-to-eat Curd Rice Mix", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Chicken Curry", meal:"lunch", category:"non-veg", effort:1, time:8, readymade:true, ingredients:[{name:"Ready-to-eat Chicken Curry", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Chicken Biryani", meal:"lunch", category:"non-veg", effort:1, time:8, readymade:true, ingredients:[{name:"Ready-to-eat Chicken Biryani", qty:1, unit:"pack"}]},
  {name:"Instant Khichdi Mix", meal:"dinner", category:"veg", effort:1, time:8, readymade:true, ingredients:[{name:"Instant Khichdi Mix", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Palak Paneer", meal:"dinner", category:"veg", effort:1, time:5, readymade:true, ingredients:[{name:"Ready-to-eat Palak Paneer", qty:1, unit:"pack"}]},
  {name:"Frozen Paneer Tikka", meal:"dinner", category:"veg", effort:1, time:10, readymade:true, ingredients:[{name:"Frozen Paneer Tikka", qty:1, unit:"pack"}]},
  {name:"Frozen Appam Pack", meal:"dinner", category:"south-indian", effort:1, time:8, readymade:true, ingredients:[{name:"Frozen Appam Pack", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Vegetable Stew", meal:"dinner", category:"south-indian", effort:1, time:8, readymade:true, ingredients:[{name:"Ready-to-eat Vegetable Stew", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Chicken Stew", meal:"dinner", category:"non-veg", effort:1, time:8, readymade:true, ingredients:[{name:"Ready-to-eat Chicken Stew", qty:1, unit:"pack"}]},
  {name:"Ready-to-eat Fish Curry", meal:"dinner", category:"non-veg", effort:1, time:8, readymade:true, ingredients:[{name:"Ready-to-eat Fish Curry", qty:1, unit:"pack"}]},
];

// ---------------- KIDS' SNACKS & DRINKS (best-price picks) ----------------
const KID_ITEMS = [
  {name:"Roasted Makhana (Fox Nuts)", type:"snack", emoji:"🍿", note:"Light, crunchy, air-popped", budget:true},
  {name:"Baked Vegetable Chips", type:"snack", emoji:"🥕", note:"Not fried, kid-friendly crunch", budget:true},
  {name:"Whole Wheat Crackers", type:"snack", emoji:"🍘", note:"Good with cheese or hummus", budget:true},
  {name:"Trail Mix (Nuts & Dried Fruit)", type:"snack", emoji:"🥜", note:"No added sugar, protein-rich"},
  {name:"Multigrain Rusk", type:"snack", emoji:"🍞", note:"Pairs well with milk", budget:true},
  {name:"Ragi Cookies", type:"snack", emoji:"🍪", note:"Iron-rich, no maida", budget:true},
  {name:"Roasted Chana", type:"snack", emoji:"🫘", note:"High protein, low oil", budget:true},
  {name:"No-added-sugar Granola Bars", type:"snack", emoji:"🍫", note:"Good lunchbox filler"},
  {name:"Baked Banana Chips", type:"snack", emoji:"🍌", note:"Lightly salted, not deep-fried", budget:true},
  {name:"Ready Sprouts Chaat Mix", type:"snack", emoji:"🌱", note:"Protein + fibre combo"},
  {name:"Flavoured Milk (no added sugar)", type:"drink", emoji:"🥛", note:"Calcium for growing kids", budget:true},
  {name:"100% Fruit Juice (no sugar added)", type:"drink", emoji:"🧃", note:"Check label for 'no added sugar'"},
  {name:"Packaged Coconut Water", type:"drink", emoji:"🥥", note:"Natural electrolytes"},
  {name:"Buttermilk / Chaas Mix", type:"drink", emoji:"🥤", note:"Light, good after meals", budget:true},
  {name:"Almond Milk", type:"drink", emoji:"🌰", note:"Good dairy-free option"},
  {name:"Kids' Protein Milk Shake Mix", type:"drink", emoji:"🍶", note:"For active or picky eaters"},
];
