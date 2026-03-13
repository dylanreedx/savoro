<script lang="ts">
	import { inview } from '$lib/actions/inview';

	let {
		data = [
			{ day: 'Mon', value: 1850 },
			{ day: 'Tue', value: 2100 },
			{ day: 'Wed', value: 1950 },
			{ day: 'Thu', value: 2250 },
			{ day: 'Fri', value: 2050 },
			{ day: 'Sat', value: 1800 },
			{ day: 'Sun', value: 2150 }
		],
		label = 'Calories',
		goal = 2200,
		class: className = ''
	}: {
		data?: Array<{ day: string; value: number }>;
		label?: string;
		goal?: number;
		class?: string;
	} = $props();

	let visible = $state(false);

	const padding = { top: 20, right: 10, bottom: 28, left: 10 };
	const width = 300;
	const height = 140;
	const innerW = width - padding.left - padding.right;
	const innerH = height - padding.top - padding.bottom;

	let minVal = $derived(Math.min(...data.map((d) => d.value)) * 0.9);
	let maxVal = $derived(Math.max(...data.map((d) => d.value)) * 1.05);

	let points = $derived(
		data.map((d, i) => ({
			x: padding.left + (i / (data.length - 1)) * innerW,
			y: padding.top + (1 - (d.value - minVal) / (maxVal - minVal)) * innerH
		}))
	);

	let goalY = $derived(
		padding.top + (1 - (goal - minVal) / (maxVal - minVal)) * innerH
	);

	// Smooth SVG path using cubic bezier
	let linePath = $derived(() => {
		if (points.length < 2) return '';
		let d = `M ${points[0].x},${points[0].y}`;
		for (let i = 1; i < points.length; i++) {
			const prev = points[i - 1];
			const curr = points[i];
			const cpx = (prev.x + curr.x) / 2;
			d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
		}
		return d;
	});

	let areaPath = $derived(() => {
		const line = linePath();
		if (!line) return '';
		const bottomY = padding.top + innerH;
		return `${line} L ${points[points.length - 1].x},${bottomY} L ${points[0].x},${bottomY} Z`;
	});
</script>

<div
	class="glass-strong p-5 {className}"
	use:inview={{ threshold: 0.3 }}
	oninview={() => (visible = true)}
>
	<div class="mb-3 flex items-baseline justify-between">
		<span class="text-xs font-semibold text-sand-600">{label} — This Week</span>
		<span class="text-[10px] text-sand-400">Goal: {goal.toLocaleString()}</span>
	</div>

	<svg viewBox="0 0 {width} {height}" class="w-full" preserveAspectRatio="xMidYMid meet">
		<defs>
			<linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="oklch(0.85 0.055 10)" stop-opacity="0.3" />
				<stop offset="100%" stop-color="oklch(0.85 0.055 10)" stop-opacity="0.02" />
			</linearGradient>
		</defs>

		<!-- Goal line -->
		<line
			x1={padding.left}
			y1={goalY}
			x2={padding.left + innerW}
			y2={goalY}
			stroke="oklch(0.86 0.016 75)"
			stroke-width="1"
			stroke-dasharray="4,4"
			class="transition-opacity duration-500 {visible ? 'opacity-100' : 'opacity-0'}"
		/>

		<!-- Area fill -->
		<path
			d={areaPath()}
			fill="url(#chartGradient)"
			class="transition-opacity duration-700 {visible ? 'opacity-100' : 'opacity-0'}"
		/>

		<!-- Line -->
		<path
			d={linePath()}
			fill="none"
			stroke="oklch(0.78 0.07 8)"
			stroke-width="2"
			stroke-linecap="round"
			class="transition-opacity duration-500 {visible ? 'opacity-100' : 'opacity-0'}"
		/>

		<!-- Data points -->
		{#each points as point, i}
			<circle
				cx={point.x}
				cy={point.y}
				r="3"
				fill="white"
				stroke="oklch(0.78 0.07 8)"
				stroke-width="1.5"
				class="transition-all duration-500 {visible ? 'opacity-100' : 'opacity-0'}"
				style="transition-delay: {i * 60}ms"
			/>
		{/each}

		<!-- Day labels -->
		{#each data as d, i}
			<text
				x={points[i].x}
				y={height - 6}
				text-anchor="middle"
				class="fill-sand-400 text-[9px]"
			>{d.day}</text>
		{/each}
	</svg>
</div>
