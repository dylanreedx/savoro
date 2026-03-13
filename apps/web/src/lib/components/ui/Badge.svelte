<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		variant = 'default',
		class: className = ''
	}: {
		children: Snippet;
		variant?: 'default' | 'blush' | 'sage' | 'lavender';
		class?: string;
	} = $props();

	const variantClasses = {
		default: 'bg-sand-100 text-sand-600',
		blush: 'bg-blush-100 text-blush-500',
		sage: 'bg-sage-100 text-sage-400',
		lavender: 'bg-lavender-100 text-lavender-300'
	};
</script>

<span
	class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium {variantClasses[variant]} {className}"
>
	{@render children()}
</span>
