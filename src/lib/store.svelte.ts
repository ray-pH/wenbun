import { SvelteMap } from "svelte/reactivity";

export const hanziWriterJSONCache = $state(new SvelteMap<string, any>());