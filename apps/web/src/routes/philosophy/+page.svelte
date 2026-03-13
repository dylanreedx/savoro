<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { inview } from '$lib/actions/inview';
	import SectionLabel from '$lib/components/ui/SectionLabel.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import WaitlistForm from '$lib/components/ui/WaitlistForm.svelte';

	let heroMounted = $state(false);
	let showValues = $state(false);
	let showTrust = $state(false);
	let showApproach = $state(false);
	let showCta = $state(false);

	$effect(() => {
		heroMounted = true;
	});

	const values = [
		{
			title: 'Adherence-neutral',
			description:
				"We don't punish missed days or celebrate streaks. We don't gamify consistency or send guilt-trip notifications. Your relationship with food is yours — we're just the tool.",
			icon: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'
		},
		{
			title: 'Trust by default',
			description:
				"Your nutrition data is personal. We don't sell it, mine it for advertising insights, or share it with third-party health platforms. Local-first where possible, encrypted always.",
			icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z'
		},
		{
			title: 'Joy in the mundane',
			description:
				'Logging food is a daily act. It should feel satisfying, even beautiful. We obsess over the micro-interactions — the tap, the confirm, the summary — because those moments add up.',
			icon: 'M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z'
		}
	];
</script>

<svelte:head>
	<title>Philosophy — Savoro</title>
	<meta
		name="description"
		content="Savoro is built on the belief that nutrition tools should empower, not shame. Learn about our approach to data trust, non-shaming design, and building tools that respect your relationship with food."
	/>
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden">
	<div class="pointer-events-none absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-sage-100/30 blur-3xl"></div>

	<div class="relative mx-auto max-w-4xl px-6 pb-16 pt-20 text-center lg:pb-24 lg:pt-28">
		{#if heroMounted}
			<div in:fly={{ y: 20, duration: 600, easing: cubicOut }}>
				<SectionLabel text="Our Philosophy" class="mb-6" />
			</div>
			<h1
				class="text-4xl font-extrabold tracking-tight text-sand-900 sm:text-5xl lg:text-6xl"
				in:fly={{ y: 24, duration: 700, delay: 100, easing: cubicOut }}
			>
				Food tracking<br />should feel good.
			</h1>
			<p
				class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-sand-500 sm:text-xl"
				in:fly={{ y: 20, duration: 600, delay: 200, easing: cubicOut }}
			>
				We're building Savoro on the belief that nutrition tools should empower, not shame. The act of
				paying attention to what you eat should be simple, satisfying, and entirely on your terms.
			</p>
		{/if}
	</div>
</section>

<!-- Values -->
<section
	class="bg-sand-100/50 py-24 lg:py-32"
	use:inview
	oninview={() => (showValues = true)}
>
	{#if showValues}
		<div class="mx-auto max-w-6xl px-6">
			<div class="grid gap-6 md:grid-cols-3">
				{#each values as value, i}
					<div in:fly={{ y: 20, duration: 500, delay: 100 + i * 100, easing: cubicOut }}>
						<GlassCard class="h-full">
							<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sand-100">
								<svg
									class="h-6 w-6 text-sand-500"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d={value.icon} />
								</svg>
							</div>
							<h3 class="text-lg font-bold text-sand-900">{value.title}</h3>
							<p class="mt-3 text-sm leading-relaxed text-sand-500">{value.description}</p>
						</GlassCard>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>

<!-- Data trust -->
<section
	class="py-24 lg:py-32"
	use:inview
	oninview={() => (showTrust = true)}
>
	{#if showTrust}
		<div class="mx-auto max-w-3xl px-6">
			<div in:fly={{ y: 20, duration: 500, easing: cubicOut }}>
				<SectionLabel text="Data trust" class="mb-4" />
				<h2 class="text-3xl font-bold tracking-tight text-sand-900 md:text-4xl">
					Your data, your terms.
				</h2>
			</div>

			<div class="mt-8 space-y-6" in:fly={{ y: 20, duration: 500, delay: 100, easing: cubicOut }}>
				<p class="text-base leading-relaxed text-sand-500">
					Most nutrition apps monetize your data — selling insights to insurance companies, advertisers,
					or research firms. We think that's wrong.
				</p>
				<p class="text-base leading-relaxed text-sand-500">
					Savoro is built on a simple model: you pay for the product, and the product works for you. Your
					food logs, your recipes, your patterns — they belong to you. We don't analyze them for
					advertising. We don't sell aggregate data. We don't partner with health insurers.
				</p>
				<p class="text-base leading-relaxed text-sand-500">
					We also believe nutrition data should be transparent. Every calorie, every macro, every
					micronutrient in our database traces back to a verifiable source. If a number looks wrong, you
					can see where it came from and correct it. Trust isn't a feature — it's the foundation.
				</p>
			</div>

			<div class="mt-12 grid gap-4 sm:grid-cols-3">
				{#each [
					{ stat: 'Zero', label: 'Third-party data sharing' },
					{ stat: '100%', label: 'Source-traceable nutrition data' },
					{ stat: 'You', label: 'Own your data, always' }
				] as item, i}
					<div
						in:fly={{ y: 20, duration: 400, delay: 200 + i * 80, easing: cubicOut }}
					>
						<GlassCard class="text-center">
							<p class="text-2xl font-bold text-sand-900">{item.stat}</p>
							<p class="mt-1 text-xs text-sand-500">{item.label}</p>
						</GlassCard>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>

<!-- Our approach -->
<section
	class="bg-sand-100/50 py-24 lg:py-32"
	use:inview
	oninview={() => (showApproach = true)}
>
	{#if showApproach}
		<div class="mx-auto max-w-3xl px-6">
			<div in:fly={{ y: 20, duration: 500, easing: cubicOut }}>
				<SectionLabel text="Our approach" class="mb-4" />
				<h2 class="text-3xl font-bold tracking-tight text-sand-900 md:text-4xl">
					Designed with research, built with care.
				</h2>
			</div>

			<div class="mt-8 space-y-6" in:fly={{ y: 20, duration: 500, delay: 100, easing: cubicOut }}>
				<p class="text-base leading-relaxed text-sand-500">
					Research shows that dietary self-monitoring is one of the most effective behavior-change tools
					for people managing their nutrition. But that same research also shows that tracking apps can
					contribute to disordered eating, body image concerns, and compulsive behavior — especially when
					they gamify adherence or use shame-based design patterns.
				</p>
				<p class="text-base leading-relaxed text-sand-500">
					We take this seriously. Savoro doesn't use streaks, doesn't penalize "bad" days, doesn't label
					foods as good or bad. We don't send notifications designed to make you feel guilty for not
					logging. We don't celebrate calorie deficits or punish surplus.
				</p>
				<p class="text-base leading-relaxed text-sand-500">
					Instead, we focus on making the act of logging feel fast, satisfying, and useful. If tracking is
					serving you, we want it to be effortless. If you need a break, your data will be here when you
					come back. No judgment either way.
				</p>
			</div>
		</div>
	{/if}
</section>

<!-- CTA -->
<section
	id="waitlist"
	class="relative overflow-hidden bg-sand-900 py-24 lg:py-32"
	use:inview
	oninview={() => (showCta = true)}
>
	{#if showCta}
		<div class="relative mx-auto max-w-2xl px-6 text-center">
			<h2
				class="text-3xl font-bold tracking-tight text-sand-100 md:text-4xl"
				in:fly={{ y: 20, duration: 500, easing: cubicOut }}
			>
				Join us in building something different.
			</h2>
			<p
				class="mx-auto mt-5 max-w-lg text-lg text-sand-400"
				in:fly={{ y: 20, duration: 500, delay: 100, easing: cubicOut }}
			>
				Sign up for early access and help shape what nutrition tracking should be.
			</p>
			<div in:fly={{ y: 20, duration: 500, delay: 200, easing: cubicOut }}>
				<WaitlistForm variant="dark" class="mt-8" />
			</div>
		</div>
	{/if}
</section>
