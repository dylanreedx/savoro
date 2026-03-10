<script lang="ts">
	import { page } from '$app/state';
	import { slide } from 'svelte/transition';
	import Button from '$lib/components/ui/Button.svelte';

	let open = $state(false);

	const links = [
		{ label: 'Home', href: '/' },
		{ label: 'Philosophy', href: '/philosophy' },
		{ label: 'Recipes', href: '/recipes' },
		{ label: 'Journal', href: '/journal' }
	];

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}
</script>

<nav class="glass-strong fixed top-0 right-0 left-0 z-50">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a href="/" class="flex items-center gap-0.5 text-xl font-bold tracking-tight text-sand-900">
			savoro<span class="text-blush-400">.</span>
		</a>

		<!-- Desktop links -->
		<div class="hidden items-center gap-1 lg:flex">
			{#each links as link}
				<a
					href={link.href}
					class="rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 {isActive(link.href)
						? 'text-sand-900'
						: 'text-sand-500 hover:text-sand-800'}"
				>
					{link.label}
				</a>
			{/each}
			<div class="ml-3">
				<Button size="sm" href="#waitlist">Join Waitlist</Button>
			</div>
		</div>

		<!-- Mobile hamburger -->
		<button
			onclick={() => (open = !open)}
			class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[var(--radius-chip)] text-sand-600 hover:bg-sand-100 lg:hidden"
			aria-label="Toggle menu"
		>
			{#if open}
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M5 5l10 10M15 5L5 15" stroke-linecap="round" />
				</svg>
			{:else}
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 6h14M3 10h14M3 14h14" stroke-linecap="round" />
				</svg>
			{/if}
		</button>
	</div>

	<!-- Mobile menu -->
	{#if open}
		<div class="border-t border-sand-100 px-6 pb-6 lg:hidden" transition:slide={{ duration: 250 }}>
			<div class="flex flex-col gap-1 pt-3">
				{#each links as link}
					<a
						href={link.href}
						onclick={() => (open = false)}
						class="rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 {isActive(link.href)
							? 'bg-sand-100 text-sand-900'
							: 'text-sand-600 hover:bg-sand-50 hover:text-sand-900'}"
					>
						{link.label}
					</a>
				{/each}
				<div class="mt-3 border-t border-sand-100 pt-4">
					<Button class="w-full" href="#waitlist" onclick={() => (open = false)}>Join Waitlist</Button>
				</div>
			</div>
		</div>
	{/if}
</nav>
