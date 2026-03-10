<script lang="ts">
	let {
		text,
		class: className = ''
	}: {
		text: string;
		class?: string;
	} = $props();
</script>

<p
	class="text-xs font-semibold uppercase tracking-[0.2em] text-sand-400 {className}"
>
	{text}
</p>
