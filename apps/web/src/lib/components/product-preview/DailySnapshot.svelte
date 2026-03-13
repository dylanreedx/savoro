<script lang="ts">
	let {
		date = 'Today',
		meals = [
			{ name: 'Overnight Oats', calories: 420 },
			{ name: 'Chicken Shawarma Bowl', calories: 520 },
			{ name: 'Greek Yogurt', calories: 130 },
			{ name: 'Salmon Poke Bowl', calories: 480 }
		],
		totalCalories = 1550,
		goal = 2200,
		class: className = ''
	}: {
		date?: string;
		meals?: Array<{ name: string; calories: number }>;
		totalCalories?: number;
		goal?: number;
		class?: string;
	} = $props();

	let pct = $derived(Math.min(totalCalories / goal, 1) * 100);
	let remaining = $derived(Math.max(goal - totalCalories, 0));
</script>

<div class="glass-strong p-5 {className}">
	<!-- Header -->
	<div class="flex items-baseline justify-between">
		<span class="text-sm font-bold text-sand-900">{date}</span>
		<span class="text-xs tabular-nums text-sand-400">{remaining} cal remaining</span>
	</div>

	<!-- Progress bar -->
	<div class="mt-3 h-2 overflow-hidden rounded-full bg-sand-200">
		<div
			class="h-full rounded-full bg-gradient-to-r from-blush-300 to-blush-400 transition-all duration-700"
			style="width: {pct}%"
		></div>
	</div>
	<div class="mt-1 flex justify-between text-[10px] tabular-nums text-sand-400">
		<span>{totalCalories} cal</span>
		<span>{goal} cal goal</span>
	</div>

	<!-- Meal list -->
	<div class="mt-4 space-y-2">
		{#each meals as meal, i}
			<div class="flex items-center justify-between rounded-xl bg-sand-50/50 px-3 py-2">
				<span class="text-xs font-medium text-sand-700">{meal.name}</span>
				<span class="text-xs tabular-nums text-sand-400">{meal.calories} cal</span>
			</div>
		{/each}
	</div>
</div>
