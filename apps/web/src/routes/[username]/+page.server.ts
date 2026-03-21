import { error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { user, recipe } from '@savoro/db/src/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const profile = await db
		.select({
			id: user.id,
			username: user.username,
			displayName: user.displayName,
			bio: user.bio,
			avatarUrl: user.avatarUrl
		})
		.from(user)
		.where(and(eq(user.username, params.username), eq(user.isPublic, true)))
		.get();

	if (!profile) {
		error(404, 'User not found');
	}

	const recipes = await db
		.select({
			id: recipe.id,
			slug: recipe.slug,
			title: recipe.title,
			description: recipe.description,
			servings: recipe.servings,
			prepTime: recipe.prepTime,
			cookTime: recipe.cookTime,
			tags: recipe.tags,
			imageUrl: recipe.imageUrl,
			caloriesPerServing: recipe.caloriesPerServing,
			proteinPerServing: recipe.proteinPerServing,
			carbPerServing: recipe.carbPerServing,
			fatPerServing: recipe.fatPerServing,
			createdAt: recipe.createdAt
		})
		.from(recipe)
		.where(and(eq(recipe.userId, profile.id), eq(recipe.isPublic, true)))
		.orderBy(desc(recipe.createdAt))
		.all();

	return { profile, recipes };
};
