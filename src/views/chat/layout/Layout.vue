<script setup lang='ts'>
import { computed } from 'vue'
import { NLayout, NLayoutContent, NLayoutHeader } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useChat } from '../hooks/useChat'
import Sider from './sider/index.vue'
import Permission from './Permission.vue'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useAuthStore, useChatStore } from '@/store'

const router = useRouter()
const appStore = useAppStore()
const chatStore = useChatStore()
const authStore = useAuthStore()
const { deleteDraw } = useChat()

router.replace({ name: chatStore.getTypeByUuid(+chatStore.active!) ? 'Draw' : 'Chat', params: { uuid: chatStore.active } })

chatStore.chat.forEach((value) => {
  if (value.data[value.data.length - 1]?.loading && value.data[value.data.length - 1].text === 'https://x.imgs.ovh/x/2023/09/10/64fd61af122a5.gif')
    deleteDraw(value.uuid, value.data.length - 1)
})

const { isMobile } = useBasicLayout()

const collapsed = computed(() => appStore.siderCollapsed)

const needPermission = computed(() => !!authStore.session?.auth && !authStore.token)

const getMobileClass = computed(() => {
  if (isMobile.value)
    return ['rounded-none', 'shadow-none']
  return ['border', 'rounded-md', 'shadow-md', 'dark:border-neutral-800']
})

const getContainerClass = computed(() => {
  return [
    'h-full',
    { 'pl-[260px]': !isMobile.value && !collapsed.value },
  ]
})
</script>

<template>
  <div class="h-full dark:bg-[#24272e] transition-all" :class="[isMobile ? 'p-0' : 'p-4']">
    <div class="h-full overflow-hidden" :class="getMobileClass">
      <NLayout class="z-40 transition" :class="getContainerClass" has-sider>
        <Sider />
        <NLayout>
          <NLayoutHeader class=" px-5" style="height: 4rem;display: flex;align-items: center;font-size: small;">
            <span style="color: #d83d20">⚠温馨提示:本系统每次查询，都会向ChatGPT支付费用，仅限用户自己使用，请勿传播。注:3.5每次对话消耗1次，4.0每次消耗5次，生成图每次消耗10次，若余量用完，请联系公司人员</span>
          </NLayoutHeader>
          <NLayoutContent style="height: calc(100% - 4rem);background-color: #ebf5fe;">
            <RouterView v-slot="{ Component, route }">
              <KeepAlive>
                <component :is="Component" :key="route.fullPath" />
              </KeepAlive>
            </RouterView>
          </NLayoutContent>
        </NLayout>
      </NLayout>
    </div>
    <Permission :visible="needPermission" />
  </div>
</template>
