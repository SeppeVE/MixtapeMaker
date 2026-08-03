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

function go(p: number) {
  if (p < 1 || p > pageCount.value || p === props.page) return;
  emit('update:page', p);
}
</script>

<template>
  <div v-if="pageCount > 1" class="explore-pager">
    <UPagination
      :page="page"
      :total="total"
      :items-per-page="pageSize"
      :show-controls="false"
      :sibling-count="1"
    >
      <template #prev>
        <button type="button" class="explore-pager-btn" :disabled="page <= 1" @click="go(page - 1)">‹</button>
      </template>
      <template #item="{ item }">
        <button
          type="button"
          class="explore-pager-btn"
          :class="{ 'explore-pager-btn--active': item.value === page }"
          @click="go(item.value)"
        >{{ item.value }}</button>
      </template>
      <template #ellipsis>
        <span class="explore-pager-ellipsis">···</span>
      </template>
      <template #next>
        <button type="button" class="explore-pager-btn" :disabled="page >= pageCount" @click="go(page + 1)">›</button>
      </template>
    </UPagination>
  </div>
</template>
