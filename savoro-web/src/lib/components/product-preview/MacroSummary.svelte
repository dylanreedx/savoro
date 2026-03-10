<script lang="ts">
	import { inview } from '$lib/actions/inview';

	let {
		calories = { current: 1640, goal: 2200 },
		protein = { current: 132, goal: 180 },
		carbs = { current: 165, goal: 240 },
		fat = { current: 58, goal: 75 },
		class: className = ''
	}: {
		calories?: { current: number; goal: number };
		protein?: { current: number; goal: number };
		carbs?: { current: number; goal: number };
		fat?: { current: number; goal: number };
		class?: string;
	} = $props();

	let visible = $state(false);

	const radius = 42;
	const circumference = 2 * Math.PI * radius;

	let calPct = $derived(Math.min(calories.current / calories.goal, 1));
	let calOffset = $derived(visible ? circumference * (1 - calPct) : circumference);

	let bars = $derived([
		{ label: 'Protein', current: protein.current, goal: protein.goal, unit: 'g', color: 'bg-sage-300', pct: Math.min(protein.current / protein.goal, 1) },
		{ label: 'Carbs', current: carbs.current, goal: carbs.goal, unit: 'g', color: 'bg-blush-300', pct: Math.min(carbs.current / carbs.goal, 1) },
		{ label: 'Fat', current: fat.current, goal: fat.goal, unit: 'g', color: 'bg-sand-400', pct: Math.min(fat.current / fat.goal, 1) }
	]);
</script>

<div
	class="glass-strong p-5 {className}"
	use:inview={{ threshold: 0.3 }}
	oninview={() => (visible = true)}
>
	<div class="flex items-center gap-5">
		<!-- Calorie ring -->
		<div class="relative h-24 w-24 shrink-0">
			<svg viewBox="0 0 100 100" class="h-full w-full -rotate-90">
				<circle
					cx="50" cy="50" r={radius}
					fill="none" stroke-width="6"
					class="stroke-sand-200"
				/>
				<circle
					cx="50" cy="50" r={radius}
					fill="none" stroke-width="6"
					stroke-dasharray={circumference}
					stroke-dashoffset={calOffset}
					stroke-linecap="round"
					class="stroke-blush-400 transition-[stroke-dashoffset] duration-1000 ease-out"
				/>
			</svg>
			<div class="absolute inset-0 flex flex-col items-center justify-center">
				<span class="text-lg font-bold tabular-nums text-sand-900">{calories.current}</span>
				<span class="text-[10px] text-sand-400">/ {calories.goal}</span>
			</div>
		</div>

		<!-- Macro bars -->
		<div class="flex flex-1 flex-col gap-3">
			{#each bars as bar}
				<div>
					<div class="mb-1 flex items-baseline justify-between">
						<span class="text-xs font-medium text-sand-600">{bar.label}</span>
						<span class="text-[10px] tabular-nums text-sand-400">{bar.current}{bar.unit} / {bar.goal}{bar.unit}</span>
					</div>
					<div class="h-1.5 overflow-hidden rounded-full bg-sand-200">
						<div
							class="{bar.color} h-full rounded-full transition-all duration-700 ease-out"
							style="width: {visible ? bar.pct * 100 : 0}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
