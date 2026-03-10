export interface Recipe {
	id: string;
	title: string;
	prepTime: string;
	servings: number;
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	tags: string[];
	gradient: string;
	description: string;
}

export const recipes: Recipe[] = [
	{
		id: 'overnight-oats',
		title: 'High-Protein Overnight Oats',
		prepTime: '5 min prep',
		servings: 1,
		calories: 420,
		protein: 34,
		carbs: 45,
		fat: 12,
		tags: ['breakfast', 'meal-prep', 'high-protein'],
		gradient: 'from-blush-200 via-blush-100 to-sage-100',
		description: 'Greek yogurt, oats, protein powder, chia seeds, and berries. Prep in 5 minutes, grab and go.'
	},
	{
		id: 'chicken-shawarma-bowl',
		title: 'Chicken Shawarma Bowl',
		prepTime: '25 min',
		servings: 2,
		calories: 520,
		protein: 42,
		carbs: 48,
		fat: 18,
		tags: ['lunch', 'high-protein', 'meal-prep'],
		gradient: 'from-sand-200 via-blush-100 to-lavender-100',
		description: 'Spiced chicken thigh over herbed rice with pickled onions, cucumber, and tahini.'
	},
	{
		id: 'salmon-poke',
		title: 'Salmon Poke Bowl',
		prepTime: '15 min',
		servings: 1,
		calories: 480,
		protein: 38,
		carbs: 42,
		fat: 22,
		tags: ['dinner', 'omega-3', 'fresh'],
		gradient: 'from-sage-200 via-sage-100 to-blush-50',
		description: 'Sushi-grade salmon over seasoned rice with avocado, edamame, and ponzu.'
	},
	{
		id: 'greek-yogurt-parfait',
		title: 'Greek Yogurt Parfait',
		prepTime: '3 min',
		servings: 1,
		calories: 310,
		protein: 28,
		carbs: 32,
		fat: 8,
		tags: ['snack', 'quick', 'high-protein'],
		gradient: 'from-lavender-100 via-blush-100 to-sand-100',
		description: 'Thick Greek yogurt layered with granola, honey, and seasonal fruit.'
	},
	{
		id: 'turkey-meatballs',
		title: 'Turkey Meatball Meal Prep',
		prepTime: '35 min',
		servings: 4,
		calories: 440,
		protein: 45,
		carbs: 30,
		fat: 14,
		tags: ['meal-prep', 'batch-cook', 'high-protein'],
		gradient: 'from-sand-300 via-sand-200 to-blush-100',
		description: 'Lean turkey meatballs in marinara over whole wheat pasta. Makes four containers.'
	},
	{
		id: 'avo-egg-toast',
		title: 'Avocado Egg Toast',
		prepTime: '8 min',
		servings: 1,
		calories: 380,
		protein: 22,
		carbs: 28,
		fat: 20,
		tags: ['breakfast', 'quick', 'vegetarian'],
		gradient: 'from-sage-200 via-sage-100 to-sand-100',
		description: 'Sourdough with smashed avocado, soft-boiled egg, chili flakes, and flaky salt.'
	}
];
