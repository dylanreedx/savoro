<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	let { data } = $props();

	let r = $derived(data.recipe);
	let totalTime = $derived((r.prepTime ?? 0) + (r.cookTime ?? 0));

	function formatTime(minutes: number | null): string {
		if (!minutes) return '';
		if (minutes < 60) return `${minutes} min`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m ? `${h}h ${m}m` : `${h}h`;
	}

	function isoDuration(minutes: number): string {
		if (!minutes) return 'PT0M';
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		let d = 'PT';
		if (h) d += `${h}H`;
		if (m) d += `${m}M`;
		return d;
	}

	// JSON-LD Recipe structured data
	let jsonLd = $derived(JSON.stringify({
		'@context': 'https://schema.org/',
		'@type': 'Recipe',
		name: r.title,
		description: r.description || undefined,
		author: {
			'@type': 'Person',
			name: data.creator.displayName || data.creator.username
		},
		...(r.imageUrl ? { image: r.imageUrl } : {}),
		prepTime: r.prepTime ? isoDuration(r.prepTime) : undefined,
		cookTime: r.cookTime ? isoDuration(r.cookTime) : undefined,
		totalTime: totalTime ? isoDuration(totalTime) : undefined,
		recipeYield: `${r.servings} serving${r.servings > 1 ? 's' : ''}`,
		recipeCategory: r.tags?.[0] || undefined,
		recipeIngredient: data.ingredients.map(
			(i) => `${i.quantity ? i.quantity + ' ' : ''}${i.unit ? i.unit + ' ' : ''}${i.label}`
		),
		recipeInstructions: r.instructions
			? r.instructions
					.split('\n')
					.filter((l) => l.trim())
					.map((step, idx) => ({
						'@type': 'HowToStep',
						position: idx + 1,
						text: step.replace(/^\d+\.\s*/, '').trim()
					}))
			: undefined,
		nutrition: {
			'@type': 'NutritionInformation',
			calories: `${Math.round(r.caloriesPerServing ?? 0)} calories`,
			proteinContent: `${Math.round(r.proteinPerServing ?? 0)}g`,
			carbohydrateContent: `${Math.round(r.carbPerServing ?? 0)}g`,
			fatContent: `${Math.round(r.fatPerServing ?? 0)}g`
		}
	}));

	let instructionSteps = $derived(r.instructions
		? r.instructions
				.split('\n')
				.map((l) => l.trim())
				.filter((l) => l.length > 0)
		: []);
</script>

<svelte:head>
	<title>{r.title} by {data.creator.displayName || data.creator.username} — Savoro</title>
	<meta
		name="description"
		content="{r.description || r.title}. {Math.round(r.caloriesPerServing ?? 0)} cal, {Math.round(r.proteinPerServing ?? 0)}g protein per serving."
	/>
	<meta
		property="og:title"
		content="{r.title} — Savoro"
	/>
	<meta
		property="og:description"
		content="{r.description || r.title}. {Math.round(r.caloriesPerServing ?? 0)} cal per serving."
	/>
	<meta property="og:type" content="article" />
	{#if r.imageUrl}
		<meta property="og:image" content={r.imageUrl} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta
		name="twitter:title"
		content="{r.title} — Savoro"
	/>
	<meta
		name="twitter:description"
		content="{r.description || r.title}. {Math.round(r.caloriesPerServing ?? 0)} cal per serving."
	/>
	<!-- JSON-LD Structured Data -->
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
	<!-- App Store smart banner -->
	<meta name="apple-itunes-app" content="app-id=0000000000, app-argument=https://savoro.app/{data.creator.username}/{data.recipe.slug}" />
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden">
	<div class="pointer-events-none absolute inset-0" aria-hidden="true">
		<div class="absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-blush-100/40 blur-3xl"></div>
		<div class="absolute top-24 -left-20 h-72 w-72 rounded-full bg-sage-100/30 blur-3xl"></div>
		<div class="absolute right-0 bottom-0 h-56 w-56 rounded-full bg-lavender-100/20 blur-3xl"></div>
	</div>

	<div class="relative mx-auto max-w-3xl px-6 pb-8 pt-10 lg:pt-14">
		<!-- Back link -->
		<a
			href="/{data.creator.username}"
			class="mb-6 inline-flex items-center gap-1.5 text-sm text-sand-400 transition-colors hover:text-sand-600"
			in:fly={{ y: 10, duration: 300, easing: cubicOut }}
		>
			<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
				<line x1="12" y1="8" x2="4" y2="8" />
				<polyline points="7.5 4.5 4 8 7.5 11.5" />
			</svg>
			{data.creator.displayName || data.creator.username}'s recipes
		</a>

		<!-- Recipe image / gradient -->
		<div
			class="relative mb-8 h-56 overflow-hidden rounded-[var(--radius-glass)] bg-gradient-to-br from-blush-200 via-lavender-100 to-sage-100 sm:h-72"
			in:fly={{ y: 20, duration: 500, easing: cubicOut }}
		>
			{#if r.imageUrl}
				<img src={r.imageUrl} alt={r.title} class="h-full w-full object-cover" />
			{:else}
				<div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,_rgba(255,255,255,0.4)_0%,_transparent_60%)]"></div>
				<div class="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_rgba(255,255,255,0.2)_0%,_transparent_50%)]"></div>
			{/if}
			<!-- Tags overlay -->
			{#if r.tags?.length}
				<div class="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
					{#each r.tags.slice(0, 4) as tag}
						<span class="rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-sand-700 backdrop-blur-sm">{tag}</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Title + Author -->
		<div in:fly={{ y: 20, duration: 500, delay: 100, easing: cubicOut }}>
			<h1 class="text-3xl font-bold leading-tight tracking-tight text-sand-900 sm:text-4xl">
				{r.title}
			</h1>
			{#if r.description}
				<p class="mt-3 text-base leading-relaxed text-sand-500">{r.description}</p>
			{/if}

			<!-- Author -->
			<a
				href="/{data.creator.username}"
				class="mt-5 inline-flex items-center gap-3 transition-opacity hover:opacity-80"
			>
				{#if data.creator.avatarUrl}
					<img
						src={data.creator.avatarUrl}
						alt={data.creator.displayName || data.creator.username}
						class="h-8 w-8 rounded-full object-cover"
					/>
				{:else}
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blush-200 to-lavender-200 text-xs font-bold text-white">
						{(data.creator.displayName || data.creator.username).charAt(0).toUpperCase()}
					</div>
				{/if}
				<div class="text-sm">
					<span class="font-medium text-sand-800">{data.creator.displayName || data.creator.username}</span>
					<span class="text-sand-400"> @{data.creator.username}</span>
				</div>
			</a>
		</div>
	</div>
</section>

<!-- Macro + Meta Bar -->
<section class="border-y border-sand-200/60 bg-sand-100/40">
	<div
		class="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-5"
		in:fly={{ y: 15, duration: 400, delay: 150, easing: cubicOut }}
	>
		<!-- Macros -->
		<div class="flex items-center gap-5">
			<div class="text-center">
				<p class="text-xl font-bold tabular-nums text-sand-900">{Math.round(r.caloriesPerServing ?? 0)}</p>
				<p class="text-[10px] font-medium uppercase tracking-wider text-sand-400">cal</p>
			</div>
			<div class="h-8 w-px bg-sand-200"></div>
			<div class="flex gap-4">
				<div class="text-center">
					<p class="text-sm font-semibold tabular-nums text-sand-800">{Math.round(r.proteinPerServing ?? 0)}g</p>
					<p class="flex items-center justify-center gap-1 text-[10px] text-sand-400">
						<span class="h-1.5 w-1.5 rounded-full bg-sage-300"></span>protein
					</p>
				</div>
				<div class="text-center">
					<p class="text-sm font-semibold tabular-nums text-sand-800">{Math.round(r.carbPerServing ?? 0)}g</p>
					<p class="flex items-center justify-center gap-1 text-[10px] text-sand-400">
						<span class="h-1.5 w-1.5 rounded-full bg-blush-300"></span>carbs
					</p>
				</div>
				<div class="text-center">
					<p class="text-sm font-semibold tabular-nums text-sand-800">{Math.round(r.fatPerServing ?? 0)}g</p>
					<p class="flex items-center justify-center gap-1 text-[10px] text-sand-400">
						<span class="h-1.5 w-1.5 rounded-full bg-sand-300"></span>fat
					</p>
				</div>
			</div>
		</div>

		<!-- Meta pills -->
		<div class="flex flex-wrap items-center gap-2 text-xs text-sand-500">
			<span class="inline-flex items-center gap-1.5 rounded-full border border-sand-200 bg-white/60 px-3 py-1.5 backdrop-blur-sm">
				<svg class="h-3.5 w-3.5 text-sand-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<circle cx="8" cy="8" r="6" />
					<path d="M8 5v3l2 1.5" stroke-linecap="round" />
				</svg>
				{#if r.prepTime && r.cookTime}
					{formatTime(r.prepTime)} prep + {formatTime(r.cookTime)} cook
				{:else if totalTime}
					{formatTime(totalTime)}
				{/if}
			</span>
			<span class="inline-flex items-center gap-1.5 rounded-full border border-sand-200 bg-white/60 px-3 py-1.5 backdrop-blur-sm">
				<svg class="h-3.5 w-3.5 text-sand-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M4 8h8M8 4v8" stroke-linecap="round" />
				</svg>
				{r.servings} serving{r.servings > 1 ? 's' : ''}
			</span>
			{#if r.forkCount > 0}
				<span class="inline-flex items-center gap-1.5 rounded-full border border-sand-200 bg-white/60 px-3 py-1.5 backdrop-blur-sm">
					{r.forkCount} fork{r.forkCount !== 1 ? 's' : ''}
				</span>
			{/if}
		</div>
	</div>
</section>

<!-- Ingredients + Instructions -->
<section class="py-10 lg:py-14">
	<div class="mx-auto grid max-w-3xl gap-10 px-6 md:grid-cols-[1fr_1.5fr] md:gap-12">
		<!-- Ingredients -->
		<div in:fly={{ x: -15, duration: 400, delay: 200, easing: cubicOut }}>
			<h2 class="mb-5 text-lg font-bold text-sand-900">Ingredients</h2>
			{#if data.ingredients.length === 0}
				<p class="text-sm text-sand-400">No ingredients listed.</p>
			{:else}
				<ul class="space-y-3">
					{#each data.ingredients as ing, i}
						<li
							class="flex items-start gap-3 text-sm"
							class:blur-sm={i >= 2}
							class:select-none={i >= 2}
							class:pointer-events-none={i >= 2}
							in:fly={{ x: -10, duration: 300, delay: 250 + i * 30, easing: cubicOut }}
						>
							<span class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blush-300"></span>
							<span class="text-sand-700">
								{#if ing.quantity}
									<span class="font-medium tabular-nums">{ing.quantity}</span>
								{/if}
								{#if ing.unit}
									<span class="text-sand-400">{ing.unit}</span>
								{/if}
								{ing.label}
							</span>
						</li>
					{/each}
				</ul>

				<!-- Blur wall CTA — shown when there are more than 2 ingredients -->
				{#if data.ingredients.length > 2}
					<div class="relative -mt-12 flex flex-col items-center bg-gradient-to-t from-white via-white/90 to-transparent pb-2 pt-16 text-center">
						<p class="text-sm font-semibold text-sand-800">See all {data.ingredients.length} ingredients</p>
						<p class="mt-1 text-xs text-sand-400">Get the full recipe in the Savoro app</p>
						<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
							<a
								href="https://apps.apple.com/app/savoro/id0000000000"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 rounded-xl bg-sand-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-sand-800"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
								</svg>
								App Store
							</a>
							<a
								href="https://play.google.com/store/apps/details?id=app.savoro.mobile"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 rounded-xl border border-sand-200 bg-white px-5 py-3 text-sm font-medium text-sand-800 transition-colors hover:bg-sand-50"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<path d="M3.18 23.76c.3.17.64.24.99.19l12.47-7.2-2.79-2.79-10.67 9.8zM.71 1.43C.27 1.9 0 2.6 0 3.52v16.96c0 .92.27 1.62.71 2.09l.11.11 9.5-9.5v-.22L.82 3.43l-.11.11zM20.49 10.6l-2.67-1.54-3.13 3.13 3.13 3.13 2.68-1.55c.77-.44.77-1.17 0-1.61l-.01-.56zM3.18.24C2.58-.1 2.07-.05 1.7.42L12.47 11.2l2.79-2.79L3.18.24z"/>
								</svg>
								Google Play
							</a>
						</div>
					</div>
				{/if}

				<!-- Per-ingredient macro breakdown -->
				{#if data.ingredients.some((i) => i.servingCalories)}
					<div class="mt-6 space-y-2">
						<p class="text-[10px] font-medium uppercase tracking-wider text-sand-400">
							Per ingredient
						</p>
						{#each data.ingredients.filter((i) => i.servingCalories) as ing}
							<div
								class="flex items-center justify-between rounded-[var(--radius-chip)] bg-sand-100/60 px-3 py-2 text-xs"
							>
								<span class="truncate text-sand-600">{ing.label}</span>
								<span class="ml-2 flex-shrink-0 tabular-nums text-sand-400">
									{Math.round((ing.servingCalories ?? 0) * (ing.quantity ?? 1))} cal
								</span>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

		<!-- Instructions -->
		<div in:fly={{ x: 15, duration: 400, delay: 200, easing: cubicOut }}>
			<h2 class="mb-5 text-lg font-bold text-sand-900">Instructions</h2>
			{#if instructionSteps.length === 0}
				<p class="text-sm text-sand-400">No instructions provided.</p>
			{:else}
				<ol class="space-y-5">
					{#each instructionSteps as step, i}
						<li
							class="flex gap-4"
							in:fly={{ y: 10, duration: 300, delay: 280 + i * 40, easing: cubicOut }}
						>
							<span
								class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sand-100 text-xs font-semibold text-sand-500"
							>
								{i + 1}
							</span>
							<p class="pt-0.5 text-sm leading-relaxed text-sand-700">
								{step.replace(/^\d+\.\s*/, '')}
							</p>
						</li>
					{/each}
				</ol>
			{/if}
		</div>
	</div>
</section>

<!-- CTA -->
<section class="border-t border-sand-200/60 bg-sand-100/40 py-12">
	<div class="mx-auto max-w-3xl px-6 text-center">
		<p class="text-lg font-semibold text-sand-900">Cook smarter with Savoro</p>
		<p class="mt-2 text-sm text-sand-400">
			Track macros, fork recipes, and build your personal cookbook.
		</p>
		<div class="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
			<a
				href="https://apps.apple.com/app/savoro/id0000000000"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-xl bg-sand-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-sand-800"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
				</svg>
				Download on the App Store
			</a>
			<a
				href="https://play.google.com/store/apps/details?id=app.savoro.mobile"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-xl border border-sand-200 bg-white px-6 py-3 text-sm font-medium text-sand-800 transition-colors hover:bg-sand-50"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M3.18 23.76c.3.17.64.24.99.19l12.47-7.2-2.79-2.79-10.67 9.8zM.71 1.43C.27 1.9 0 2.6 0 3.52v16.96c0 .92.27 1.62.71 2.09l.11.11 9.5-9.5v-.22L.82 3.43l-.11.11zM20.49 10.6l-2.67-1.54-3.13 3.13 3.13 3.13 2.68-1.55c.77-.44.77-1.17 0-1.61l-.01-.56zM3.18.24C2.58-.1 2.07-.05 1.7.42L12.47 11.2l2.79-2.79L3.18.24z"/>
				</svg>
				Get it on Google Play
			</a>
		</div>
		<p class="mt-6 text-xs text-sand-300">
			Made with <a href="/" class="transition-colors hover:text-sand-500">Savoro</a>
		</p>
	</div>
</section>
