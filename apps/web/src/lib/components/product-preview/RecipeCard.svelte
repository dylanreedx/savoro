<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';

	let {
		title,
		calories,
		protein,
		carbs,
		fat,
		servings,
		prepTime,
		tags = [],
		gradient = 'from-blush-200 via-blush-100 to-sage-100',
		description = '',
		class: className = ''
	}: {
		title: string;
		calories: number;
		protein: number;
		carbs: number;
		fat: number;
		servings: number;
		prepTime: string;
		tags?: string[];
		gradient?: string;
		description?: string;
		class?: string;
	} = $props();
</script>

<div
	class="glass group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg {className}"
>
	<!-- Gradient image placeholder -->
	<div class="relative h-40 bg-gradient-to-br {gradient} overflow-hidden">
		<!-- Subtle pattern overlay -->
		<div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,_rgba(255,255,255,0.3)_0%,_transparent_60%)]"></div>
		<div class="absolute bottom-3 left-3 right-3 flex gap-1.5">
			{#each tags.slice(0, 2) as tag}
				<span class="rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-medium text-sand-700 backdrop-blur-sm">{tag}</span>
			{/each}
		</div>
	</div>

	<!-- Content -->
	<div class="p-5">
		<h3 class="text-base font-bold text-sand-900 group-hover:text-sand-800">{title}</h3>
		{#if description}
			<p class="mt-1.5 text-xs leading-relaxed text-sand-500 line-clamp-2">{description}</p>
		{/if}

		<!-- Macros -->
		<div class="mt-4 flex items-center gap-3">
			<span class="text-sm font-semibold tabular-nums text-sand-900">{calories} cal</span>
			<div class="flex gap-2 text-[10px] text-sand-400">
				<span class="flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-sage-300"></span>P {protein}g</span>
				<span class="flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-blush-300"></span>C {carbs}g</span>
				<span class="flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-sand-300"></span>F {fat}g</span>
			</div>
		</div>

		<!-- Meta -->
		<div class="mt-3 flex items-center gap-3 text-xs text-sand-400">
			<span>{servings} serving{servings > 1 ? 's' : ''}</span>
			<span class="h-3 w-px bg-sand-200"></span>
			<span>{prepTime}</span>
		</div>
	</div>
</div>
