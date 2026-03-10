<script lang="ts">
	let {
		class: className = ''
	}: {
		class?: string;
	} = $props();

	const items = [
		{ id: 'coffee', name: 'Black Coffee', emoji: '☕', calories: 5 },
		{ id: 'eggs', name: '2 Eggs', emoji: '🥚', calories: 140 },
		{ id: 'banana', name: 'Banana', emoji: '🍌', calories: 105 },
		{ id: 'chicken', name: 'Chicken Breast', emoji: '🍗', calories: 165 },
		{ id: 'rice', name: 'Brown Rice', emoji: '🍚', calories: 215 },
		{ id: 'yogurt', name: 'Greek Yogurt', emoji: '🥛', calories: 130 },
		{ id: 'almonds', name: 'Almonds (28g)', emoji: '🥜', calories: 164 },
		{ id: 'salmon', name: 'Salmon Fillet', emoji: '🐟', calories: 208 }
	];

	let selected = $state(new Set<string>());

	function toggle(id: string) {
		const next = new Set(selected);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selected = next;
	}
</script>

<div class={className}>
	<div class="flex flex-wrap gap-2">
		{#each items as item (item.id)}
			<button
				onclick={() => toggle(item.id)}
				class="group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-200
					{selected.has(item.id)
						? 'border-sage-300 bg-sage-100 text-sage-400 shadow-sm scale-[0.97]'
						: 'border-sand-200 bg-white/70 text-sand-600 hover:border-sand-300 hover:bg-white hover:shadow-sm active:scale-[0.97]'}"
			>
				<span class="text-base">{item.emoji}</span>
				<span class="font-medium">{item.name}</span>
				<span class="text-xs tabular-nums text-sand-400">{item.calories}</span>
				{#if selected.has(item.id)}
					<svg class="h-3.5 w-3.5 text-sage-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
						<polyline points="3.5 8.5 6.5 11.5 12.5 5.5" />
					</svg>
				{/if}
			</button>
		{/each}
	</div>
</div>
