<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
	<p class="text-6xl font-extrabold text-sand-200">{page.status}</p>
	<h1 class="mt-4 text-2xl font-bold text-sand-900">
		{#if page.status === 404}
			Page not found.
		{:else}
			Something went wrong.
		{/if}
	</h1>
	<p class="mt-3 text-base text-sand-500">
		{#if page.status === 404}
			The page you're looking for doesn't exist or has been moved.
		{:else}
			{page.error?.message || 'An unexpected error occurred.'}
		{/if}
	</p>
	<div class="mt-8">
		<Button href="/">Back to home</Button>
	</div>
</div>
