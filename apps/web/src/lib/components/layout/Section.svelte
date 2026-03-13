<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		id,
		background = 'default',
		class: className = '',
		maxWidth = 'max-w-7xl',
		padding = 'px-6 py-20 lg:py-28'
	}: {
		children: Snippet;
		id?: string;
		background?: 'default' | 'muted' | 'dark' | 'none';
		class?: string;
		maxWidth?: string;
		padding?: string;
	} = $props();

	const bgClasses = {
		default: '',
		muted: 'bg-sand-100/50',
		dark: 'bg-sand-900 text-sand-100',
		none: ''
	};
</script>

<section {id} class="{bgClasses[background]} {className}">
	<div class="{maxWidth} mx-auto {padding}">
		{@render children()}
	</div>
</section>
