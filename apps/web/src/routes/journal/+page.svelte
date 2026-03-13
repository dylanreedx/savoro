<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import SectionLabel from '$lib/components/ui/SectionLabel.svelte';
	import WaitlistForm from '$lib/components/ui/WaitlistForm.svelte';
	import BlogPostCard from '$lib/components/journal/BlogPostCard.svelte';
	import { blogPosts } from '$lib/data/blog-posts';

	let heroMounted = $state(false);

	$effect(() => {
		heroMounted = true;
	});
</script>

<svelte:head>
	<title>Journal — Savoro</title>
	<meta
		name="description"
		content="Thoughts on food, fitness, data trust, and building Savoro. Read about our product vision and the ideas behind the platform."
	/>
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden">
	<div class="pointer-events-none absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-lavender-100/30 blur-3xl"></div>

	<div class="relative mx-auto max-w-4xl px-6 pb-16 pt-20 text-center lg:pb-20 lg:pt-28">
		{#if heroMounted}
			<div in:fly={{ y: 20, duration: 600, easing: cubicOut }}>
				<SectionLabel text="Journal" class="mb-6" />
			</div>
			<h1
				class="text-4xl font-extrabold tracking-tight text-sand-900 sm:text-5xl"
				in:fly={{ y: 24, duration: 700, delay: 100, easing: cubicOut }}
			>
				Thoughts on food, fitness,<br class="hidden sm:block" /> and building Savoro.
			</h1>
			<p
				class="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-sand-500"
				in:fly={{ y: 20, duration: 600, delay: 200, easing: cubicOut }}
			>
				Product updates, industry perspectives, and the ideas behind the platform.
			</p>
		{/if}
	</div>
</section>

<!-- Blog posts -->
<section class="pb-24 lg:pb-32">
	<div class="mx-auto max-w-3xl space-y-4 px-6">
		{#each blogPosts as post, i}
			{#if heroMounted}
				<div in:fly={{ y: 20, duration: 500, delay: 300 + i * 100, easing: cubicOut }}>
					<BlogPostCard {post} />
				</div>
			{/if}
		{/each}
	</div>
</section>

<!-- CTA -->
<section id="waitlist" class="bg-sand-900 py-24 lg:py-32">
	<div class="mx-auto max-w-2xl px-6 text-center">
		<h2 class="text-3xl font-bold tracking-tight text-sand-100 md:text-4xl">
			Follow along.
		</h2>
		<p class="mx-auto mt-5 max-w-lg text-lg text-sand-400">
			Get product updates and new posts delivered to your inbox.
		</p>
		<WaitlistForm variant="dark" class="mt-8" />
	</div>
</section>
