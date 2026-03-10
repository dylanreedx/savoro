<script lang="ts">
	let {
		size = 'md',
		class: className = ''
	}: {
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	} = $props();

	const sizeClasses = {
		sm: 'text-lg',
		md: 'text-xl',
		lg: 'text-2xl'
	};
</script>

<a href="/" class="inline-flex items-center gap-1.5 {className}" aria-label="Savoro home">
	<span class="font-extrabold tracking-tight {sizeClasses[size]} text-sand-900"
		>savoro</span
	>
	<span class="h-1.5 w-1.5 rounded-full bg-blush-300"></span>
</a>
