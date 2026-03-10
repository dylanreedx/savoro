<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		variant = 'default',
		class: className = ''
	}: {
		variant?: 'default' | 'dark';
		class?: string;
	} = $props();

	let email = $state('');
	let submitted = $state(false);
	let focused = $state(false);

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (email.trim()) {
			submitted = true;
		}
	}
</script>

<div class={className}>
	{#if submitted}
		<div
			class="flex items-center gap-3 rounded-2xl {variant === 'dark' ? 'bg-sand-800' : 'bg-sage-50'} px-6 py-4"
			in:scale={{ duration: 400, easing: cubicOut, start: 0.95 }}
		>
			<span
				class="flex h-8 w-8 items-center justify-center rounded-full {variant === 'dark' ? 'bg-sage-400 text-sand-900' : 'bg-sage-200 text-sage-400'}"
				in:scale={{ duration: 300, delay: 150, easing: cubicOut, start: 0 }}
			>
				<svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="3.5 8.5 6.5 11.5 12.5 5.5" />
				</svg>
			</span>
			<p class="text-sm font-medium {variant === 'dark' ? 'text-sand-200' : 'text-sand-700'}">
				You're on the list. We'll be in touch.
			</p>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="flex flex-col gap-3 sm:flex-row">
			<div class="relative flex-1">
				<input
					type="email"
					bind:value={email}
					placeholder="you@email.com"
					required
					onfocus={() => (focused = true)}
					onblur={() => (focused = false)}
					class="w-full rounded-full border-0 {variant === 'dark' ? 'bg-sand-800 text-sand-100 placeholder:text-sand-500' : 'bg-white/80 text-sand-900 placeholder:text-sand-400'} px-6 py-3.5 text-sm shadow-sm ring-1 ring-inset {variant === 'dark' ? 'ring-sand-700' : 'ring-sand-200'} transition-shadow duration-200 focus:outline-none focus:ring-2 {variant === 'dark' ? 'focus:ring-blush-400' : 'focus:ring-blush-300'}"
				/>
			</div>
			<button
				type="submit"
				class="whitespace-nowrap rounded-full {variant === 'dark' ? 'bg-sand-50 text-sand-900 hover:bg-white' : 'bg-sand-900 text-sand-50 hover:bg-sand-800'} px-8 py-3.5 text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.97]"
			>
				Join the waitlist
			</button>
		</form>
	{/if}
</div>
