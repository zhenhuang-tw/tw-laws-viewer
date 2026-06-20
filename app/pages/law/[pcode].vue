<script setup lang="ts">
import { currentLaw } from '~/composables/useCurrentLaw'

const route = useRoute()
const pcode = computed(() => route.params.pcode as string)

const { data: law } = await useAsyncData(`law-${pcode.value}`, () =>
  queryCollection('laws').where('pcode', '=', pcode.value).first(),
)

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

const jumpNo = ref('')
function jumpToArticle() {
  const no = parseInt(jumpNo.value, 10)
  if (!no) return
  const target = document.getElementById(`article-第 ${no} 條`)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' })
  }
}

// ── 遞迴收集所有 heading 節點供 TOC 使用 ──
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

const headings = computed(() => collectHeadings((law.value as any)?.body ?? []))
</script>

<template>
  <div v-if="law">
    <header class="law-header">
      <h1>{{ (law as any).name }}</h1>
      <div class="law-meta">
        <span>{{ (law as any).lawLevel }}</span>
        <span v-if="(law as any).isAbolished" class="badge-abolished">（已廢止）</span>
        <span> · 最後異動日期：{{ toChineseDate((law as any).lastAmended) }}</span>
        <a
          v-if="(law as any).lawUrl"
          :href="(law as any).lawUrl"
          target="_blank"
          rel="noopener"
          class="law-source-link"
        >
          全國法規資料庫
        </a>
      </div>
      <div v-if="(law as any).effectiveNote" class="law-effective-note">
        ⚠ {{ (law as any).effectiveNote }}
      </div>
    </header>

    <!-- 半寬模式內嵌摺疊 TOC -->
    <details v-if="headings.length" class="inline-toc">
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
        v-for="(h, hi) in headings"
        :key="hi"
        :href="`#h-${slugify(h.name)}`"
        class="inline-toc-chapter"
        :style="{ paddingLeft: `${(h.level ?? 0) * 0.6 + 0.25}rem` }"
      >
        {{ h.name }}
      </a>
    </details>

    <!-- 遞迴渲染 body -->
    <RecursiveBody :nodes="(law as any).body" />
  </div>

  <div v-else class="empty-state">找不到此法規（pcode: {{ pcode }}）</div>
</template>
