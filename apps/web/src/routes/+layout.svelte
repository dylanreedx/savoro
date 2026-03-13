<script lang="ts">
	import './layout.css';
	import Nav from '$lib/components/layout/Nav.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Savoro — Nutrition, Reimagined</title>
</svelte:head>

<Nav />
<main class="min-h-screen pt-[4.5rem]">
	{@render children()}
</main>
<Footer />
