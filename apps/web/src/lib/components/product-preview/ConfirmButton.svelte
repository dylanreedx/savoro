<script lang="ts">
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		label = 'Log Meal',
		class: className = ''
	}: {
		label?: string;
		class?: string;
	} = $props();

	let confirmed = $state(false);
	let timeout: ReturnType<typeof setTimeout>;

	function handleClick() {
		if (confirmed) return;
		confirmed = true;
		timeout = setTimeout(() => {
			confirmed = false;
		}, 2500);
	}

	$effect(() => {
		return () => clearTimeout(timeout);
	});
</script>

<button
	onclick={handleClick}
	class="relative inline-flex h-12 min-w-[160px] items-center justify-center overflow-hidden rounded-full px-8 text-sm font-semibold transition-all duration-300
		{confirmed
			? 'bg-sage-200 text-sage-400 scale-[0.97]'
			: 'bg-sand-900 text-sand-50 hover:bg-sand-800 active:scale-[0.95]'} {className}"
>
	{#if confirmed}
		<span
			class="flex items-center gap-2"
			in:scale={{ duration: 350, easing: cubicOut, start: 0.5 }}
		>
			<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="4 10.5 8 14.5 16 6.5" />
			</svg>
			Logged
		</span>
	{:else}
		<span class="flex items-center gap-2">
			<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="8" y1="3" x2="8" y2="13" />
				<line x1="3" y1="8" x2="13" y2="8" />
			</svg>
			{label}
		</span>
	{/if}
</button>
