<script setup lang="ts">
import AppHeader from '~/components/AppHeader.vue'
import LawSidebar from '~/components/LawSidebar.vue'
import ChapterIndex from '~/components/ChapterIndex.vue'
import MobileNav from '~/components/MobileNav.vue'
import { hasHeadings } from '~/composables/useCurrentLaw'
</script>

<template>
  <div id="app-layout">
    <AppHeader />
    <aside id="sidebar-left">
      <LawSidebar />
    </aside>
    <main id="main-content">
      <slot />
    </main>
    <aside v-if="hasHeadings" id="sidebar-right">
      <ChapterIndex />
    </aside>
    <MobileNav />
  </div>
</template>
