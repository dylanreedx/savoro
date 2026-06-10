/* Savoro · Sample data. Warm, macro-aware, realistic. */

// Soft pastel gradients stand in for dish photos (brand-cohesive, photo-swappable).
const GRAD = {
  oats: 'linear-gradient(135deg, var(--blush-200), var(--blush-100) 48%, var(--sage-100))',
  shawarma: 'linear-gradient(135deg, var(--sand-300), var(--blush-200) 52%, var(--lavender-200))',
  poke: 'linear-gradient(135deg, var(--sage-200), var(--sage-100) 50%, var(--blush-100))',
  parfait: 'linear-gradient(135deg, var(--lavender-200), var(--blush-100) 55%, var(--sand-100))',
  turkey: 'linear-gradient(135deg, var(--sand-300), var(--sand-200) 48%, var(--blush-200))',
  lentil: 'linear-gradient(135deg, var(--blush-300), var(--sand-200) 55%, var(--sage-100))',
  tofu: 'linear-gradient(135deg, var(--blush-200), var(--lavender-200) 50%, var(--sage-100))',
  pancakes: 'linear-gradient(135deg, var(--blush-100), var(--blush-200) 50%, var(--sand-200))',
  yogurtbowl: 'linear-gradient(135deg, var(--sage-200), var(--blush-100) 50%, var(--lavender-100))',
};

const USERS = {
  dylan:   { handle: 'dylan',   name: 'Dylan Reed',     tint: 'var(--blush-200)',    initials: 'DR' },
  maya:    { handle: 'maya',    name: 'Maya Okonkwo',   tint: 'var(--sage-200)',     initials: 'MO' },
  livfit:  { handle: 'livfit',  name: 'Liv Carter',     tint: 'var(--lavender-200)', initials: 'LC' },
  marco:   { handle: 'marcoeats', name: 'Marco Bianchi',tint: 'var(--blush-300)',    initials: 'MB' },
  alex:    { handle: 'alexmealprep', name: 'Alex Nguyen',tint: 'var(--sand-300)',    initials: 'AN' },
  jordan:  { handle: 'jordan',  name: 'Jordan Pierce',  tint: 'var(--sage-100)',     initials: 'JP' },
};

// source: 'usda' | 'label' | 'creator'
const RECIPES = [
  {
    id: 'oats', title: 'High-Protein Overnight Oats', grad: GRAD.oats,
    cal: 420, p: 34, c: 45, f: 12, servings: 1, time: '5 min', minutes: 5,
    creator: 'livfit', source: 'usda', tags: ['breakfast', 'high-protein'],
    savedByFriends: 2, community: null, updated: '3 days ago',
    blurb: 'Creamy, make-ahead oats with a full scoop of whey and Greek yogurt. The breakfast that logs itself.',
    ingredients: [
      { name: 'Rolled oats', amount: '50 g', cal: 190, p: 7, c: 33, f: 3.4, source: 'usda' },
      { name: 'Whey protein, vanilla', amount: '1 scoop (31 g)', cal: 120, p: 24, c: 3, f: 1.5, source: 'label' },
      { name: 'Greek yogurt, 2%', amount: '80 g', cal: 60, p: 8, c: 3.5, f: 1.6, source: 'usda' },
      { name: 'Blueberries', amount: '40 g', cal: 22, p: 0, c: 5.5, f: 0.1, source: 'usda' },
      { name: 'Chia seeds', amount: '8 g', cal: 28, p: 1, c: 0, f: 1.8, source: 'usda' },
    ],
    steps: [
      'Stir oats, whey, and yogurt with 120 ml milk until smooth.',
      'Fold in chia seeds. Cover and chill overnight.',
      'Top with blueberries before serving.',
    ],
  },
  {
    id: 'shawarma', title: 'Chicken Shawarma Bowl', grad: GRAD.shawarma,
    cal: 520, p: 42, c: 48, f: 18, servings: 2, time: '25 min', minutes: 25,
    creator: 'maya', source: 'creator', tags: ['lunch', 'high-protein'],
    savedByFriends: 4, community: 'High Protein Meal Prep', updated: '2 days ago',
    blurb: 'Warm-spiced chicken thigh over lemon rice with a quick garlic-yogurt drizzle. Meal-prep friendly.',
    ingredients: [
      { name: 'Chicken thigh, grilled', amount: '160 g', cal: 280, p: 36, c: 0, f: 15, source: 'usda' },
      { name: 'Basmati rice, cooked', amount: '180 g', cal: 180, p: 4, c: 40, f: 0.4, source: 'usda' },
      { name: 'Greek yogurt, 2%', amount: '50 g', cal: 38, p: 5, c: 2, f: 1, source: 'usda' },
      { name: 'Cucumber & tomato', amount: '90 g', cal: 22, p: 1, c: 5, f: 0.2, source: 'usda' },
    ],
    steps: [
      'Toss chicken with shawarma spice; grill 6–7 min per side.',
      'Warm rice with lemon zest and a pinch of salt.',
      'Whisk yogurt with grated garlic and lemon. Assemble and drizzle.',
    ],
  },
  {
    id: 'poke', title: 'Salmon Poke Bowl', grad: GRAD.poke,
    cal: 480, p: 38, c: 42, f: 22, servings: 1, time: '15 min', minutes: 15,
    creator: 'maya', source: 'creator', tags: ['dinner', 'omega-3'],
    savedByFriends: 1, community: null, updated: 'just published',
    blurb: 'Sushi-grade salmon, sushi rice, edamame and avocado with a soy-sesame glaze.',
    ingredients: [
      { name: 'Salmon, raw', amount: '140 g', cal: 250, p: 30, c: 0, f: 14, source: 'usda' },
      { name: 'Sushi rice, cooked', amount: '150 g', cal: 170, p: 3, c: 37, f: 0.3, source: 'usda' },
      { name: 'Edamame, shelled', amount: '50 g', cal: 60, p: 5, c: 4, f: 2.5, source: 'usda' },
      { name: 'Avocado', amount: '40 g', cal: 64, p: 0.8, c: 3.4, f: 6, source: 'usda' },
    ],
    steps: [
      'Cube salmon and toss with soy, sesame oil and a touch of honey.',
      'Bed of rice, then arrange salmon, edamame, avocado.',
      'Finish with sesame seeds and scallion.',
    ],
  },
  {
    id: 'parfait', title: 'Greek Yogurt Parfait', grad: GRAD.parfait,
    cal: 310, p: 28, c: 32, f: 8, servings: 1, time: '3 min', minutes: 3,
    creator: 'dylan', source: 'creator', tags: ['snack', 'quick'],
    savedByFriends: 3, community: 'Cozy Macro Meals', updated: '1 week ago',
    blurb: 'Layered yogurt, granola and berries. The 3-minute snack that hits 28 g protein.',
    ingredients: [
      { name: 'Greek yogurt, 2%', amount: '200 g', cal: 150, p: 20, c: 9, f: 4, source: 'usda' },
      { name: 'Granola', amount: '30 g', cal: 130, p: 3, c: 19, f: 4, source: 'label' },
      { name: 'Mixed berries', amount: '60 g', cal: 30, p: 0.5, c: 7, f: 0.2, source: 'usda' },
    ],
    steps: ['Layer yogurt, granola and berries in a glass.', 'Repeat and serve cold.'],
  },
  {
    id: 'turkey', title: 'Turkey Meatball Meal Prep', grad: GRAD.turkey,
    cal: 440, p: 45, c: 30, f: 14, servings: 4, time: '35 min', minutes: 35,
    creator: 'marco', source: 'creator', tags: ['meal-prep', 'high-protein'],
    savedByFriends: 5, community: 'High Protein Meal Prep', updated: '4 days ago',
    blurb: 'Batch-cook lean turkey meatballs over orzo. Four containers, forty-five grams of protein each.',
    ingredients: [
      { name: 'Ground turkey, 93%', amount: '170 g', cal: 240, p: 38, c: 0, f: 10, source: 'usda' },
      { name: 'Orzo, cooked', amount: '120 g', cal: 160, p: 5, c: 28, f: 1, source: 'usda' },
      { name: 'Marinara', amount: '80 g', cal: 40, p: 1.5, c: 7, f: 1, source: 'label' },
    ],
    steps: [
      'Mix turkey with egg, breadcrumb and herbs; roll into 16 meatballs.',
      'Bake 20 min at 200°C, then simmer in marinara.',
      'Portion over orzo into four containers.',
    ],
  },
  {
    id: 'lentil', title: 'Cozy Lentil Soup', grad: GRAD.lentil,
    cal: 360, p: 22, c: 48, f: 8, servings: 6, time: '40 min', minutes: 40,
    creator: 'jordan', source: 'creator', tags: ['cozy', 'vegetarian'],
    savedByFriends: 2, community: 'Cozy Macro Meals', updated: '5 days ago',
    blurb: 'A big pot of warming red-lentil soup. Plant protein that actually keeps you full.',
    ingredients: [
      { name: 'Red lentils, dry', amount: '60 g', cal: 200, p: 15, c: 34, f: 1, source: 'usda' },
      { name: 'Mirepoix & tomato', amount: '120 g', cal: 60, p: 2, c: 12, f: 0.5, source: 'usda' },
      { name: 'Olive oil', amount: '7 g', cal: 60, p: 0, c: 0, f: 7, source: 'usda' },
    ],
    steps: ['Sweat onion, carrot, celery in oil.', 'Add lentils, tomato and stock; simmer 30 min.', 'Blend half for body; season and serve.'],
  },
  {
    id: 'tofu', title: 'Spicy Tofu Rice Bowl', grad: GRAD.tofu,
    cal: 470, p: 30, c: 52, f: 16, servings: 2, time: '20 min', minutes: 20,
    creator: 'livfit', source: 'creator', tags: ['dinner', 'vegetarian'],
    savedByFriends: 1, community: null, updated: '6 days ago',
    blurb: 'Crispy gochujang tofu over rice with quick-pickled cucumber.',
    ingredients: [
      { name: 'Firm tofu', amount: '150 g', cal: 170, p: 18, c: 4, f: 10, source: 'usda' },
      { name: 'Jasmine rice, cooked', amount: '160 g', cal: 200, p: 4, c: 44, f: 0.4, source: 'usda' },
      { name: 'Gochujang glaze', amount: '30 g', cal: 70, p: 1, c: 12, f: 1, source: 'label' },
    ],
    steps: ['Press and cube tofu; pan-crisp until golden.', 'Toss in gochujang glaze.', 'Serve over rice with pickled cucumber.'],
  },
  {
    id: 'pancakes', title: 'Cottage Cheese Pancakes', grad: GRAD.pancakes,
    cal: 390, p: 33, c: 40, f: 10, servings: 1, time: '12 min', minutes: 12,
    creator: 'alex', source: 'creator', tags: ['breakfast', 'high-protein'],
    savedByFriends: 3, community: 'High Protein Meal Prep', updated: '1 week ago',
    blurb: 'Blender pancakes with cottage cheese and oats. Fluffy, 33 g protein, no powder.',
    ingredients: [
      { name: 'Cottage cheese', amount: '120 g', cal: 110, p: 14, c: 5, f: 4, source: 'usda' },
      { name: 'Rolled oats', amount: '40 g', cal: 150, p: 5, c: 27, f: 3, source: 'usda' },
      { name: 'Egg', amount: '1 large', cal: 70, p: 6, c: 0.4, f: 5, source: 'usda' },
    ],
    steps: ['Blend everything until smooth; rest 5 min.', 'Cook small pancakes 2 min per side.', 'Stack and top with berries.'],
  },
];

const recipeById = (id) => RECIPES.find((r) => r.id === id);

// Today's private log — meal sections
const TODAY_LOG = {
  breakfast: [{ recipe: 'oats', servings: 1 }],
  lunch: [{ recipe: 'shawarma', servings: 1 }],
  snack: [{ recipe: 'parfait', servings: 1 }],
  dinner: [],
};

const GOALS = { cal: 2200, p: 160, c: 220, f: 70 };

const COMMUNITIES = [
  { id: 'hpmp', name: 'High Protein Meal Prep', members: 8420, recipes: 312, grad: GRAD.turkey,
    blurb: 'Batch-cook recipes that clear 40 g protein a serving.', tint: 'var(--sage-200)' },
  { id: 'cozy', name: 'Cozy Macro Meals', members: 5130, recipes: 198, grad: GRAD.lentil,
    blurb: 'Warm, comforting food that still fits your macros.', tint: 'var(--blush-200)' },
  { id: 'sunday', name: 'Sunday Kitchen', members: 3960, recipes: 142, grad: GRAD.parfait,
    blurb: 'Slow weekend cooking, shared every Sunday.', tint: 'var(--lavender-200)' },
  { id: 'college', name: 'College Lifters', members: 6740, recipes: 256, grad: GRAD.tofu,
    blurb: 'Dorm-friendly, budget, high-protein.', tint: 'var(--sand-300)' },
];
const communityById = (id) => COMMUNITIES.find((c) => c.id === id);

// Recipe-centered friend activity
const ACTIVITY = [
  { id: 'a1', user: 'maya', verb: 'published', recipe: 'poke', when: '12m' },
  { id: 'a2', user: 'alex', verb: 'forked', recipe: 'turkey', when: '1h' },
  { id: 'a3', user: 'jordan', verb: 'saved', recipe: 'oats', when: '3h' },
  { id: 'a4', user: 'dylan', verb: 'shared', recipe: 'shawarma', when: '5h', community: 'hpmp' },
];

// "Me" — the logged-in user
const ME = {
  handle: 'dylan', name: 'Dylan Reed', initials: 'DR', tint: 'var(--blush-200)',
  bio: 'Macro-friendly recipes I actually want to eat.',
  recipes: 24, collections: 4, followers: 128, following: 86,
  myRecipeIds: ['shawarma', 'parfait', 'poke', 'lentil'],
  savedRecipeIds: ['oats', 'turkey', 'pancakes'],
  draftIds: ['tofu'],
};

const SOURCE_LABEL = { usda: 'USDA verified', label: 'Label verified', creator: 'Creator recipe' };

Object.assign(window, {
  GRAD, USERS, RECIPES, recipeById, TODAY_LOG, GOALS,
  COMMUNITIES, communityById, ACTIVITY, ME, SOURCE_LABEL,
});
