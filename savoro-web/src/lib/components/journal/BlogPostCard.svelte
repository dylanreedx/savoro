<script lang="ts">
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Badge from '$lib/components/ui/Badge.svelte';
	import type { BlogPost } from '$lib/data/blog-posts';

	let {
		post,
		class: className = ''
	}: {
		post: BlogPost;
		class?: string;
	} = $props();

	let expanded = $state(false);
</script>

<article class="glass group transition-all duration-300 hover:shadow-glass-lg {className}">
	<button
		onclick={() => (expanded = !expanded)}
		class="w-full p-6 text-left sm:p-8"
	>
		<div class="flex items-start justify-between gap-4">
			<div class="flex-1">
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-xs text-sand-400">{post.date}</span>
					<span class="h-3 w-px bg-sand-200"></span>
					<span class="text-xs text-sand-400">{post.readTime}</span>
				</div>
				<h3 class="mt-2 text-lg font-bold text-sand-900 sm:text-xl">{post.title}</h3>
				<p class="mt-2 text-sm leading-relaxed text-sand-500">{post.summary}</p>
				<div class="mt-3 flex gap-2">
					{#each post.tags as tag}
						<Badge>{tag}</Badge>
					{/each}
				</div>
			</div>
			<div
				class="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand-100 text-sand-400 transition-transform duration-300 {expanded ? 'rotate-180' : ''}"
			>
				<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<polyline points="4 6 8 10 12 6" />
				</svg>
			</div>
		</div>
	</button>

	{#if expanded}
		<div
			class="border-t border-sand-200/50 px-6 pb-8 pt-6 sm:px-8"
			transition:slide={{ duration: 350, easing: cubicOut }}
		>
			<div class="prose-sand prose prose-sm max-w-none">
				{#each post.content.split('\n\n') as paragraph}
					<p class="text-sm leading-relaxed text-sand-600">{paragraph}</p>
				{/each}
			</div>
		</div>
	{/if}
</article>
