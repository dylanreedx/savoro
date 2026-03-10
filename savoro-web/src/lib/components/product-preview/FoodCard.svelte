<script lang="ts">
	let {
		name,
		calories,
		protein,
		carbs,
		fat,
		amount,
		class: className = ''
	}: {
		name: string;
		calories: number;
		protein: number;
		carbs: number;
		fat: number;
		amount: string;
		class?: string;
	} = $props();

	let total = $derived(protein + carbs + fat);
	let pPct = $derived(total > 0 ? (protein / total) * 100 : 0);
	let cPct = $derived(total > 0 ? (carbs / total) * 100 : 0);
	let fPct = $derived(total > 0 ? (fat / total) * 100 : 0);
</script>

<div class="glass-strong flex items-center gap-4 p-4 {className}">
	<div class="flex-1 min-w-0">
		<div class="flex items-baseline justify-between gap-2">
			<p class="truncate text-sm font-semibold text-sand-900">{name}</p>
			<span class="shrink-0 text-xs tabular-nums text-sand-500">{calories} cal</span>
		</div>
		<p class="mt-0.5 text-xs text-sand-400">{amount}</p>
		<!-- Macro bar -->
		<div class="mt-2.5 flex h-1.5 overflow-hidden rounded-full">
			<div class="bg-sage-300 transition-all duration-500" style="width: {pPct}%"></div>
			<div class="bg-blush-300 transition-all duration-500" style="width: {cPct}%"></div>
			<div class="bg-sand-300 transition-all duration-500" style="width: {fPct}%"></div>
		</div>
		<div class="mt-1.5 flex gap-3 text-[10px] text-sand-400">
			<span><span class="inline-block h-1.5 w-1.5 rounded-full bg-sage-300"></span> P {protein}g</span>
			<span><span class="inline-block h-1.5 w-1.5 rounded-full bg-blush-300"></span> C {carbs}g</span>
			<span><span class="inline-block h-1.5 w-1.5 rounded-full bg-sand-300"></span> F {fat}g</span>
		</div>
	</div>
</div>
