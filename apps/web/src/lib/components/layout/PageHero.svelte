<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import SectionLabel from '$lib/components/ui/SectionLabel.svelte';

	let {
		eyebrow,
		title,
		subtitle,
		children,
		class: className = ''
	}: {
		eyebrow: string;
		title: string;
		subtitle: string;
		children?: Snippet;
		class?: string;
	} = $props();

	let mounted = $state(false);

	$effect(() => {
		mounted = true;
	});
</script>

<div class="mx-auto max-w-4xl px-6 pb-16 pt-32 text-center lg:pb-24 lg:pt-40 {className}">
	{#if mounted}
		<div in:fly={{ y: 20, duration: 600, easing: cubicOut }}>
			<SectionLabel text={eyebrow} class="mb-6" />
		</div>
		<h1
			class="text-4xl font-extrabold tracking-tight text-sand-900 sm:text-5xl lg:text-6xl"
			in:fly={{ y: 20, duration: 600, delay: 100, easing: cubicOut }}
		>
			{title}
		</h1>
		<p
			class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-sand-500 sm:text-xl"
			in:fly={{ y: 20, duration: 600, delay: 200, easing: cubicOut }}
		>
			{subtitle}
		</p>
		{#if children}
			<div
				class="mt-10"
				in:fly={{ y: 20, duration: 600, delay: 300, easing: cubicOut }}
			>
				{@render children()}
			</div>
		{/if}
	{/if}
</div>
