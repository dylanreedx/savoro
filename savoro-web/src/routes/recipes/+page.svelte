<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { inview } from '$lib/actions/inview';
	import SectionLabel from '$lib/components/ui/SectionLabel.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import WaitlistForm from '$lib/components/ui/WaitlistForm.svelte';
	import RecipeCard from '$lib/components/product-preview/RecipeCard.svelte';
	import ConfirmButton from '$lib/components/product-preview/ConfirmButton.svelte';
	import { recipes } from '$lib/data/recipes';

	let heroMounted = $state(false);
	let showGrid = $state(false);
	let showHow = $state(false);
	let showCta = $state(false);

	$effect(() => {
		heroMounted = true;
	});
</script>

<svelte:head>
	<title>Recipes — Savoro</title>
	<meta
		name="description"
		content="Log-native recipes with precise macros, shareable pages, and one-tap logging. Explore what recipe tracking looks like in Savoro."
	/>
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden">
	<div class="pointer-events-none absolute -top-24 right-1/4 h-80 w-80 rounded-full bg-blush-100/30 blur-3xl"></div>

	<div class="relative mx-auto max-w-4xl px-6 pb-16 pt-20 text-center lg:pb-20 lg:pt-28">
		{#if heroMounted}
			<div in:fly={{ y: 20, duration: 600, easing: cubicOut }}>
				<SectionLabel text="Log-Native Recipes" class="mb-6" />
			</div>
			<h1
				class="text-4xl font-extrabold tracking-tight text-sand-900 sm:text-5xl lg:text-6xl"
				in:fly={{ y: 24, duration: 700, delay: 100, easing: cubicOut }}
			>
				Cook once.<br />Log forever.
			</h1>
			<p
				class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-sand-500 sm:text-xl"
				in:fly={{ y: 20, duration: 600, delay: 200, easing: cubicOut }}
			>
				Every recipe is a reusable template with precise macros baked in. Share your favorites with
				beautiful public pages that anyone can save and log.
			</p>
		{/if}
	</div>
</section>

<!-- Recipe grid -->
<section
	class="bg-sand-100/50 py-24 lg:py-32"
	use:inview
	oninview={() => (showGrid = true)}
>
	{#if showGrid}
		<div class="mx-auto max-w-6xl px-6">
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each recipes as recipe, i}
					<div in:fly={{ y: 30, duration: 500, delay: 80 * i, easing: cubicOut }}>
						<RecipeCard
							title={recipe.title}
							calories={recipe.calories}
							protein={recipe.protein}
							carbs={recipe.carbs}
							fat={recipe.fat}
							servings={recipe.servings}
							prepTime={recipe.prepTime}
							tags={recipe.tags}
							gradient={recipe.gradient}
							description={recipe.description}
						/>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>

<!-- How it works -->
<section
	class="py-24 lg:py-32"
	use:inview
	oninview={() => (showHow = true)}
>
	{#if showHow}
		<div class="mx-auto max-w-6xl px-6">
			<div class="mb-14 text-center" in:fly={{ y: 20, duration: 500, easing: cubicOut }}>
				<SectionLabel text="How it works" class="mb-4" />
				<h2 class="text-3xl font-bold tracking-tight text-sand-900 md:text-4xl">
					Three steps to better tracking.
				</h2>
			</div>

			<div class="grid gap-6 md:grid-cols-3">
				{#each [
					{
						step: '01',
						title: 'Create or discover',
						description:
							'Build your own recipes from ingredients, import from a URL, or discover meals shared by others. Every recipe calculates macros automatically.'
					},
					{
						step: '02',
						title: 'Cook and log',
						description:
							'When you eat, tap the recipe and select your serving size. One action logs the entire meal with exact macros — no re-entering ingredients.'
					},
					{
						step: '03',
						title: 'Share and iterate',
						description:
							'Every recipe gets a public page you can share anywhere. Version your recipes over time. See how substitutions change the nutrition.'
					}
				] as item, i}
					<div in:fly={{ y: 20, duration: 500, delay: 100 + i * 100, easing: cubicOut }}>
						<GlassCard class="h-full">
							<span class="text-3xl font-extrabold text-sand-200">{item.step}</span>
							<h3 class="mt-3 text-lg font-bold text-sand-900">{item.title}</h3>
							<p class="mt-2 text-sm leading-relaxed text-sand-500">{item.description}</p>
						</GlassCard>
					</div>
				{/each}
			</div>

			<div class="mt-12 flex justify-center">
				<ConfirmButton label="Log a recipe" />
			</div>
		</div>
	{/if}
</section>

<!-- CTA -->
<section
	id="waitlist"
	class="relative overflow-hidden bg-sand-900 py-24 lg:py-32"
	use:inview
	oninview={() => (showCta = true)}
>
	{#if showCta}
		<div class="relative mx-auto max-w-2xl px-6 text-center">
			<h2
				class="text-3xl font-bold tracking-tight text-sand-100 md:text-4xl"
				in:fly={{ y: 20, duration: 500, easing: cubicOut }}
			>
				Be first to try log-native recipes.
			</h2>
			<p
				class="mx-auto mt-5 max-w-lg text-lg text-sand-400"
				in:fly={{ y: 20, duration: 500, delay: 100, easing: cubicOut }}
			>
				Join the waitlist for early access to Savoro and help us shape how recipes and logging should work together.
			</p>
			<div in:fly={{ y: 20, duration: 500, delay: 200, easing: cubicOut }}>
				<WaitlistForm variant="dark" class="mt-8" />
			</div>
		</div>
	{/if}
</section>
