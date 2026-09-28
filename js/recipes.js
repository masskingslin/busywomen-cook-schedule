// ============================================================
// SHORT COOKING METHODS — keyed by exact dish name in data.js.
// Quantities are deliberately left to the "Needs:" line on each dish.
// Ready-made dishes get an automatic "heat & serve" method (see app.js).
// ============================================================
const RECIPES = {
  // ---- BREAKFAST · VEG ----
  "Poha": ["Rinse poha in a sieve until soft, drain and rest 5 min.","Temper mustard seeds, curry leaves, peanuts and chopped onion in oil; add turmeric.","Fold in poha and salt, steam covered 2 min, finish with lemon and coriander."],
  "Vegetable Upma": ["Dry-roast rava on medium heat until fragrant; set aside.","Temper mustard seeds and curry leaves, saute onion and chopped vegetables.","Add hot water and salt, pour in rava while stirring, cover and cook 3 min."],
  "Besan Chilla": ["Whisk besan with water, salt and turmeric into a smooth pourable batter.","Stir in chopped onion, green chilli and coriander.","Pour a ladle on a hot greased tawa, spread thin, cook both sides until golden."],
  "Stuffed Aloo Paratha": ["Knead atta with water and salt into a soft dough; rest 15 min.","Mash boiled potatoes with green chilli, spices and coriander for the filling.","Stuff dough balls, roll gently and cook on tawa with ghee until spotted."],
  "Vegetable Daliya": ["Roast daliya in a little ghee for 2 min.","Saute cumin, onion and vegetables in a pressure cooker.","Add water and salt, pressure cook 3 whistles and let the steam release."],
  "Moong Dal Chilla": ["Soak moong dal 2 hours, then grind with ginger and green chilli.","Add salt and a little water to get a pourable batter.","Spread on a hot tawa, cook with a drop of oil until crisp at the edges."],
  "Vegetable Sandwich": ["Boil or steam sliced vegetables lightly and season with salt and pepper.","Butter the bread and layer with vegetables and chutney.","Toast on a pan or sandwich maker until golden."],
  "Suji Chilla": ["Mix rava with curd and water to a thick batter; rest 10 min.","Add chopped green chilli, onion and salt.","Cook small rounds on a greased tawa until golden on both sides."],
  "Bread Upma": ["Tear bread slices into small pieces.","Temper mustard seeds and curry leaves, saute onion and green chilli.","Add bread, salt and turmeric, toss 2 min until warm and lightly crisp."],
  "Methi Thepla": ["Knead atta, besan, cumin, salt and a little oil into a soft dough.","Roll thin rounds.","Cook on a tawa with a little oil until brown spots appear."],
  "Aloo Sandwich": ["Mash boiled potatoes with salt, chilli and spices.","Spread on buttered bread slices and close the sandwich.","Toast until golden and crisp."],

  // ---- BREAKFAST · NON-VEG ----
  "Egg Bhurji": ["Saute chopped onion, tomato and green chilli in oil with turmeric.","Crack in eggs, add salt and scramble on medium heat.","Cook until just set and finish with coriander."],
  "Omelette & Toast": ["Whisk eggs with salt, pepper and chopped onion or chilli.","Pour into a buttered pan and cook until set, fold over.","Toast bread with butter and serve alongside."],
  "Chicken Sausage Wrap": ["Pan-fry sausages until browned all over.","Warm the tortilla wraps on a dry pan.","Fill with sausage and lettuce, add sauce and roll tightly."],
  "Egg Paratha": ["Knead atta into a soft dough; rest 15 min.","Roll a paratha, cook one side, flip and spread beaten egg with onion on top.","Flip again and cook until the egg is set."],
  "Keema Paratha": ["Cook keema with ginger garlic paste, spices and salt until completely dry; cool.","Stuff into atta dough balls and roll gently.","Cook on tawa with oil or ghee until golden on both sides."],
  "Boiled Egg Salad": ["Boil eggs 9-10 min, cool in cold water and peel.","Slice and arrange on lettuce.","Season with salt and pepper and add a squeeze of lemon."],
  "Chicken Sandwich": ["Cook chicken breast with salt and pepper, shred or slice.","Mix with mayonnaise.","Layer on bread and toast if you like."],
  "Masala Omelette Roll": ["Make a soft dough from atta and roll thin rotis; cook lightly.","Whisk eggs with onion, chilli and salt and cook as a thin omelette.","Place omelette on the roti, roll up and serve hot."],
  "Egg Sandwich": ["Boil or scramble eggs and season with salt and pepper.","Butter the bread and layer the eggs.","Toast until crisp."],
  "Keema Egg Toast": ["Cook keema with onion and spices until dry.","Toast bread and spread the keema on top.","Top with a fried or poached egg."],

  // ---- BREAKFAST · SOUTH INDIAN ----
  "Idli & Sambar": ["Soak idli rice and urad dal separately, grind, mix, ferment overnight.","Steam batter in idli moulds for 10-12 min.","Boil toor dal with vegetables and sambar powder; temper and serve with idlis."],
  "Plain Dosa": ["Soak dosa rice, urad dal and fenugreek, grind and ferment overnight.","Spread a ladle of batter thin on a hot tawa.","Drizzle a little oil and cook until crisp and golden."],
  "Masala Dosa": ["Make a potato masala: temper mustard, onion, boiled mashed potato, turmeric.","Spread dosa batter thin on a hot tawa and cook until crisp.","Spoon masala in the centre and fold."],
  "Uttapam": ["Pour a thick round of dosa batter on a greased tawa.","Sprinkle chopped onion and tomato on top.","Cover and cook, flip and cook until golden."],
  "Ven Pongal": ["Dry-roast moong dal lightly and cook with rice until very soft.","Temper ghee, pepper, cumin, curry leaves and ginger.","Mix into the rice-dal and mash slightly with salt."],
  "Rava Idli": ["Roast rava and mix with curd, salt and water into a thick batter; rest 15 min.","Add a tempering of mustard seeds and curry leaves.","Steam in idli moulds for 10-12 min."],
  "Medu Vada": ["Soak urad dal 3 hours and grind to a thick fluffy batter with little water.","Mix in pepper, curry leaves and salt.","Shape rings with wet hands and deep-fry until golden."],
  "Tomato Dosa": ["Grind soaked dosa rice and urad dal with tomatoes to a smooth batter.","Rest 30 min and add salt.","Spread thin on a hot tawa and cook until crisp."],
  "Onion Uttapam": ["Pour dosa batter into a thick round on a greased tawa.","Top with chopped onion and green chilli.","Cook covered, flip and cook until golden."],
  "Pesarattu": ["Soak moong dal 4 hours and grind with ginger and green chilli.","Add salt and spread thin on a hot tawa.","Cook with a little oil until crisp; fold and serve with chutney."],
  "Rava Dosa": ["Mix rava, rice flour, curd and water into a very thin batter; rest 15 min.","Add cumin and chopped chilli.","Pour lacy rounds on a very hot tawa and cook until crisp."],

  // ---- LUNCH · VEG ----
  "Dal Tadka & Rice": ["Pressure cook toor dal with turmeric and salt until soft.","Heat ghee, splutter cumin, add garlic, chilli and tomato; pour over dal.","Cook rice separately and serve together."],
  "Mixed Veg Curry & Roti": ["Saute onion, tomato and spices into a masala.","Add chopped vegetables and a little water, cover and cook until tender.","Serve with fresh rotis made from atta dough."],
  "Rajma Chawal": ["Soak rajma overnight and pressure cook until soft.","Cook onion-tomato masala and simmer the rajma in it 15 min.","Serve over steamed basmati rice."],
  "Chole Bhature": ["Pressure cook soaked chickpeas, then simmer with onion-tomato masala and chole masala.","Knead maida with curd, salt and oil; rest 2 hours.","Roll and deep-fry bhature until puffed and golden."],
  "Paneer Butter Masala & Roti": ["Cook tomato puree with butter and spices until thick.","Stir in cream and paneer cubes; simmer 5 min.","Serve with hot rotis."],
  "Vegetable Pulao": ["Saute whole spices and vegetables in ghee.","Add washed basmati rice, water and salt.","Cook covered until fluffy and rest 5 min."],
  "Kadhi Chawal": ["Whisk besan and curd with water and turmeric until smooth.","Simmer, stirring, for 20 min; add a tadka of cumin and chilli.","Serve with steamed rice."],
  "Jeera Rice & Dal Fry": ["Cook moong dal with turmeric until soft; finish with a garlic-chilli tadka.","Temper cumin in ghee, add rice and water and cook until fluffy.","Serve dal over the jeera rice."],
  "Matar Paneer & Roti": ["Cook onion and tomato with spices into a thick masala.","Add paneer cubes and simmer with a little water.","Serve with fresh rotis."],
  "Vegetable Biryani": ["Par-cook basmati rice with whole spices to 70 percent done.","Cook vegetables with biryani masala and curd into a thick gravy.","Layer rice over the gravy, cover tightly and steam on low heat for 15 min."],
  "Chana Masala & Rice": ["Pressure cook soaked chickpeas until soft.","Cook onion, tomato and chole masala; add chickpeas and simmer 15 min.","Serve with steamed rice."],
  "Aloo Jeera & Roti": ["Boil, peel and cube potatoes.","Splutter cumin in oil, add potatoes, turmeric, chilli and salt; toss until crisp at the edges.","Serve with hot rotis."],

  // ---- LUNCH · NON-VEG ----
  "Chicken Curry & Rice": ["Marinate chicken with ginger garlic paste, salt and turmeric.","Cook onions and tomato with spices; add chicken and simmer until tender.","Serve over steamed basmati rice."],
  "Egg Curry & Roti": ["Hard-boil eggs, peel and lightly fry.","Simmer in an onion tomato masala for 8 min.","Serve with rotis."],
  "Fish Curry & Rice": ["Grind coconut with chilli and tamarind into a paste.","Simmer the paste with spices and add fish pieces; cook 8-10 min gently.","Serve with steamed rice."],
  "Mutton Curry & Rice": ["Pressure cook mutton with onion, ginger garlic paste and spices until tender.","Simmer in a thick onion-tomato masala until the gravy clings.","Serve with steamed basmati rice."],
  "Chicken Biryani": ["Marinate chicken with curd, biryani masala and salt for 30 min.","Par-cook rice with whole spices; layer over the chicken.","Seal and cook on low heat 20 min (dum) and rest before serving."],
  "Butter Chicken & Naan": ["Marinate and grill or pan-sear chicken.","Simmer tomato puree with butter, cream and spices; add chicken.","Serve with naan made from naan flour mix."],
  "Prawn Masala & Rice": ["Marinate prawns with turmeric and salt.","Cook onion, coconut and spices into a masala and add prawns.","Cook 6-8 min only and serve with rice."],
  "Chicken Pulao": ["Saute whole spices, onion and chicken until browned.","Add washed basmati rice, water and salt.","Cook covered until rice is fluffy."],
  "Egg Biryani": ["Boil eggs and lightly fry with masala.","Par-cook rice; layer with an onion masala made with biryani masala.","Steam covered on low heat for 15 min."],
  "Keema Rice": ["Cook keema with onion and spices until dry and well browned.","Stir in washed rice and water, salt to taste.","Cook covered until rice is done."],
  "Chicken Kadai & Roti": ["Cook chicken with onion, tomato and ground kadai spices.","Add capsicum strips near the end so they stay crisp.","Serve with rotis."],

  // ---- LUNCH · SOUTH INDIAN ----
  "Sambar Rice": ["Pressure cook toor dal and vegetables until soft.","Add sambar powder, tamarind water and salt; simmer, then temper with mustard and curry leaves.","Mix with cooked rice and serve hot."],
  "Rasam Rice": ["Boil tamarind water with tomato, rasam powder and salt.","Temper mustard, cumin and curry leaves and add to the rasam.","Serve over hot rice."],
  "Curd Rice": ["Cook rice until very soft and mash lightly; cool.","Mix in curd and salt.","Temper mustard seeds, chilli and curry leaves and pour over."],
  "Bisi Bele Bath": ["Cook rice and toor dal together until mushy.","Simmer with vegetables, tamarind and bisi bele bath powder.","Finish with a ghee tempering."],
  "Lemon Rice": ["Cook rice and cool it.","Temper mustard, peanuts, curry leaves and turmeric.","Toss with rice, salt and fresh lemon juice."],
  "Vegetable Kootu & Rice": ["Cook toor dal and vegetables together until soft.","Add ground coconut and salt and simmer.","Temper with mustard and curry leaves; serve with rice."],
  "Chettinad Chicken & Rice": ["Marinate chicken with ginger garlic paste and turmeric.","Roast and grind Chettinad masala; cook with onion and tomato.","Add chicken and simmer until tender; serve with rice."],
  "Tamarind Rice (Puliyogare)": ["Cook tamarind pulp with spices until thick.","Temper mustard, peanuts and curry leaves.","Mix through cooked rice."],
  "Coconut Rice": ["Cook rice and cool it.","Temper mustard and curry leaves; add grated coconut and toast 1 min.","Toss with rice and salt."],
  "Tomato Rice": ["Saute onion, tomato and spices until mushy.","Add curry leaves and cooked rice.","Toss gently and serve with raita."],
  "Kerala Egg Curry & Rice": ["Boil and peel eggs.","Simmer onion, tomato, spices and coconut milk into a gravy.","Add eggs and warm through; serve with rice."],

  // ---- DINNER · VEG ----
  "Vegetable Soup & Bread": ["Boil chopped vegetables with a stock cube and pepper.","Simmer until tender and blend lightly if you like.","Serve hot with toasted bread."],
  "Palak Paneer & Roti": ["Blanch spinach and blend to a puree.","Cook onion, tomato and spices; add puree and paneer cubes.","Simmer 5 min and serve with rotis."],
  "Vegetable Khichdi": ["Rinse moong dal and rice together.","Pressure cook with vegetables, turmeric, salt and water until soft.","Finish with a ghee-cumin tadka."],
  "Baingan Bharta & Roti": ["Roast brinjal directly over flame until charred; peel and mash.","Saute onion and spices, add the brinjal and cook until dry.","Serve with rotis."],
  "Stuffed Capsicum": ["Hollow out the capsicums.","Fill with spiced mashed potato.","Bake or pan-cook covered until capsicum is soft."],
  "Mixed Dal & Roti": ["Pressure cook mixed dals with turmeric and salt.","Finish with a ghee tadka of cumin, garlic and chilli.","Serve with rotis."],
  "Vegetable Fried Rice": ["Cook rice ahead and cool completely.","Stir-fry vegetables on high heat with soy sauce and pepper.","Add rice and toss until hot and dry."],
  "Veg Pulao & Raita": ["Saute vegetables and whole spices in ghee.","Add rice and water; cook covered until fluffy.","Whisk curd with salt and cumin for the raita."],
  "Paneer Bhurji & Roti": ["Saute onion and green chilli with turmeric.","Add crumbled paneer and salt and cook 5 min.","Serve with rotis."],
  "Tomato Soup & Toast": ["Boil tomatoes with a little water, cool and blend smooth.","Simmer with butter, salt and pepper.","Serve with buttered toast."],
  "Dal Palak & Rice": ["Pressure cook toor dal with turmeric until soft.","Add chopped spinach and simmer 5 min; finish with garlic tadka.","Serve with steamed rice."],

  // ---- DINNER · NON-VEG ----
  "Grilled Chicken & Salad": ["Marinate chicken breast with salt, pepper, olive oil and lemon.","Grill or pan-sear 6 min per side until cooked through.","Serve sliced over fresh salad greens."],
  "Egg Fried Rice": ["Scramble eggs and set aside.","Stir-fry onion and cooked cold rice on high heat with soy sauce.","Fold the eggs back in and season."],
  "Chicken Stew & Appam": ["Simmer chicken with onion, potato, whole spices and thin coconut milk.","Stir in thick coconut milk at the end and warm through.","Make appams from rice flour batter and serve."],
  "Fish Fry & Rice": ["Marinate fish with turmeric, chilli and salt for 15 min.","Coat lightly in rice flour.","Shallow-fry until crisp; serve with rice."],
  "Chicken Soup": ["Simmer chicken pieces in stock with pepper and a little ginger.","Cook until chicken is tender, about 15 min.","Season with salt and serve hot."],
  "Mutton Stew": ["Pressure cook mutton with whole spices until tender.","Add potato and thin coconut milk and simmer.","Finish with thick coconut milk and pepper."],
  "Prawn Fried Rice": ["Stir-fry prawns with garlic 3 min and set aside.","Fry cold rice on high heat with soy sauce.","Return prawns and toss."],
  "Chicken Fried Rice": ["Cook diced chicken breast with pepper and set aside.","Stir-fry cold rice with soy sauce on high heat.","Combine with chicken and serve hot."],
  "Chicken Tikka & Salad": ["Marinate chicken breast in curd and spices for 30 min.","Grill or pan-roast until charred and cooked through.","Serve with fresh salad greens."],
  "Fish Masala Fry & Roti": ["Marinate fish with chilli, turmeric and salt.","Shallow-fry until crisp on both sides.","Serve with rotis and lemon."],
  "Keema Matar & Roti": ["Cook onion and spices, add keema and brown well.","Add a little water and simmer until tender and dry.","Serve with rotis."],

  // ---- DINNER · SOUTH INDIAN ----
  "Dosa & Coconut Chutney": ["Grind coconut, green chilli and salt into a smooth chutney; add a mustard tadka.","Spread dosa batter thin on a hot tawa.","Cook until crisp and serve with chutney."],
  "Idiyappam & Veg Curry": ["Mix rice flour with hot water and salt into a soft dough.","Press through a sev press onto idli plates and steam 8 min.","Serve with a coconut milk vegetable curry."],
  "Adai & Chutney": ["Soak lentils and rice 3 hours; grind coarsely with chilli.","Spread thick rounds on a tawa and cook with oil until crisp.","Serve with coconut chutney."],
  "Vegetable Stew & Appam": ["Simmer vegetables with whole spices and thin coconut milk.","Add thick coconut milk and warm through.","Serve with appam made from rice flour."],
  "Rava Upma": ["Dry-roast rava until fragrant.","Temper mustard seeds and curry leaves, add water and salt.","Stir in the rava and cook covered for 3 min."],
  "Curd Vada": ["Soak urad dal, grind and fry vadas until golden.","Dunk vadas in warm salted water for 5 min and squeeze lightly.","Top with whisked curd and a mustard tadka."],
  "Vegetable Uttapam": ["Pour dosa batter into a thick round on a greased tawa.","Top with chopped vegetables and onion.","Cook covered and flip until golden."],
  "Podi Idli": ["Steam idlis and cut into pieces.","Toss in hot oil with sambar powder or idli podi.","Serve warm with chutney."],
  "Kerala Egg Roast & Appam": ["Boil eggs and peel.","Cook onions slowly with Kerala-style spices until dark and jammy.","Add the eggs and coat well; serve with appam."],
  "Vegetable Pongal": ["Cook rice and moong dal with chopped vegetables until soft.","Temper ghee, pepper, cumin and curry leaves.","Mix in and mash slightly."],
  "Fish Moilee & Rice": ["Saute onion, ginger and green chilli lightly.","Add coconut milk and fish and simmer gently 8-10 min.","Serve with steamed rice."],
};
