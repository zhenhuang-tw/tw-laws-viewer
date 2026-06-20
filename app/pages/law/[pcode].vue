<script setup lang="ts">
import { currentLaw } from '~/composables/useCurrentLaw'

const route = useRoute()
const pcode = computed(() => route.params.pcode as string)

const { data: law } = await useAsyncData(`law-${pcode.value}`, () =>
  queryCollection('laws').where('pcode', '=', pcode.value).first(),
)

// 共享給 ChapterIndex
watchEffect(() => {
  currentLaw.value = (law.value as any) ?? null
})

useHead({
  title: law.value ? `${(law.value as any).name} — 雲端法條本` : '雲端法條本',
})

function toChineseDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    const y = parseInt(match[1]!, 10)
    const m = parseInt(match[2]!, 10)
    const d = parseInt(match[3]!, 10)
    return `${y}年${m}月${d}日`
  }
  return iso
}

// 條號跳轉
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
  <div v-if="law">
    <header class="law-header">
      <h1>{{ (law as any).name }}</h1>
      <div class="law-meta">
        <!-- <span>{{ (law as any).lawLevel }}</span> -->
        <span v-if="(law as any).isAbolished" class="badge-abolished">（已廢止）</span>
        <span>最後異動日期：{{ toChineseDate((law as any).lastAmended) }}</span>
      </div>
    </header>

    <!-- 半寬模式內嵌摺疊 TOC -->
    <details class="inline-toc">
      <summary>章節索引</summary>
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
        v-for="(chapter, ci) in (law as any).chapters"
        :key="ci"
        v-show="chapter.name"
        :href="`#chapter-${ci}`"
        class="inline-toc-chapter"
      >
        {{ chapter.name }}
      </a>
    </details>

    <!-- 條文內容 -->
    <template v-for="(chapter, ci) in (law as any).chapters" :key="ci">
      <h2 v-if="chapter.name" :id="`chapter-${ci}`" class="chapter-heading">
        {{ chapter.name }}
      </h2>
      <div
        v-for="article in chapter.articles"
        :key="article.no"
        :id="`article-${article.no}`"
        class="article-block"
      >
        <span class="article-no">{{ article.no }}</span>
        <span class="article-content">{{ article.content }}</span>
      </div>
    </template>
  </div>

  <div v-else class="empty-state">找不到此法規（pcode: {{ pcode }}）</div>
</template>
