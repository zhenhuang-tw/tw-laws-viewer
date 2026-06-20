<script setup lang="ts">
function slugify(text: string): string {
  return text.replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '')
}

defineProps<{
  nodes: any[]
}>()

let idx = 0
function nextKey() {
  return idx++
}
</script>

<template>
  <template v-for="node in nodes" :key="nextKey()">
    <!-- heading -->
    <h2
      v-if="node.type === 'heading' && node.name"
      :id="'h-' + slugify(node.name)"
      class="chapter-heading"
      :style="{ fontSize: `${1.1 - (node.level ?? 0) * 0.08}rem` }"
    >
      {{ node.name }}
    </h2>

    <!-- article -->
    <div
      v-else-if="node.type === 'article' && node.no"
      :id="`article-${node.no}`"
      class="article-block"
    >
      <span class="article-no">{{ node.no }}</span>
      <span class="article-content">{{ node.content }}</span>
    </div>

    <!-- recurse children -->
    <RecursiveBody v-if="node.children?.length" :nodes="node.children" />
  </template>
</template>
