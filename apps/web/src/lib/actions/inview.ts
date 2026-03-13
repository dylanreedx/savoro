export function inview(node: HTMLElement, options?: { threshold?: number; once?: boolean }) {
	const threshold = options?.threshold ?? 0.15;
	const once = options?.once ?? true;

	const observer = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting) {
				node.dispatchEvent(new CustomEvent('inview', { detail: { visible: true } }));
				if (once) observer.unobserve(node);
			} else if (!once) {
				node.dispatchEvent(new CustomEvent('inview', { detail: { visible: false } }));
			}
		},
		{ threshold }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
