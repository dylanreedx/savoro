<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		hover = false,
		class: className = '',
		padding = 'p-6'
	}: {
		children: Snippet;
		hover?: boolean;
		class?: string;
		padding?: string;
	} = $props();
</script>

<div
	class="glass {padding} {hover
		? 'transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-glass-lg hover:bg-glass-hover'
		: ''} {className}"
>
	{@render children()}
</div>
