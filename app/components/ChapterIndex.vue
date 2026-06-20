<script setup lang="ts">
import { currentLaw } from '~/composables/useCurrentLaw'

const jumpNo = ref('')
function jumpToArticle() {
  const no = parseInt(jumpNo.value, 10)
  if (!no) return
  const target = document.getElementById(`article-第 ${no} 條`)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' })
  }
}

function collectHeadings(nodes: any[]): any[] {
  const result: any[] = []
  for (const node of nodes) {
    if (node.type === 'heading' && node.name) {
      result.push(node)
    }
    if (node.children?.length) {
      result.push(...collectHeadings(node.children))
    }
  }
  return result
}

function slugify(text: string): string {
  return text.replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '')
}

const headings = computed(() => collectHeadings(currentLaw.value?.body ?? []))
</script>

<template>
  <nav v-if="headings.length" aria-label="章節索引">
    <div class="chapter-index-title">章節索引</div>
    <div class="article-jump">
      <input
        v-model="jumpNo"
        type="number"
        min="1"
        placeholder="輸入條號跳轉..."
        @keyup.enter="jumpToArticle"
      />
    </div>
    <a
      v-for="(h, hi) in headings"
      :key="hi"
      :href="`#h-${slugify(h.name)}`"
      class="chapter-index-link"
      :style="{ paddingLeft: `${(h.level ?? 0) * 0.6 + 0.5}rem` }"
    >
      {{ h.name }}
    </a>
  </nav>
  <div v-else class="empty-state">請選擇法規</div>
</template>

<style scoped>
nav {
  display: block;
}
</style>
