// import {type PropertyValues} from 'snar'

export function copyToClipboard(text: string | number) {
	navigator.clipboard.writeText(text + '')
}

export function sleep(milli: number = 1000) {
	return new Promise((r) => setTimeout(r, milli))
}

export function preventDefault(event: Event) {
	event.preventDefault()
}
export function stopPropagation(event: Event) {
	event.stopPropagation()
}

/**
 * Re-dispatches an event from the provided element.
 *
 * This function is useful for forwarding non-composed events, such as `change`
 * events.
 *
 * @example
 * class MyInput extends LitElement {
 *   render() {
 *     return html`<input @change=${this.redispatchEvent}>`;
 *   }
 *
 *   protected redispatchEvent(event: Event) {
 *     redispatchEvent(this, event);
 *   }
 * }
 *
 * @param element The element to dispatch the event from.
 * @param event The event to re-dispatch.
 * @return Whether or not the event was dispatched (if cancelable).
 */
export function redispatchEvent(element: Element, event: Event) {
	// For bubbling events in SSR light DOM (or composed), stop their propagation
	// and dispatch the copy.
	if (event.bubbles && (!element.shadowRoot || event.composed)) {
		event.stopPropagation()
	}

	const copy = Reflect.construct(event.constructor, [event.type, event])
	const dispatched = element.dispatchEvent(copy)
	if (!dispatched) {
		event.preventDefault()
	}

	return dispatched
}

const eventOpts = {composed: true, bubbles: true}
export function getElementsTree(node: Element): Promise<Element[]> {
	return new Promise((resolve, _reject) => {
		function f(event: Event) {
			resolve(event.composedPath() as Element[])
			node.removeEventListener('get-elements-tree', f)
		}
		node.addEventListener('get-elements-tree', f)
		node.dispatchEvent(new Event('get-elements-tree', eventOpts))
	})
}
export async function getElementInTree(
	from: Element,
	condition: (element: Element) => boolean,
): Promise<Element | undefined> {
	for (const element of await getElementsTree(from)) {
		if (condition(element)) {
			return element
		}
	}
}

export function shuffleArray<T>(array: T[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[array[i]!, array[j]!] = [array[j]!, array[i]!]
	}
}

export async function getHash(input: string | object): Promise<string> {
	function sortObject(value: unknown): unknown {
		if (Array.isArray(value)) {
			return value.map(sortObject)
		}

		if (value !== null && typeof value === 'object') {
			return Object.fromEntries(
				Object.entries(value)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([key, val]) => [key, sortObject(val)]),
			)
		}

		return value
	}

	const normalized =
		typeof input === 'string' ? input : JSON.stringify(sortObject(input))

	// console.log('normalized: ', normalized)

	const data = new TextEncoder().encode(normalized)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)

	return Array.from(new Uint8Array(hashBuffer))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
}

export function random(min: number, max: number, decimal = 0): number {
	const random = Math.random() * (max - min) + min
	return parseFloat(random.toFixed(decimal))
}

export function saveDataToFile(data: string, filename: string): void {
	const blob = new Blob([data], {type: 'text/plain'})
	const link = document.createElement('a')
	link.download = filename
	link.href = URL.createObjectURL(blob)
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

export async function loadDataFromFile(): Promise<string> {
	return new Promise((resolve, reject) => {
		const input = document.createElement('input')
		input.type = 'file'

		input.onchange = () => {
			const file = input.files?.[0]
			if (!file) {
				reject(new Error('No file selected'))
				return
			}

			const reader = new FileReader()

			reader.onload = (event) => {
				const result = event.target?.result
				if (typeof result === 'string') {
					resolve(result)
				} else {
					reject(new Error('File read error: result is not a string'))
				}
			}

			reader.onerror = () => {
				reject(new Error('Error reading file'))
			}

			reader.readAsText(file)
		}

		input.click()
	})
}

// export function propertyValuesToJson<T>(
// 	changed: PropertyValues<T>,
// 	object: T,
// ): Partial<T> {
// 	return Object.fromEntries(
// 		[...changed.keys()].map((key) => [key, object[key as keyof typeof object]]),
// 	) as Partial<T>
// }

export function changeStyleProperty(cssVar: string, value: number | string) {
	document.documentElement.style.setProperty(`--${cssVar}`, value + '')
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.crossOrigin = 'anonymous' // prevent CORS taint if server allows
		img.onload = () => {
			if (img.naturalWidth === 0 || img.naturalHeight === 0) {
				reject(new Error('Image has zero dimensions'))
			} else {
				resolve(img)
			}
		}
		img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
		img.src = url
	})
}

export function roundFloat(value: number, decimals: number): number {
	const factor = 10 ** decimals
	return Math.round(value * factor) / factor
}

export function waitForTransition(element: HTMLElement) {
	return new Promise<void>((resolve) => {
		const handler = () => {
			element.removeEventListener('transitionend', handler)
			resolve()
		}
		element.addEventListener('transitionend', handler)
	})
}

export function createHighlightedHtml(
	input: string,
	search: string | string[],
): string {
	if (!search || (Array.isArray(search) && search.length === 0)) return input

	const esc = function (s: string): string {
		return s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
	}

	const escapedInput = esc(input)

	// Normalize search to array of strings
	const keywords = Array.isArray(search)
		? search.filter(Boolean)
		: search.split(/\s+/).filter(Boolean)

	if (keywords.length === 0) return escapedInput

	// Escape regex characters in each keyword
	const escapedKeywords = keywords.map((k) =>
		k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
	)

	// Create a regex matching any keyword
	const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi')

	return escapedInput.replace(regex, '<span class="highlight">$1</span>')
}

export function loremIpsum(paragraphs: number = 1): string {
	const base =
		'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
		'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
		'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ' +
		'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ' +
		'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'

	if (paragraphs <= 1) {
		return base
	}

	return Array(paragraphs).fill(base).join('\n\n')
}

/**
 * Returns a new reference
 */
export function removeObjectKeys(arr: any, keys: string[]) {
	const clone = {...arr}
	for (const key of keys) {
		delete clone[key]
	}
	return clone
}

// export function isInViewport(el: Element) {
// 	return (
// 		el.getBoundingClientRect().top >= 0 &&
// 		el.getBoundingClientRect().bottom <= window.innerHeight
// 	)
// }

// export type VisibilityCheck =
// 	| 'top-visible'
// 	| 'center-visible'
// 	| 'bottom-visible'
// 	| 'partially-visible'
// 	| 'fully-visible'
//
// export type CheckIf = (is: (visibility: VisibilityCheck) => boolean) => boolean
//
// export function visibilityCheck(
// 	el: HTMLElement,
// 	/**
// 	 * @default top is not visible
// 	 */
// 	checkIf: CheckIf = (is) => !is('top-visible')
// ): boolean {
// 	const rect = el.getBoundingClientRect()
// 	const viewHeight = window.innerHeight || document.documentElement.clientHeight
// 	const viewWidth = window.innerWidth || document.documentElement.clientWidth
//
// 	function is(visibilityCheck: VisibilityCheck) {
// 		switch (visibilityCheck) {
// 			case 'top-visible':
// 				return rect.top >= 0 && rect.top <= viewHeight
//
// 			case 'center-visible': {
// 				const centerY = rect.top + rect.height / 2
// 				const centerX = rect.left + rect.width / 2
// 				return (
// 					centerY >= 0 &&
// 					centerY <= viewHeight &&
// 					centerX >= 0 &&
// 					centerX <= viewWidth
// 				)
// 			}
//
// 			case 'bottom-visible':
// 				return rect.bottom >= 0 && rect.bottom <= viewHeight
//
// 			case 'fully-visible':
// 				return (
// 					rect.top >= 0 &&
// 					rect.left >= 0 &&
// 					rect.bottom <= viewHeight &&
// 					rect.right <= viewWidth
// 				)
//
// 			case 'partially-visible':
// 			default:
// 				return (
// 					rect.bottom > 0 &&
// 					rect.right > 0 &&
// 					rect.top < viewHeight &&
// 					rect.left < viewWidth
// 				)
// 		}
// 	}
//
// 	return checkIf(is)
// }
//
// export function isInViewport(el: HTMLElement) {
// 	return visibilityCheck(el, (is) => is('partially-visible'))
// }

// export function isElementObstructed(el: Element | null): boolean {
// 	if (!el) return true
//
// 	let current: Element | null = el
//
// 	while (current) {
// 		const style = getComputedStyle(current)
//
// 		if (
// 			style.display === 'none' ||
// 			style.visibility === 'hidden' ||
// 			style.visibility === 'collapse' ||
// 			parseFloat(style.opacity) === 0
// 		) {
// 			return true
// 		}
//
// 		current = current.parentElement
// 	}
//
// 	const rect = el.getBoundingClientRect()
//
// 	if (rect.width === 0 || rect.height === 0) {
// 		return true
// 	}
//
// 	const points: [number, number][] = [
// 		[rect.left + rect.width / 2, rect.top + rect.height / 2],
// 		[rect.left + 1, rect.top + 1],
// 		[rect.right - 1, rect.bottom - 1],
// 	]
//
// 	for (const [x, y] of points) {
// 		const elements = document.elementsFromPoint(x, y)
//
// 		const index = elements.findIndex((e) => e === el || el.contains(e))
//
// 		if (index > 0) {
// 			return true
// 		}
// 	}
//
// 	return false
// }

// export interface ScrollStrategy {
// 	/**
// 	 * The visibility check to use to determine
// 	 * whether or not the scroll should be issued.
// 	 *
// 	 * @default when top is not visible
// 	 */
// 	if: CheckIf
// 	/**
// 	 * @default 'smooth'
// 	 */
// 	behavior: ScrollBehavior
// 	/**
// 	 * @default undefined
// 	 */
// 	block: ScrollLogicalPosition | undefined
// 	/**
// 	 * @default undefined
// 	 */
// 	inline: ScrollLogicalPosition | undefined
//
// 	/**
// 	 * @default 10px
// 	 */
// 	yOffsetPx: number
// }
// export const scrollStrategyDefaults: ScrollStrategy = {
// 	if: (is) => !is('top-visible'),
// 	behavior: 'smooth',
// 	block: undefined,
// 	inline: undefined,
// 	yOffsetPx: 10,
// }
//
// export function scrollIntoView(
// 	el: HTMLElement,
// 	options?: Partial<ScrollStrategy>
// ): void {
// 	const _options = {
// 		...scrollStrategyDefaults,
// 		...options,
// 	}
// 	const {if: _if, behavior, block, yOffsetPx} = _options
//
// 	if (visibilityCheck(el, _if)) {
// 		return
// 	}
//
// 	const rect = el.getBoundingClientRect()
//
// 	let top: number
//
// 	switch (block) {
// 		case 'center':
// 			top = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2
// 			break
//
// 		case 'end':
// 			top = window.scrollY + rect.bottom - window.innerHeight
// 			break
//
// 		case 'nearest':
// 			// Simple approximation.
// 			if (rect.top < 0) {
// 				top = window.scrollY + rect.top
// 			} else {
// 				top = window.scrollY + rect.bottom - window.innerHeight
// 			}
// 			break
//
// 		case 'start':
// 		default:
// 			top = window.scrollY + rect.top
// 			break
// 	}
//
// 	window.scrollTo({
// 		top: top - yOffsetPx,
// 		behavior,
// 	})
// }

// export function onScrollDebounced(
// 	callback: (event: Event) => void,
// 	timeoutMs = 200
// ): Debouncer {
// 	const debouncer = new Debouncer((event: Event) => {
// 		callback(event)
// 	}, timeoutMs)
//
// 	function listener(event: Event) {
// 		debouncer.call(event)
// 	}
//
// 	window.addEventListener('scroll', listener)
//
// 	return debouncer
// }

export function isValidUrl(text: string): boolean {
	if (typeof text !== 'string') return false

	const trimmed = text.trim()

	if (trimmed.length === 0) return false

	try {
		const url = new URL(trimmed)
		return url.protocol === 'http:' || url.protocol === 'https:'
	} catch {
		return false
	}
}

export function onUrlChange(callback: (url: string) => void): void {
	let lastUrl = location.href

	function check(): void {
		if (location.href !== lastUrl) {
			lastUrl = location.href
			callback(location.href)
		}
	}

	const originalPushState = history.pushState
	history.pushState = function (
		...args: Parameters<History['pushState']>
	): void {
		originalPushState.apply(this, args)
		check()
	}

	const originalReplaceState = history.replaceState
	history.replaceState = function (
		...args: Parameters<History['replaceState']>
	): void {
		originalReplaceState.apply(this, args)
		check()
	}

	window.addEventListener('popstate', check)
}

// export function injectCSS(
// 	css: string,
// 	options?: {context: ShadowRoot | Document}
// ) {
// 	const ss = new CSSStyleSheet()
// 	ss.replace(css.trim())
// 	;(options?.context ?? document).adoptedStyleSheets.push(ss)
// }

export function click(
	el: HTMLElement | Element,
	options?: {
		/**
		 * @default true
		 */
		dispatch?: boolean
		ctrlKey?: boolean
	},
) {
	if (!el) return

	if ((options?.dispatch ?? true) || options?.ctrlKey) {
		el.dispatchEvent(
			new PointerEvent('click', {
				bubbles: true,
				composed: true,
				ctrlKey: options?.ctrlKey ?? false,
			}),
		)
	} else {
		;(el as HTMLElement).click()
	}
}

export function isLocal() {
	return (
		window.location.hostname === 'localhost' ||
		window.location.hostname === '127.0.0.1' ||
		window.location.hostname === '::1' ||
		window.location.hostname.startsWith('192.168.')
	)
}

export function getTextContent(element: Element): string {
	function walk(node: Node): string {
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent ?? ''
		}

		if (node.nodeType !== Node.ELEMENT_NODE) {
			return ''
		}

		const el = node as HTMLElement

		// Cas spécial : image avec alt (emoji)
		if (el.tagName === 'IMG') {
			const alt = (el as HTMLImageElement).alt
			return alt ? alt : ''
		}

		let result = ''

		for (const child of el.childNodes) {
			result += walk(child)
		}

		return result
	}

	return walk(element).trim()
}

export function getDeepActiveElement(): Element | null {
	let active: Element | null = document.activeElement

	while (active?.shadowRoot?.activeElement) {
		active = active.shadowRoot.activeElement
	}

	return active
}
