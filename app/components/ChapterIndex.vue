<script setup lang="ts">
import { currentLaw } from '~/composables/useCurrentLaw'

const chapters = computed(() => currentLaw.value?.chapters ?? [])

const jumpNo = ref('')
function jumpToArticle() {
  const no = parseInt(jumpNo.value, 10)
  if (!no) return
  const target = document.getElementById(`article-第 ${no} 條`)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <nav v-if="chapters.length" aria-label="章節索引">
    <div class="article-jump">
      <input
        v-model="jumpNo"
        type="number"
        min="1"
        placeholder="輸入條號跳轉..."
        @keyup.enter="jumpToArticle"
      />
    </div>
    <div class="chapter-index-title">章節索引</div>
    <a
      v-for="(chapter, ci) in chapters"
      :key="ci"
      v-show="chapter.name"
      :href="`#chapter-${ci}`"
      class="chapter-index-link"
    >
      {{ chapter.name }}
    </a>
  </nav>
  <div v-else class="empty-state">請選擇法規</div>
</template>

<style scoped>
nav {
  display: block;
}
</style>
