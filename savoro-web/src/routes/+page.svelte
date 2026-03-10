<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { inview } from '$lib/actions/inview';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import SectionLabel from '$lib/components/ui/SectionLabel.svelte';
	import WaitlistForm from '$lib/components/ui/WaitlistForm.svelte';
	import MacroSummary from '$lib/components/product-preview/MacroSummary.svelte';
	import QuickLogChips from '$lib/components/product-preview/QuickLogChips.svelte';
	import RecipeCard from '$lib/components/product-preview/RecipeCard.svelte';
	import TrendChart from '$lib/components/product-preview/TrendChart.svelte';
	import FoodList from '$lib/components/product-preview/FoodList.svelte';
	import DailySnapshot from '$lib/components/product-preview/DailySnapshot.svelte';
	import ConfirmButton from '$lib/components/product-preview/ConfirmButton.svelte';
	import FoodCard from '$lib/components/product-preview/FoodCard.svelte';
	import { recipes } from '$lib/data/recipes';

	let heroMounted = $state(false);
	let showThesis = $state(false);
	let showPillars = $state(false);
	let showPreview = $state(false);
	let showRecipes = $state(false);
	let showDiff = $state(false);
	let showCta = $state(false);

	$effect(() => {
		heroMounted = true;
	});

	const stances = [
		{
			title: 'No shame, no streaks',
			description:
				"We don't punish missed days or gamify consistency. Your relationship with food is yours.",
			icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
		},
		{
			title: 'Your data stays yours',
			description:
				'Your nutrition data is personal. We will never sell it, mine it for ads, or share it with third parties.',
			icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
		},
		{
			title: 'Built for real food',
			description:
				'Recipes, home cooking, and mixed dishes — not just barcodes and packaged foods.',
			icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25'
		},
		{
			title: 'AI that helps, never judges',
			description:
				'Smart suggestions and voice logging that reduce friction — without pretending to know better than you.',
			icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z'
		}
	];
</script>

<svelte:head>
	<title>Savoro — Nutrition, Reimagined</title>
	<meta
		name="description"
		content="Your recipes are your food log. Savoro is a modern nutrition platform with fast macro tracking, log-native recipes, and data you can trust."
	/>
</svelte:head>

<!-- ====== HERO ====== -->
<section class="relative overflow-hidden">
	<div
		class="pointer-events-none absolute inset-0 overflow-hidden"
		aria-hidden="true"
	>
		<div class="absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-blush-100/40 blur-3xl"></div>
		<div class="absolute top-48 -left-24 h-72 w-72 rounded-full bg-sage-100/30 blur-3xl"></div>
		<div class="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-lavender-100/20 blur-3xl"></div>
	</div>

	<div class="relative mx-auto max-w-6xl px-6 pb-20 pt-20 lg:pb-32 lg:pt-28">
		{#if heroMounted}
			<div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
				<div class="text-center lg:text-left">
					<div in:fly={{ y: 20, duration: 600, easing: cubicOut }}>
						<span
							class="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white/70 px-4 py-1.5 text-xs font-medium text-sand-500 backdrop-blur-sm"
						>
							<span class="inline-block h-1.5 w-1.5 rounded-full bg-sage-300"></span>
							Coming soon
						</span>
					</div>

					<h1
						class="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-sand-900 sm:text-5xl lg:text-6xl"
						in:fly={{ y: 24, duration: 700, delay: 100, easing: cubicOut }}
					>
						Your recipes are<br />your food log.
					</h1>

					<p
						class="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-sand-500 lg:mx-0"
						in:fly={{ y: 20, duration: 600, delay: 200, easing: cubicOut }}
					>
						Savoro unifies meal logging and recipe management into one fluid experience — built for
						lifters, meal preppers, and anyone who wants to actually enjoy tracking.
					</p>

					<div
						class="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start"
						in:fly={{ y: 20, duration: 600, delay: 300, easing: cubicOut }}
					>
						<Button size="lg" href="#waitlist">Join the Waitlist</Button>
						<Button variant="secondary" size="lg" href="/philosophy">
							Our Philosophy
							<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
								<line x1="3" y1="8" x2="12" y2="8" />
								<polyline points="8.5 4.5 12 8 8.5 11.5" />
							</svg>
						</Button>
					</div>
				</div>

				<div
					class="mx-auto w-full max-w-sm lg:mx-0"
					in:fly={{ y: 40, duration: 800, delay: 400, easing: cubicOut }}
				>
					<div class="rotate-1 transition-transform duration-500 hover:rotate-0">
						<DailySnapshot />
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>

<!-- ====== PRODUCT THESIS ====== -->
<section
	class="bg-sand-100/50 py-24 lg:py-32"
	use:inview
	oninview={() => (showThesis = true)}
>
	{#if showThesis}
		<div class="mx-auto max-w-6xl px-6">
			<div class="grid items-center gap-12 md:grid-cols-2 md:gap-16">
				<div in:fly={{ x: -20, duration: 500, easing: cubicOut }}>
					<SectionLabel text="The idea" class="mb-4" />
					<h2 class="text-3xl font-bold leading-tight tracking-tight text-sand-900 md:text-4xl">
						One object,<br />two superpowers
					</h2>
					<p class="mt-5 text-base leading-relaxed text-sand-500">
						Most apps make you choose: are you logging or cooking? Savoro says both. Every meal you
						track becomes a shareable recipe. Every recipe auto-calculates your macros.
					</p>
					<div class="mt-8 space-y-3">
						{#each [
							{ label: 'For lifters', desc: 'Fast, repeatable, gram-level tracking' },
							{ label: 'For meal preppers', desc: 'Recipes become reusable templates' },
							{ label: 'For everyone', desc: 'Beautiful, shareable recipe pages' }
						] as segment}
							<div class="flex items-start gap-3">
								<div class="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blush-300"></div>
								<div>
									<span class="text-sm font-semibold text-sand-800">{segment.label}</span>
									<span class="ml-1 text-sm text-sand-500">— {segment.desc}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div
					class="flex flex-col items-center gap-4"
					in:fly={{ x: 20, duration: 500, delay: 150, easing: cubicOut }}
				>
					<div class="w-full max-w-[280px]">
						<FoodCard
							name="Greek Yogurt, 0% Fat"
							calories={100}
							protein={18}
							carbs={4}
							fat={0}
							amount="Fage · 170g"
						/>
					</div>
					<div class="flex items-center gap-2 text-sand-300">
						<div class="h-px w-8 bg-sand-200"></div>
						<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M10 3v14M10 3l-4 4M10 3l4 4M10 17l-4-4M10 17l4-4" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						<div class="h-px w-8 bg-sand-200"></div>
					</div>
					<div class="w-full max-w-[280px]">
						<RecipeCard
							title="Greek Yogurt Power Bowl"
							calories={320}
							protein={28}
							carbs={35}
							fat={8}
							prepTime="5 min"
							servings={1}
							tags={['breakfast', 'high-protein']}
							gradient="from-lavender-100 via-blush-100 to-sand-100"
						/>
					</div>
				</div>
			</div>
		</div>
	{/if}
</section>

<!-- ====== PILLARS ====== -->
<section
	class="py-24 lg:py-32"
	use:inview
	oninview={() => (showPillars = true)}
>
	{#if showPillars}
		<div class="mx-auto max-w-6xl px-6">
			<div class="mb-14 text-center" in:fly={{ y: 20, duration: 500, easing: cubicOut }}>
				<SectionLabel text="Why Savoro" class="mb-4" />
				<h2 class="text-3xl font-bold tracking-tight text-sand-900 md:text-4xl">
					Trust. Speed. Shareability.
				</h2>
				<p class="mx-auto mt-4 max-w-xl text-base text-sand-500">
					Three things every nutrition app should get right — and almost none do.
				</p>
			</div>

			<div class="grid gap-6 md:grid-cols-3">
				{#each [
					{
						icon: 'trust',
						title: 'Trusted data',
						description:
							'Every nutrition value is traceable to a source — USDA, verified labels, or curated submissions. No mystery entries.',
						component: 'food'
					},
					{
						icon: 'speed',
						title: 'Respect your time',
						description:
							'Quick-log chips, smart search, barcode scanning. Log a meal in seconds, not minutes.',
						component: 'chips'
					},
					{
						icon: 'share',
						title: 'Share beautifully',
						description:
							'Every recipe gets a public page with macros, servings, and one-tap logging. Share meals like playlists.',
						component: 'recipe'
					}
				] as pillar, i}
					<div in:fly={{ y: 30, duration: 500, delay: 100 + i * 100, easing: cubicOut }}>
						<GlassCard hover class="flex h-full flex-col">
							<div class="mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-chip)] bg-sand-100">
								{#if pillar.icon === 'trust'}
									<svg class="h-5 w-5 text-sand-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
										<path d="M10 2l6 3v5c0 4-2.5 6.5-6 8-3.5-1.5-6-4-6-8V5l6-3z" stroke-linejoin="round" />
										<path d="M7 10l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
									</svg>
								{:else if pillar.icon === 'speed'}
									<svg class="h-5 w-5 text-sand-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
										<path d="M11 2L5 12h5l-1 6 6-10h-5l1-6z" stroke-linejoin="round" />
									</svg>
								{:else}
									<svg class="h-5 w-5 text-sand-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
										<circle cx="5" cy="10" r="2" />
										<circle cx="15" cy="5" r="2" />
										<circle cx="15" cy="15" r="2" />
										<path d="M7 10l6-4M7 10l6 4" />
									</svg>
								{/if}
							</div>
							<h3 class="mb-2 text-lg font-semibold text-sand-900">{pillar.title}</h3>
							<p class="mb-5 flex-1 text-sm leading-relaxed text-sand-500">{pillar.description}</p>
							<div class="mt-auto">
								{#if pillar.component === 'food'}
									<FoodCard
										name="Chicken Breast (grilled)"
										calories={165}
										protein={31}
										carbs={0}
										fat={3.6}
										amount="100g cooked · USDA verified"
									/>
								{:else if pillar.component === 'chips'}
									<QuickLogChips />
								{:else}
									<RecipeCard
										title={recipes[0].title}
										calories={recipes[0].calories}
										protein={recipes[0].protein}
										carbs={recipes[0].carbs}
										fat={recipes[0].fat}
										servings={recipes[0].servings}
										prepTime={recipes[0].prepTime}
										tags={recipes[0].tags}
										gradient={recipes[0].gradient}
										class="!shadow-none !border-sand-200/30"
									/>
								{/if}
							</div>
						</GlassCard>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>

<!-- ====== PRODUCT SHOWCASE ====== -->
<section
	class="bg-sand-100/50 py-24 lg:py-32"
	use:inview
	oninview={() => (showPreview = true)}
>
	{#if showPreview}
		<div class="mx-auto max-w-6xl px-6">
			<div class="mb-14 text-center" in:fly={{ y: 20, duration: 500, easing: cubicOut }}>
				<SectionLabel text="Product preview" class="mb-4" />
				<h2 class="text-3xl font-bold tracking-tight text-sand-900 md:text-4xl">
					Designed to disappear into your day
				</h2>
				<p class="mx-auto mt-4 max-w-xl text-base text-sand-500">
					Clean interface, real data, zero friction. Here's a taste of what tracking feels like in
					Savoro.
				</p>
			</div>

			<div
				class="mx-auto max-w-4xl"
				in:fly={{ y: 30, duration: 600, delay: 150, easing: cubicOut }}
			>
				<div
					class="rounded-[var(--radius-glass)] border border-sand-200/40 bg-white/50 p-4 shadow-float backdrop-blur-sm md:p-8"
				>
					<div class="mb-6">
						<p class="mb-2 text-xs font-medium text-sand-400">Quick log</p>
						<QuickLogChips />
					</div>
					<div class="grid gap-6 md:grid-cols-2">
						<div class="space-y-6">
							<MacroSummary />
						</div>
						<div class="space-y-6">
							<TrendChart />
							<FoodList />
						</div>
					</div>
					<div class="mt-6 flex justify-center">
						<ConfirmButton label="Log Meal" />
					</div>
				</div>
			</div>
		</div>
	{/if}
</section>

<!-- ====== RECIPES BRIDGE ====== -->
<section
	class="py-24 lg:py-32"
	use:inview
	oninview={() => (showRecipes = true)}
>
	{#if showRecipes}
		<div class="mx-auto max-w-6xl px-6">
			<div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
				<div in:fly={{ x: -20, duration: 500, easing: cubicOut }}>
					<SectionLabel text="Log-native recipes" class="mb-4" />
					<h2 class="text-3xl font-bold leading-tight tracking-tight text-sand-900 md:text-4xl">
						Cook once.<br />Log forever.
					</h2>
					<p class="mt-5 text-base leading-relaxed text-sand-500">
						Every recipe in Savoro is a food log entry waiting to happen. Precise macros per serving,
						cooking yield adjustments, and one-tap logging — all baked in.
					</p>
					<p class="mt-3 text-base leading-relaxed text-sand-500">
						Share your recipes with beautiful public pages that anyone can save, cook from, and log.
						Found your perfect post-workout meal? One tap and it's a shareable recipe with a public
						link.
					</p>
					<div class="mt-8">
						<Button href="/recipes">
							Explore recipes
							<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
								<line x1="3" y1="8" x2="12" y2="8" />
								<polyline points="8.5 4.5 12 8 8.5 11.5" />
							</svg>
						</Button>
					</div>
				</div>

				<div
					class="grid gap-4 sm:grid-cols-2"
					in:fly={{ x: 20, duration: 500, delay: 150, easing: cubicOut }}
				>
					{#each recipes.slice(0, 4) as recipe}
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
						/>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</section>

<!-- ====== DIFFERENTIATION ====== -->
<section
	class="bg-sand-100/50 py-24 lg:py-32"
	use:inview
	oninview={() => (showDiff = true)}
>
	{#if showDiff}
		<div class="mx-auto max-w-6xl px-6">
			<div class="text-center" in:fly={{ y: 20, duration: 500, easing: cubicOut }}>
				<SectionLabel text="Our stance" class="mb-4" />
				<h2 class="text-3xl font-bold tracking-tight text-sand-900 md:text-4xl">
					Not another calorie counter.
				</h2>
				<p class="mx-auto mt-4 max-w-2xl text-base text-sand-500">
					We have opinions about how nutrition tools should work. These aren't features — they're
					principles.
				</p>
			</div>

			<div class="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2">
				{#each stances as stance, i}
					<div in:fly={{ y: 20, duration: 400, delay: 100 + i * 80, easing: cubicOut }}>
						<GlassCard hover class="h-full">
							<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100">
								<svg
									class="h-5 w-5 text-sand-500"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d={stance.icon} />
								</svg>
							</div>
							<h3 class="text-base font-bold text-sand-900">{stance.title}</h3>
							<p class="mt-2 text-sm leading-relaxed text-sand-500">{stance.description}</p>
						</GlassCard>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>

<!-- ====== WAITLIST CTA ====== -->
<section
	id="waitlist"
	class="relative overflow-hidden bg-sand-900 py-24 lg:py-32"
	use:inview
	oninview={() => (showCta = true)}
>
	<div class="pointer-events-none absolute -top-32 left-1/4 h-[400px] w-[400px] rounded-full bg-blush-400/10 blur-[100px]"></div>
	<div class="pointer-events-none absolute -bottom-32 right-1/4 h-[300px] w-[300px] rounded-full bg-sage-400/10 blur-[80px]"></div>

	{#if showCta}
		<div class="relative mx-auto max-w-2xl px-6 text-center">
			<h2
				class="text-3xl font-bold tracking-tight text-sand-100 md:text-4xl"
				in:fly={{ y: 20, duration: 500, easing: cubicOut }}
			>
				Ready to rethink tracking?
			</h2>
			<p
				class="mx-auto mt-5 max-w-lg text-lg text-sand-400"
				in:fly={{ y: 20, duration: 500, delay: 100, easing: cubicOut }}
			>
				We're building Savoro for people who care about what they eat and want a tool that respects
				them. Join the waitlist for early access.
			</p>
			<div in:fly={{ y: 20, duration: 500, delay: 200, easing: cubicOut }}>
				<WaitlistForm variant="dark" class="mt-8" />
			</div>
			<div
				class="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-sand-500"
				in:fly={{ y: 20, duration: 500, delay: 300, easing: cubicOut }}
			>
				{#each ['No credit card required', 'Free tier available', 'Cancel anytime'] as item}
					<span class="flex items-center gap-1.5">
						<svg class="h-3.5 w-3.5 text-sage-400" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M3 7l3 3 5-5" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						{item}
					</span>
				{/each}
			</div>
		</div>
	{/if}
</section>
