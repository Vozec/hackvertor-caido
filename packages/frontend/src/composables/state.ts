// Plain module-level state (no Vue inject) so both the page components and the
// plugin entrypoint (init) can read/write it without a component context.
import { ref } from "vue";

import type { TagSummary } from "shared";

export const pageInput = ref("");
export const pageOutput = ref("");
export const tags = ref<TagSummary[]>([]);
export const autoConvert = ref(true);
export const busy = ref(false);
