import { error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { user, recipe, recipeIngredient, food, serving } from '@savoro/db/src/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const creator = await db
		.select({
			id: user.id,
			username: user.username,
			displayName: user.displayName,
			avatarUrl: user.avatarUrl
		})
		.from(user)
		.where(eq(user.username, params.username))
		.get();

	if (!creator) {
		error(404, 'User not found');
	}

	const row = await db
		.select()
		.from(recipe)
		.where(
			and(eq(recipe.userId, creator.id), eq(recipe.slug, params.slug), eq(recipe.isPublic, true))
		)
		.get();

	if (!row) {
		error(404, 'Recipe not found');
	}

	const ingredients = await db
		.select({
			id: recipeIngredient.id,
			quantity: recipeIngredient.quantity,
			unit: recipeIngredient.unit,
			label: recipeIngredient.label,
			sortOrder: recipeIngredient.sortOrder,
			foodName: food.name,
			servingDescription: serving.description,
			servingCalories: serving.calories,
			servingProtein: serving.protein,
			servingCarb: serving.carb,
			servingFat: serving.fat
		})
		.from(recipeIngredient)
		.leftJoin(food, eq(recipeIngredient.foodId, food.id))
		.leftJoin(serving, eq(recipeIngredient.servingId, serving.id))
		.where(eq(recipeIngredient.recipeId, row.id))
		.orderBy(recipeIngredient.sortOrder)
		.all();

	return {
		recipe: {
			id: row.id,
			slug: row.slug,
			title: row.title,
			description: row.description,
			instructions: row.instructions,
			servings: row.servings,
			prepTime: row.prepTime,
			cookTime: row.cookTime,
			imageUrl: row.imageUrl,
			tags: row.tags as string[],
			caloriesPerServing: row.caloriesPerServing,
			proteinPerServing: row.proteinPerServing,
			carbPerServing: row.carbPerServing,
			fatPerServing: row.fatPerServing,
			forkCount: row.forkCount,
			createdAt: row.createdAt
		},
		creator,
		ingredients
	};
};
