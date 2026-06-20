<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

const { icon, label, toggle } = useTheme()
</script>

<template>
  <header id="app-header">
    <NuxtLink to="/" class="site-title">雲端法條本</NuxtLink>
    <button class="theme-toggle" :aria-label="`切換至${label}色主題`" @click="toggle">
      <span>{{ icon }}</span>
      <span>{{ label }}</span>
    </button>
  </header>
</template>
