<script setup lang="ts">
import LawSidebar from '~/components/LawSidebar.vue'
import ChapterIndex from '~/components/ChapterIndex.vue'
import { shouldFocusSearch } from '~/composables/useSearchFocus'
import { hasHeadings } from '~/composables/useCurrentLaw'

type Drawer = 'none' | 'search' | 'toc' | 'chapter'

const activeDrawer = ref<Drawer>('none')

function toggleDrawer(d: Drawer) {
  if (activeDrawer.value === d) {
    activeDrawer.value = 'none'
  } else {
    activeDrawer.value = d
    if (d === 'search') {
      shouldFocusSearch.value = true
    }
  }
}

function closeDrawer() {
  activeDrawer.value = 'none'
}

const showOverlay = computed(() => activeDrawer.value !== 'none')
const showLeft = computed(() => activeDrawer.value === 'toc' || activeDrawer.value === 'search')
const showRight = computed(() => activeDrawer.value === 'chapter')

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 549
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// 底部按鈕清單：無章節時隱藏「章節」鈕
const navButtons = computed(() =>
  hasHeadings.value
    ? [
        { key: 'toc' as Drawer, icon: '📋', label: '目錄' },
        { key: 'search' as Drawer, icon: '🔍', label: '搜尋' },
        { key: 'chapter' as Drawer, icon: '📖', label: '章節' },
      ]
    : [
        { key: 'toc' as Drawer, icon: '📋', label: '目錄' },
        { key: 'search' as Drawer, icon: '🔍', label: '搜尋' },
      ],
)
</script>

<template>
  <div
    v-if="isMobile"
    style="
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3rem;
      display: flex;
      background: var(--pico-background-color, #fff);
      border-top: 1px solid var(--pico-muted-border-color, #ddd);
      z-index: 999;
    "
  >
    <button
      v-for="btn in navButtons"
      :key="btn.key"
      @click="toggleDrawer(btn.key)"
      style="
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: none;
        background: none;
        font-size: 0.7rem;
        color: inherit;
        cursor: pointer;
        padding: 0.25rem;
      "
    >
      <span style="font-size: 1.2rem">{{ btn.icon }}</span>
      <span>{{ btn.label }}</span>
    </button>
  </div>

  <ClientOnly>
    <Teleport to="body">
      <div class="drawer-overlay" :class="{ open: showOverlay }" @click="closeDrawer" />
      <div class="drawer-pane left" :class="{ open: showLeft }">
        <LawSidebar />
      </div>
      <div class="drawer-pane right" :class="{ open: showRight }">
        <ChapterIndex />
      </div>
    </Teleport>
  </ClientOnly>
</template>
