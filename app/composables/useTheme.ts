type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'tlv-theme'

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode)
}

function getSystemPreference(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const mode = ref<ThemeMode>('light')

export function useTheme() {
  if (import.meta.client && !(window as any).__themeInit) {
    ;(window as any).__themeInit = true
    const stored = localStorage.getItem(STORAGE_KEY)
    mode.value = stored === 'light' || stored === 'dark' ? stored : getSystemPreference()
    applyTheme(mode.value)
  }

  // 按鈕顯示的是「切換後」的目標模式
  const targetMode = computed<ThemeMode>(() => (mode.value === 'dark' ? 'light' : 'dark'))

  const icon = computed(() => (targetMode.value === 'dark' ? '🌙' : '☀️'))

  const label = computed(() => (targetMode.value === 'dark' ? '暗' : '亮'))

  function toggle() {
    const next: ThemeMode = mode.value === 'dark' ? 'light' : 'dark'
    mode.value = next
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return { mode, targetMode, icon, label, toggle }
}
