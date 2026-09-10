// ============================================================
// BUSYWOMEN COOK SCHEDULE — DATA
// effort: 1 = easy/quick, 2 = moderate, 3 = weekend style
// ingredients: quantities are for a 2-person base serving;
// the grocery aggregator scales these by the portion selector.
// ============================================================

const CONFIG = {
  amazonTag: "kingcloud-21",
  amazonDomain: "amazon.in"
};

const DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const CAT_LABEL = { "veg":"Veg", "non-veg":"Non-veg", "south-indian":"South Indian" };
const PEPPER = { 1:"🌶", 2:"🌶🌶", 3:"🌶🌶🌶" };

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
