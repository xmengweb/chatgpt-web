<!-- eslint-disable unused-imports/no-unused-vars -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { NImage, NProgress } from 'naive-ui'
import typeSelect from '../components/typeSelect.vue'
import { useUsingContext } from '../hooks/useUsingContext'
import HeaderComponent from '../components/Header/index.vue'
import formText from './cnmps/formText.vue'
import formImg from './cnmps/formImg.vue'
import resultImgView from './cnmps/resultImg.vue'
import { useChatStore } from '@/store'
import { router } from '@/router'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import png1 from '@/assets/new1.png'
import png2 from '@/assets/new2.png'

// 后面用来计费
// const authStore = useAuthStore()
const chatStore = useChatStore()
const route = useRoute()
const { isMobile } = useBasicLayout()
const { usingContext, toggleUsingContext } = useUsingContext()

const { uuid } = route.params as { uuid: string }
const type = chatStore.getTypeByUuid(+uuid) ? 'Draw' : 'Chat'
if (route.name !== type)
  router.replace({ name: 'Chat', params: { uuid } })

const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const isLoading = computed(() => {
  if (!dataSources.value.length)
    return false
  else return dataSources.value.slice(-1)[0].loading
})
const progress = computed(() => {
  return dataSources.value.slice(-1)[0].progress || 0
})
const isShowType = computed(() => !dataSources.value.length)
const createType = ref<number>(0)
function changeUrl(url: string) {
  if (url === 'https://x.imgs.ovh/x/2023/09/10/64fd61af122a5.gif')
    return url
  else return url.replace('https://cdn.discordapp.com/', import.meta.env.VITE_IMG_PROXY)
}
</script>

<template>
  <div class="home flex flex-col items-center p-3 h-full" style="background-color: #fff;background-clip: content-box;">
    <HeaderComponent
      v-if="isMobile"
      :using-context="usingContext"
      @toggle-using-context="toggleUsingContext"
    />
    <typeSelect />
    <!-- 点击按钮进入选择生成模式 -->
    <div v-if="isShowType && createType === 0" class="flex-1 w-full	 flex flex-col items-center justify-center">
      <h2 class="text-center text-2xl font-bold text-gradient" style="margin: auto 0;">
        请选择一种生成模式
      </h2>
      <div class="flex items-center justify-between px-1/5 flex-1">
        <div class="flex items-center justify-center w-3/12	 hover:bg-[#c6e2ff] transition-all cursor-pointer shadow-md rounded-3xl flex-1 max-w-sm mr-3" @click="createType = 1">
          <img :src="png1" alt="">
        </div>
        <div class="flex items-center justify-center w-3/12 hover:bg-[#c6e2ff] transition-all cursor-pointer shadow-md rounded-3xl flex-1 max-w-sm" @click="createType = 2">
          <img :src="png2" alt="">
        </div>
      </div>
    </div>
    <!-- 根据模式提供相应的表单 -->
    <div v-if="isShowType && createType === 1" class="w-full flex-1 flex items-center" style="overflow-y: scroll;">
      <formText :uuid="uuid" :data-sources="dataSources" />
    </div>
    <div v-else-if="isShowType && createType === 2" class="w-full flex-1 flex items-center" style="overflow-y: scroll;">
      <formImg :uuid="uuid" :data-sources="dataSources" />
    </div>
    <!-- 结果页面 -->
    <resultImgView v-if="!isShowType" :uuid="uuid" :data-sources="dataSources" style="height: calc(100% - 73px);" />
    <div v-if="isLoading" class="loading-mask">
      <div class="loading-spinner">
        <div style="height: 90%;margin: 0 auto;">
          <NImage :src="changeUrl(dataSources.slice(-1)[0].text)" fallback-src="https://x.imgs.ovh/x/2023/09/10/64fd61af122a5.gif" object-fit="contain" style="width: 100%;height: 100%;justify-content: center;" />
        </div>
        <h2>正在努力生成中，一般一张图1-2分钟哦...</h2>
        <NProgress type="line" status="info" processing indicator-placement="inside" :percentage="progress" style="width: 30%;margin: auto;" />
        <!-- <h3 v-if="progress <= 10 && !dataSources.slice(-1)[0].isBigger">
          正在识别提示词
        </h3>
        <h3 v-else-if="progress <= 25 && !dataSources.slice(-1)[0].isBigger">
          正在将提示词翻译为英文
        </h3> -->
        <h3 v-if="progress <= 10 && !dataSources.slice(-1)[0].isBigger">
          正在发起绘画请求
        </h3>
        <h3 v-else-if="progress <= 100">
          AI正在努力绘画
        </h3>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
:deep(.n-input){
	--n-border-hover:1px solid #2080f0 !important;
	--n-border-focus:1px solid #2080f0 !important;
}
.loading-mask {
	position: absolute;
	background-color: #fff;
	margin: 0;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	transition: opacity var(--el-transition-duration);
  z-index: 0;
	.loading-spinner{
		top: 100px;
    width: calc(100% - 160px);
		height: calc(100% - 100px);
    text-align: center;
    position: absolute;
	}
}
.text-gradient {
	background-image: linear-gradient(to bottom, #3a7ac2, #2761ab);
	background-clip: text;
	color: transparent;
}
</style>
