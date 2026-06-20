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

/**
 * 將法條內文依 \r\n 切割，逐行分類為項／款／目。
 * - 項：一般的行（無特殊編號開頭）
 * - 款：以「一、」這類中文數字開頭的行
 * - 目：以「（一）」這類括號中文數字開頭的行
 */
function parseContent(content: string): { type: 'xiang' | 'kuan' | 'mu'; text: string }[] {
  if (!content) return []
  return content.split(/\r\n|\n/).map((line) => {
    const t = line.trim()
    if (!t) return { type: 'xiang' as const, text: '' }
    if (/^（[一二三四五六七八九十]+）/.test(t)) return { type: 'mu' as const, text: t }
    if (/^[一二三四五六七八九十]+、/.test(t)) return { type: 'kuan' as const, text: t }
    return { type: 'xiang' as const, text: t }
  })
}

/** 標題層級 → 字級：款(level 3)=1rem，每升一層 +0.14rem */
function headingSize(level: number): string {
  return `${1.0 + Math.max(0, 3 - level) * 0.14}rem`
}
</script>

<template>
  <template v-for="node in nodes" :key="nextKey()">
    <!-- heading -->
    <h2
      v-if="node.type === 'heading' && node.name"
      :id="'h-' + slugify(node.name)"
      class="chapter-heading"
      :style="{ fontSize: headingSize(node.level ?? 3) }"
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
      <div class="article-body">
        <template v-for="(p, pi) in parseContent(node.content)" :key="pi">
          <p v-if="p.text" :class="`law-${p.type}`">{{ p.text }}</p>
        </template>
      </div>
    </div>

    <!-- recurse children -->
    <RecursiveBody v-if="node.children?.length" :nodes="node.children" />
  </template>
</template>
