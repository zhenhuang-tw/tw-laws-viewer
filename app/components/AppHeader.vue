<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

const { icon, label, cycle } = useTheme()
</script>

<template>
  <header id="app-header">
    <NuxtLink to="/" class="site-title">雲端法條本</NuxtLink>
    <button class="theme-toggle" :aria-label="`主題：${label}`" @click="cycle">
      <span>{{ icon }}</span>
      <span>{{ label }}</span>
    </button>
  </header>
</template>
