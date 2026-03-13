<script lang="ts">
	let email = $state('');
	let submitted = $state(false);

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (email) submitted = true;
	}
</script>

<footer class="border-t border-sand-200 bg-sand-50">
	<div class="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-3">
		<!-- Brand -->
		<div>
			<a href="/" class="text-xl font-bold tracking-tight text-sand-900">
				savoro<span class="text-blush-400">.</span>
			</a>
			<p class="mt-3 max-w-xs text-sm leading-relaxed text-sand-500">
				A modern nutrition platform where recipes and logging are the same thing. Fast tracking, trusted data, shareable meals.
			</p>
			<!-- Social -->
			<div class="mt-5 flex gap-3">
				{#each ['instagram', 'twitter', 'tiktok'] as social}
					<span
						class="flex h-9 w-9 items-center justify-center rounded-full border border-sand-200 text-sand-400 transition-colors hover:border-sand-300 hover:text-sand-600"
					>
						{#if social === 'instagram'}
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="2" y="2" width="20" height="20" rx="5" />
								<circle cx="12" cy="12" r="5" />
								<circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
							</svg>
						{:else if social === 'twitter'}
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
								/>
							</svg>
						{:else}
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z"
								/>
							</svg>
						{/if}
					</span>
				{/each}
			</div>
		</div>

		<!-- Navigation -->
		<div>
			<h4 class="mb-4 text-xs font-semibold tracking-widest text-sand-400 uppercase">Explore</h4>
			<ul class="space-y-3">
				{#each [
					{ label: 'Home', href: '/' },
					{ label: 'Philosophy', href: '/philosophy' },
					{ label: 'Recipes', href: '/recipes' },
					{ label: 'Journal', href: '/journal' }
				] as item}
					<li>
						<a href={item.href} class="text-sm text-sand-600 transition-colors hover:text-sand-900">
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>

		<!-- Newsletter -->
		<div>
			<h4 class="mb-4 text-xs font-semibold tracking-widest text-sand-400 uppercase">
				Stay in the loop
			</h4>
			{#if submitted}
				<p class="text-sm font-medium text-sage-400">Thanks! We'll be in touch.</p>
			{:else}
				<p class="mb-4 text-sm text-sand-500">
					Early access, recipes, and product updates. No spam.
				</p>
				<form onsubmit={handleSubmit} class="flex gap-2">
					<input
						type="email"
						bind:value={email}
						placeholder="you@email.com"
						required
						class="flex-1 rounded-[var(--radius-pill)] border-sand-200 bg-white px-4 py-2.5 text-sm text-sand-800 placeholder-sand-400 transition-colors focus:border-blush-300 focus:ring-blush-200"
					/>
					<button
						type="submit"
						class="cursor-pointer rounded-[var(--radius-pill)] bg-sand-900 px-5 py-2.5 text-sm font-semibold text-sand-50 transition-colors hover:bg-sand-800"
					>
						Join
					</button>
				</form>
			{/if}
		</div>
	</div>

	<div class="border-t border-sand-200 px-6 py-5">
		<p class="text-center text-xs text-sand-400">&copy; 2026 Savoro. All rights reserved.</p>
	</div>
</footer>
