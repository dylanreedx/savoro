<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		variant = 'primary',
		size = 'md',
		href,
		class: className = '',
		...restProps
	}: {
		children: Snippet;
		variant?: 'primary' | 'secondary' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		href?: string;
		class?: string;
		[key: string]: unknown;
	} = $props();

	const variantClasses = {
		primary:
			'bg-sand-900 text-sand-50 hover:bg-sand-800 shadow-sm hover:shadow-md',
		secondary:
			'glass text-sand-900 hover:bg-glass-hover',
		ghost: 'text-sand-600 hover:text-sand-900 hover:bg-sand-100'
	};

	const sizeClasses = {
		sm: 'px-4 py-2 text-sm',
		md: 'px-6 py-3 text-sm',
		lg: 'px-8 py-4 text-base'
	};
</script>

{#if href}
	<a
		{href}
		class="inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-200 active:scale-[0.97] {variantClasses[variant]} {sizeClasses[size]} {className}"
		{...restProps}
	>
		{@render children()}
	</a>
{:else}
	<button
		class="inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-200 active:scale-[0.97] {variantClasses[variant]} {sizeClasses[size]} {className}"
		{...restProps}
	>
		{@render children()}
	</button>
{/if}
