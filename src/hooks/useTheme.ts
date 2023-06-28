import type { GlobalThemeOverrides } from 'naive-ui'
import { computed, watch } from 'vue'
import { darkTheme, useOsTheme } from 'naive-ui'
import { useAppStore } from '@/store'

export function useTheme() {
  const appStore = useAppStore()

  const OsTheme = useOsTheme()

  const isDark = computed(() => {
    if (appStore.theme === 'auto')
      return OsTheme.value === 'dark'
    else
      return appStore.theme === 'dark'
  })

  const theme = computed(() => {
    return isDark.value ? darkTheme : undefined
  })

  const themeOverrides = computed<GlobalThemeOverrides>(() => {
    return {
      // common: {
      //   nBorderHover: '1px solid #2080f0',
      //   nBborderFocus: '1px solid #2080f0',
      // },
      Input: {
        nBorderHover: '1px solid #2080f0',
        nBorderFocus: '1px solid #2080f0',
      },
      Select: {
        nBorderActive: '1px solid #2080f0',
        nBorderHover: '1px solid #2080f0',
        nBorderFocus: '1px solid #2080f0',
        nBoxShadowHover: '1px solid #2080f0',
        nBoxShadowFocus: '1px solid #2080f0',
      },
      Checkbox: {
        nBorderHover: '1px solid #2080f0',
        nBorderFocus: '1px solid #2080f0',
      },
    }
  })

  watch(
    () => isDark.value,
    (dark) => {
      if (dark)
        document.documentElement.classList.add('dark')
      else
        document.documentElement.classList.remove('dark')
    },
    { immediate: true },
  )

  return { theme, themeOverrides }
}
