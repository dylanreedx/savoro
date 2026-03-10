<script lang="ts">
	import FoodCard from './FoodCard.svelte';

	let {
		class: className = ''
	}: {
		class?: string;
	} = $props();

	const items = [
		{ name: 'Chicken Breast (grilled)', calories: 165, protein: 31, carbs: 0, fat: 3.6, amount: '100g cooked' },
		{ name: 'Brown Rice', calories: 215, protein: 5, carbs: 45, fat: 1.8, amount: '1 cup cooked' },
		{ name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, amount: '100g' },
		{ name: 'Greek Yogurt (2%)', calories: 130, protein: 17, carbs: 8, fat: 3.5, amount: '170g' },
		{ name: 'Salmon Fillet', calories: 208, protein: 20, carbs: 0, fat: 13, amount: '100g cooked' }
	];

	let query = $state('');
</script>

<div class="glass-strong overflow-hidden {className}">
	<!-- Search bar -->
	<div class="border-b border-sand-200/50 p-3">
		<div class="flex items-center gap-2 rounded-xl bg-sand-100/60 px-3 py-2">
			<svg class="h-4 w-4 text-sand-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
				<circle cx="7" cy="7" r="4.5" />
				<line x1="10.5" y1="10.5" x2="14" y2="14" />
			</svg>
			<input
				type="text"
				bind:value={query}
				placeholder="Search foods..."
				class="w-full border-0 bg-transparent text-xs text-sand-900 placeholder:text-sand-400 focus:outline-none focus:ring-0"
			/>
		</div>
	</div>

	<!-- Food list -->
	<div class="max-h-[320px] space-y-0.5 overflow-y-auto p-2">
		{#each items as item, i}
			<div style="animation-delay: {i * 60}ms" class="animate-fade-in">
				<FoodCard
					name={item.name}
					calories={item.calories}
					protein={item.protein}
					carbs={item.carbs}
					fat={item.fat}
					amount={item.amount}
					class="!rounded-xl !border-0 !bg-transparent !shadow-none hover:!bg-sand-50/80 transition-colors duration-150"
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}
	:global(.animate-fade-in) {
		animation: fadeIn 0.4s ease-out both;
	}
</style>
