interface Viewport {
	left: number
	top: number
	right: number
	bottom: number
}

export function getViewportVisibleText(): string {
	const viewport: Viewport = {
		left: 0,
		top: 0,
		right: window.innerWidth,
		bottom: window.innerHeight,
	}

	function intersects(rect: DOMRect): boolean {
		return (
			rect.right > viewport.left &&
			rect.left < viewport.right &&
			rect.bottom > viewport.top &&
			rect.top < viewport.bottom
		)
	}

	function isTextNodeVisible(node: Text): boolean {
		let element = node.parentElement

		while (element) {
			const style = getComputedStyle(element)

			if (
				style.display === 'none' ||
				style.visibility === 'hidden' ||
				style.visibility === 'collapse' ||
				style.opacity === '0' ||
				style.contentVisibility === 'hidden'
			) {
				return false
			}

			const rect = element.getBoundingClientRect()

			if (rect.width === 0 || rect.height === 0) {
				return false
			}

			element = element.parentElement
		}

		return true
	}

	function getTextNodes(element: Element): Text[] {
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)

		const nodes: Text[] = []
		let node: Node | null

		while ((node = walker.nextNode())) {
			if (node.nodeType === Node.TEXT_NODE && node.nodeValue?.trim()) {
				nodes.push(node as Text)
			}
		}

		return nodes
	}

	const textNodes: Text[] = []
	const elements = document.querySelectorAll('*')

	for (const element of elements) {
		const rect = element.getBoundingClientRect()

		if (!intersects(rect)) {
			continue
		}

		for (const node of getTextNodes(element)) {
			if (!textNodes.includes(node) && isTextNodeVisible(node)) {
				textNodes.push(node)
			}
		}
	}

	let result = ''

	for (const node of textNodes) {
		const text = node.nodeValue ?? ''

		for (let i = 0; i < text.length; i++) {
			const range = document.createRange()

			range.setStart(node, i)
			range.setEnd(node, i + 1)

			const rect = range.getBoundingClientRect()

			if (intersects(rect)) {
				result += text[i]
			}
		}
	}

	return result
}
