<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  page: number;
  total: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  'update:page': [page: number];
}>();

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

// Compressed page list: first, last, and the current page with one neighbour
// on each side, e.g. 1 … 4 5 6 … 12. Any skipped pages collapse to an
// ellipsis, so the pager stays short however many pages there are.
type Item = { type: 'page'; value: number } | { type: 'ellipsis'; key: string };
const items = computed<Item[]>(() => {
  const last = pageCount.value;
  const current = Math.min(Math.max(1, props.page), last);
  const pages = new Set<number>([1, last]);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= last) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Item[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) out.push({ type: 'ellipsis', key: `e${p}` });
    out.push({ type: 'page', value: p });
  });
  return out;
});

function go(p: number) {
  if (p < 1 || p > pageCount.value || p === props.page) return;
  emit('update:page', p);
}
</script>

<template>
  <nav v-if="pageCount > 1" class="explore-pager" aria-label="Pagination">
    <div data-slot="list">
      <button type="button" class="explore-pager-btn" aria-label="Previous page" :disabled="page <= 1" @click="go(page - 1)">‹</button>
      <template v-for="item in items" :key="item.type === 'page' ? item.value : item.key">
        <button
          v-if="item.type === 'page'"
          type="button"
          class="explore-pager-btn"
          :class="{ 'explore-pager-btn--active': item.value === page }"
          :aria-current="item.value === page ? 'page' : undefined"
          @click="go(item.value)"
        >{{ item.value }}</button>
        <span v-else class="explore-pager-ellipsis" aria-hidden="true">···</span>
      </template>
      <button type="button" class="explore-pager-btn" aria-label="Next page" :disabled="page >= pageCount" @click="go(page + 1)">›</button>
    </div>
  </nav>
</template>
