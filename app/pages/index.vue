<script setup lang="ts">
import { categoryOrder, laws as lawConfig } from '~~/config/laws.config'

interface LawItem {
  pcode: string
  name: string
  customCategory: string
  isAbolished: boolean
}

const { data: allLaws } = await useAsyncData('home-laws', () => {
  return queryCollection('laws').all()
})

const laws = computed<LawItem[]>(() => (allLaws.value ?? []) as unknown as LawItem[])

const grouped = computed(() => {
  const pcodeRank = new Map(lawConfig.map((l, i) => [l.pcode, i]))

  const map = new Map<string, LawItem[]>()
  for (const law of laws.value) {
    const cat = law.customCategory
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(law)
  }

  for (const [, items] of map) {
    items.sort((a, b) => (pcodeRank.get(a.pcode) ?? 999) - (pcodeRank.get(b.pcode) ?? 999))
  }

  const ordered: string[] = []
  for (const cat of categoryOrder) {
    if (map.has(cat)) ordered.push(cat)
  }
  for (const cat of map.keys()) {
    if (!categoryOrder.includes(cat)) ordered.push(cat)
  }

  return ordered
    .filter((cat) => map.has(cat))
    .map((cat) => ({
      category: cat,
      laws: map.get(cat)!,
    }))
})
</script>

<template>
  <div>
    <h1>雲端法條本</h1>
    <p class="home-intro">
      這是我個人使用的法條查詢工具，目前只收錄準備國家考試（司法官與律師第二試及行政執行官為主）常用的法律。資料每週日從<a
        href="https://law.moj.gov.tw/"
        target="_blank"
        rel="noopener"
        >全國法規資料庫</a
      >自動同步，支援筆電（三欄）、平板（雙欄）、手機（單欄）三種閱讀模式。
    </p>

    <div v-if="!laws.length" class="empty-state">尚無法規資料，請先執行同步腳本。</div>

    <section v-for="group in grouped" :key="group.category" class="home-category">
      <h2>{{ group.category }}</h2>
      <ul class="home-law-list">
        <li v-for="law in group.laws" :key="law.pcode">
          <NuxtLink :to="`/law/${law.pcode}`" :class="{ abolished: law.isAbolished }">
            {{ law.name }}
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
