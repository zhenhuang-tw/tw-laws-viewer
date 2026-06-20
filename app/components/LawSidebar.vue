<script setup lang="ts">
import { categoryOrder, laws as lawConfig } from '~~/config/laws.config'
import { shouldFocusSearch } from '~/composables/useSearchFocus'

interface LawItem {
  pcode: string
  name: string
  customCategory: string
  isAbolished: boolean
}

const route = useRoute()
const currentPcode = computed(() => (route.params.pcode as string) || null)
const searchQuery = ref('')
const openCategories = ref<Set<string>>(new Set())
const searchInput = ref<HTMLInputElement | null>(null)

// 由 MobileNav「搜尋」按鈕觸發時自動 focus 搜尋框
watch(shouldFocusSearch, (val) => {
  if (val) {
    nextTick(() => {
      searchInput.value?.focus()
      shouldFocusSearch.value = false
    })
  }
})

const { data: allLaws } = await useAsyncData('sidebar-laws', () => {
  return queryCollection('laws').all()
})

const laws = computed<LawItem[]>(() => (allLaws.value ?? []) as unknown as LawItem[])

// 依 categoryOrder 排序分類，分類內依 laws.config.ts 的順序排列
const grouped = computed(() => {
  // 建立 pcode → 順位對照表
  const pcodeRank = new Map(lawConfig.map((l, i) => [l.pcode, i]))

  const map = new Map<string, LawItem[]>()
  for (const law of laws.value) {
    const cat = law.customCategory
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(law)
  }

  // 各分類內的法規依 config 順序排列
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

  return ordered.map((cat) => ({
    category: cat,
    laws: map.get(cat)!,
  }))
})

// 搜尋篩選
const displayGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return grouped.value
  return grouped.value
    .map((g) => ({
      ...g,
      laws: g.laws.filter((l) => l.name.toLowerCase().includes(q)),
    }))
    .filter((g) => g.laws.length > 0)
})

// 追蹤哪些分類要展開
function isOpen(cat: string): boolean {
  return openCategories.value.has(cat)
}

function toggleCategory(cat: string) {
  const next = new Set(openCategories.value)
  if (next.has(cat)) {
    next.delete(cat)
  } else {
    next.add(cat)
  }
  openCategories.value = next
}

// 根據路由與搜尋自動展開
watch(
  [currentPcode, displayGroups, searchQuery],
  () => {
    const next = new Set<string>()

    if (searchQuery.value.trim()) {
      // 搜尋模式：展開所有符合的分類
      for (const g of displayGroups.value) {
        next.add(g.category)
      }
    } else {
      // 非搜尋模式：展開目前路由所屬分類
      if (currentPcode.value) {
        const law = laws.value.find((l) => l.pcode === currentPcode.value)
        if (law) next.add(law.customCategory)
      }
    }

    openCategories.value = next
  },
  { immediate: true },
)
</script>

<template>
  <nav>
    <div class="sidebar-search">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="search"
        placeholder="搜尋法規..."
        aria-label="搜尋法規"
      />
    </div>

    <div v-if="!laws.length" class="empty-state">尚無法規資料</div>

    <div v-for="group in displayGroups" :key="group.category" class="accordion-category">
      <div class="accordion-summary" @click="toggleCategory(group.category)">
        <span>{{ group.category }}</span>
        <span class="accordion-arrow" :class="{ open: isOpen(group.category) }">▸</span>
      </div>
      <div v-show="isOpen(group.category)" class="accordion-body">
        <NuxtLink
          v-for="law in group.laws"
          :key="law.pcode"
          :to="`/law/${law.pcode}`"
          class="accordion-law-link"
          :class="{ active: law.pcode === currentPcode, abolished: law.isAbolished }"
        >
          {{ law.name }}
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
nav {
  display: block;
}

.accordion-summary {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}

.accordion-summary:hover {
  background: var(--pico-muted-border-color, #f0f0f0);
}

.accordion-arrow {
  font-size: 0.7rem;
  transition: transform 0.2s ease;
}

.accordion-arrow.open {
  transform: rotate(90deg);
}
</style>
