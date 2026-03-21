<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	let { data } = $props();

	const gradients = [
		'from-blush-200 via-blush-100 to-sage-100',
		'from-lavender-200 via-lavender-100 to-blush-100',
		'from-sage-200 via-sage-100 to-sand-100',
		'from-blush-100 via-lavender-100 to-sage-100'
	];

	function formatTime(minutes: number | null): string {
		if (!minutes) return '';
		if (minutes < 60) return `${minutes} min`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m ? `${h}h ${m}m` : `${h}h`;
	}
</script>

<svelte:head>
	<title>{data.profile.displayName || data.profile.username} — Savoro</title>
	<meta
		name="description"
		content="{data.profile.displayName || data.profile.username}'s recipes on Savoro. {data.recipes.length} public recipe{data.recipes.length !== 1 ? 's' : ''}."
	/>
	<meta
		property="og:title"
		content="{data.profile.displayName || data.profile.username} — Savoro"
	/>
	<meta
		property="og:description"
		content="{data.profile.displayName || data.profile.username}'s recipes on Savoro"
	/>
	<meta property="og:type" content="profile" />
</svelte:head>

<!-- Profile Header -->
<section class="relative overflow-hidden">
	<div class="pointer-events-none absolute inset-0" aria-hidden="true">
		<div class="absolute -top-24 right-1/3 h-80 w-80 rounded-full bg-blush-100/40 blur-3xl">
		</div>
		<div class="absolute top-20 -left-16 h-64 w-64 rounded-full bg-lavender-100/30 blur-3xl">
		</div>
	</div>

	<div class="relative mx-auto max-w-4xl px-6 pb-12 pt-12 lg:pt-16">
		<div class="flex flex-col items-center text-center" in:fly={{ y: 20, duration: 500, easing: cubicOut }}>
			<!-- Avatar -->
			{#if data.profile.avatarUrl}
				<img
					src={data.profile.avatarUrl}
					alt={data.profile.displayName || data.profile.username}
					class="h-24 w-24 rounded-full border-2 border-white/60 object-cover shadow-glass"
				/>
			{:else}
				<div
					class="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blush-200 to-lavender-200 text-3xl font-bold text-white shadow-glass"
				>
					{(data.profile.displayName || data.profile.username).charAt(0).toUpperCase()}
				</div>
			{/if}

			<h1 class="mt-5 text-2xl font-bold tracking-tight text-sand-900 sm:text-3xl">
				{data.profile.displayName || data.profile.username}
			</h1>
			<p class="mt-1 text-sm text-sand-400">@{data.profile.username}</p>

			{#if data.profile.bio}
				<p class="mx-auto mt-4 max-w-md text-base leading-relaxed text-sand-500">
					{data.profile.bio}
				</p>
			{/if}

			<div class="mt-4 flex items-center gap-4 text-sm text-sand-400">
				<span class="flex items-center gap-1.5">
					<svg
						class="h-4 w-4"
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<path
							d="M6 3v2M14 3v2M3 8h14M5 5h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					{data.recipes.length} recipe{data.recipes.length !== 1 ? 's' : ''}
				</span>
			</div>
		</div>
	</div>
</section>

<!-- Recipe Grid -->
<section class="bg-sand-100/50 py-12 lg:py-16">
	<div class="mx-auto max-w-5xl px-6">
		{#if data.recipes.length === 0}
			<div class="py-16 text-center">
				<p class="text-sand-400">No public recipes yet.</p>
			</div>
		{:else}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.recipes as recipe, i}
					<a
						href="/{data.profile.username}/{recipe.slug}"
						class="group block"
						in:fly={{ y: 30, duration: 400, delay: 50 + i * 60, easing: cubicOut }}
					>
						<GlassCard hover padding="p-0">
							<!-- Gradient header -->
							<div
								class="relative h-36 overflow-hidden rounded-t-[var(--radius-glass)] bg-gradient-to-br {gradients[
									i % gradients.length
								]}"
							>
								{#if recipe.imageUrl}
									<img
										src={recipe.imageUrl}
										alt={recipe.title}
										class="h-full w-full object-cover"
									/>
								{:else}
									<div
										class="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,_rgba(255,255,255,0.3)_0%,_transparent_60%)]"
									></div>
								{/if}
								<div class="absolute bottom-3 left-3 right-3 flex gap-1.5">
									{#each ((recipe.tags as string[]) || []).slice(0, 2) as tag}
										<span
											class="rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-medium text-sand-700 backdrop-blur-sm"
											>{tag}</span
										>
									{/each}
								</div>
							</div>

							<!-- Content -->
							<div class="p-5">
								<h3
									class="text-base font-bold text-sand-900 group-hover:text-sand-700"
								>
									{recipe.title}
								</h3>
								{#if recipe.description}
									<p class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-sand-500">
										{recipe.description}
									</p>
								{/if}

								<!-- Macros -->
								<div class="mt-4 flex items-center gap-3">
									<span class="text-sm font-semibold tabular-nums text-sand-900"
										>{Math.round(recipe.caloriesPerServing ?? 0)} cal</span
									>
									<div class="flex gap-2 text-[10px] text-sand-400">
										<span class="flex items-center gap-1"
											><span class="h-1.5 w-1.5 rounded-full bg-sage-300"
											></span>P {Math.round(recipe.proteinPerServing ?? 0)}g</span
										>
										<span class="flex items-center gap-1"
											><span class="h-1.5 w-1.5 rounded-full bg-blush-300"
											></span>C {Math.round(recipe.carbPerServing ?? 0)}g</span
										>
										<span class="flex items-center gap-1"
											><span class="h-1.5 w-1.5 rounded-full bg-sand-300"
											></span>F {Math.round(recipe.fatPerServing ?? 0)}g</span
										>
									</div>
								</div>

								<!-- Meta -->
								<div class="mt-3 flex items-center gap-3 text-xs text-sand-400">
									<span
										>{recipe.servings} serving{recipe.servings > 1
											? 's'
											: ''}</span
									>
									{#if recipe.prepTime || recipe.cookTime}
										<span class="h-3 w-px bg-sand-200"></span>
										<span
											>{formatTime(
												(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
											)}</span
										>
									{/if}
								</div>
							</div>
						</GlassCard>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>
