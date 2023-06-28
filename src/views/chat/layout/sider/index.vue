<script setup lang='ts'>
import type { CSSProperties } from 'vue'
import { computed, onMounted, ref, watch } from 'vue'
import { NButton, NLayoutSider } from 'naive-ui'
import { storeToRefs } from 'pinia'
import List from './List.vue'
import Footer from './Footer.vue'
import { useAppStore, useAuthStore, useChatStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { PromptStore } from '@/components/common'

const appStore = useAppStore()
const chatStore = useChatStore()
const authStore = useAuthStore()

const { isMobile } = useBasicLayout()
const show = ref(false)
const { tokenInfo } = storeToRefs(authStore)

const collapsed = computed(() => appStore.siderCollapsed)

onMounted(async () => {
  await authStore.getCodeInfo()
})
function handleAdd() {
  chatStore.addHistory({ title: 'New Chat', uuid: Date.now(), isEdit: false, type: 0 })
}
function handleImageAdd() {
  chatStore.addHistory({ title: 'New AI-Image', uuid: Date.now(), isEdit: false, type: 1 })
}

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
}

const getMobileClass = computed<CSSProperties>(() => {
  if (isMobile.value) {
    return {
      position: 'fixed',
      zIndex: 50,
    }
  }
  return {}
})

const mobileSafeArea = computed(() => {
  if (isMobile.value) {
    return {
      paddingBottom: 'env(safe-area-inset-bottom)',
    }
  }
  return {}
})

watch(
  isMobile,
  (val) => {
    appStore.setSiderCollapsed(val)
  },
  {
    immediate: true,
    flush: 'post',
  },
)
</script>

<template>
  <NLayoutSider
    :collapsed="collapsed"
    :collapsed-width="0"
    :width="260"
    :show-trigger="isMobile ? false : 'arrow-circle'"
    collapse-mode="transform"
    position="absolute"
    bordered
    :style="getMobileClass"
    @update-collapsed="handleUpdateCollapsed"
  >
    <div class="flex flex-col h-full" :style="mobileSafeArea">
      <main class="flex flex-col flex-1 min-h-0">
        <div class="p-4">
          <NButton secondary block @click="handleAdd">
            新建聊天
          </NButton>
          <NButton secondary block type="info" style="margin-top: 9px;" @click="handleImageAdd">
            新建AI绘画
          </NButton>
        </div>
        <div class="flex-1 min-h-0 pb-4 overflow-hidden">
          <List />
        </div>
        <div class="p-4" style="display: flex;width: 100%;transform: translateY(2vh);">
          <NButton style="width: 49%;border-radius: 0;border-right: 0;">
            总量 : {{ tokenInfo.total }}
          </NButton>
          <NButton style="width: 49%; border-radius: 0;">
            剩余量 : {{ tokenInfo.remain }}
          </NButton>
        </div>
        <div class="p-4">
          <NButton block @click="show = true">
            提示词商店
          </NButton>
        </div>
      </main>
      <Footer />
    </div>
  </NLayoutSider>
  <template v-if="isMobile">
    <div v-show="!collapsed" class="fixed inset-0 z-40 bg-black/40" @click="handleUpdateCollapsed" />
  </template>
  <PromptStore v-model:visible="show" />
</template>
