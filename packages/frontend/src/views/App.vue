<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Textarea from "primevue/textarea";
import InputText from "primevue/inputtext";

import { useHv, type TagSummary } from "@/composables/useHv";

const hv = useHv();
const search = ref("");

onMounted(() => hv.ensureInit());

const grouped = computed(() => {
  const q = search.value.trim().toLowerCase();
  const out: Record<string, TagSummary[]> = {};
  for (const t of hv.tags.value) {
    if (q && !t.name.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q))
      continue;
    (out[t.category] ??= []).push(t);
  }
  for (const k of Object.keys(out)) out[k]!.sort((a, b) => a.name.localeCompare(b.name));
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
});

function copyOutput() {
  navigator.clipboard?.writeText(hv.output.value);
}
</script>

<template>
  <div class="h-full w-full flex flex-col gap-3 p-3">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold">Hackvertor</h1>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" :checked="hv.autoConvert.value"
          @change="hv.toggleAuto(($event.target as HTMLInputElement).checked)" />
        Auto-convert tags on send
      </label>
    </div>

    <div class="flex gap-3 flex-1 min-h-0">
      <!-- Converter -->
      <div class="flex flex-col gap-2 flex-1 min-w-0">
        <span class="text-xs opacity-70">Input</span>
        <Textarea v-model="hv.input.value" @input="hv.convert()"
          class="flex-1 font-mono text-sm" placeholder="Type text and wrap it with tags, e.g. <@base64>hello</@base64>" />
        <div class="flex items-center justify-between">
          <span class="text-xs opacity-70">Output</span>
          <Button label="Copy" size="small" text @click="copyOutput" />
        </div>
        <Textarea :value="hv.output.value" readonly class="flex-1 font-mono text-sm" />
      </div>

      <!-- Tag palette -->
      <div class="flex flex-col gap-2 w-80 shrink-0 min-h-0">
        <InputText v-model="search" placeholder="Search tags…" class="text-sm" />
        <div class="flex-1 overflow-auto pr-1">
          <div v-for="(items, cat) in grouped" :key="cat" class="mb-3">
            <div class="text-xs font-semibold uppercase opacity-60 mb-1">{{ cat }}</div>
            <div class="flex flex-wrap gap-1">
              <button v-for="t in items" :key="t.name" v-tooltip.top="t.tooltip"
                class="px-2 py-0.5 text-xs rounded border border-surface-300 hover:bg-surface-200"
                @click="hv.insertTag(t)">
                {{ t.name }}
              </button>
            </div>
          </div>
          <div v-if="Object.keys(grouped).length === 0" class="text-xs opacity-60">
            No tags match “{{ search }}”.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
