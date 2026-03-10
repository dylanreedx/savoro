export interface BlogPost {
	slug: string;
	title: string;
	date: string;
	readTime: string;
	summary: string;
	content: string;
	tags: string[];
}

export const blogPosts: BlogPost[] = [
	{
		slug: 'why-were-building-savoro',
		title: 'Why we\'re building Savoro',
		date: 'March 2026',
		readTime: '4 min read',
		summary: 'Most nutrition apps treat recipes and logging as separate problems. We think they\'re the same thing.',
		content: `Every macro tracker on the market makes the same assumption: logging food and cooking food are different activities. You track in one app, find recipes in another, and hope the nutrition data lines up.

We started Savoro because we kept running into the same friction. You make a chicken shawarma bowl on Sunday, portion it into four containers, and then spend five minutes on Monday trying to reconstruct it in your tracker — searching for each ingredient, guessing at oil amounts, wondering if "chicken thigh" means raw or cooked.

The insight is simple: a recipe already contains everything a food log needs. Ingredients, quantities, yield, servings. If your recipe format is structured right, logging a meal is just selecting a serving of something you already built.

That's the core of Savoro. Recipes and logs are the same object. Cook once, log forever. Share with anyone.

We're still early. The product is evolving. But the foundation — trusted nutrition data, fast logging, and recipes that actually work as reusable templates — that's what we're building toward.`,
		tags: ['product', 'vision']
	},
	{
		slug: 'the-database-trust-problem',
		title: 'The problem with nutrition databases',
		date: 'March 2026',
		readTime: '5 min read',
		summary: 'User-generated food databases are huge, but accuracy varies wildly. We think provenance is the answer.',
		content: `If you've used a mainstream calorie tracker, you've probably had this experience: you scan a barcode, and the entry that comes back has the wrong serving size. Or you search for "brown rice" and get fifteen entries with different calorie counts, none of which cite a source.

This is the database trust problem. The largest food databases are community-driven, which means anyone can add or edit entries. That's great for coverage — you can find almost anything — but it creates a trust gap. How do you know the entry you picked is accurate?

Research backs this up. A 2025 study comparing nutrition tracking apps found significant inconsistencies between platforms for the same foods. The issue isn't that the data is always wrong — it's that you can't tell when it's right.

Our approach at Savoro is provenance-first. Every nutrition value traces back to a source: a government database entry, a barcode label scan, a manufacturer's data. When you log "chicken breast, 150g cooked," you can see exactly where those macros came from and when they were last verified.

This doesn't make errors impossible, but it makes them correctable and transparent. If something's wrong, you can see why, fix it for yourself immediately, and flag it for review. Trust isn't about perfection — it's about accountability.`,
		tags: ['data', 'trust']
	},
	{
		slug: 'recipes-as-data',
		title: 'Recipes as data: a new mental model',
		date: 'February 2026',
		readTime: '3 min read',
		summary: 'What happens when every recipe is also a nutrition template, a shareable page, and a one-tap log entry?',
		content: `Think about how recipes work on most platforms. They're content — a photo, a story, a list of steps. Nutrition information, if it exists at all, is an afterthought calculated from a generic ingredient database.

Now think about how food logs work in tracking apps. They're data — grams, calories, macros. There's no narrative, no context, no connection to the meal you actually cooked.

Savoro treats recipes as structured data that happens to be beautiful. Every recipe has precise ingredient quantities, cooking yield adjustments, and per-serving macro breakdowns baked in. When you log a meal, you're selecting a serving of a recipe — not re-entering ingredients from scratch.

This creates some interesting possibilities. Your recipe page becomes a shareable landing page with accurate nutrition built in. Fitness creators can link to recipes that their audience can save and log in one tap. Meal preppers can version their recipes over time and see how substitutions change the macros.

The recipe isn't just content. It's a reusable, loggable, shareable nutrition object.`,
		tags: ['product', 'recipes']
	}
];
