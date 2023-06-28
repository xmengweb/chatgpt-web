<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { NButton, NIcon, NImage, NInput, NLayout, NLayoutContent, NLayoutFooter, NLayoutSider, useMessage } from 'naive-ui'
import { useChat } from '../../hooks/useChat'
import createPrompt from './createPrompt.vue'
import type { IDrawIng, IDrawResult } from '@/typings/draw'
import axios from '@/utils/request/axios'
import { useAuthStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'

const { dataSources, uuid } = defineProps<{
  dataSources: Chat.Chat[]
  uuid: string
}>()
const curChoose = ref(dataSources.slice(-1)[0])
const wrapEl = ref<HTMLDivElement | null>(null)
const wrapWidth = ref(480)
onMounted(() => {
  const nums = dataSources[0].form?.imgSize.split(':').map(value => Number(value))
  let bs = 1
  if (nums![0] && nums![1])
    bs = nums![0] / nums![1]
  if (wrapEl.value?.clientHeight)
    wrapWidth.value = wrapEl.value?.clientHeight * bs
  else wrapWidth.value = 480
})

const reverseDataSouces = computed(() => dataSources.slice().reverse())
const message = useMessage()
const authStore = useAuthStore()
const { addDraw, updateDraw, deleteDraw, updateChatSome } = useChat()
const Hovers = ref<boolean[]>([false, false, false, false])
const inputCreate = ref('')
const { isMobile } = useBasicLayout()
const isShowHistory = ref(!isMobile.value)
const imageId = computed(() => curChoose.value.imgId)
const isBigger = computed(() => {
  if (curChoose.value?.isBigger)
    return true
  else return false
})
const imgProxy = import.meta.env.VITE_IMG_PROXY

watch(() => dataSources.slice(-1)[0].loading, (newload) => {
  if (!newload)
    curChoose.value = dataSources.slice(-1)[0]
})
// setInterval(() => {
//   console.log(wrapEl.value?.clientHeight)
// }, 1000)
function changeUrl(url: string) {
  return url.replace('https://cdn.discordapp.com/', imgProxy)
}
async function fetchDraw2(prompt: string, imgSize: string, imgVersion: string, promptReverse: string, customSize: string) {
  const fyprompt = (await axios.get(`/translate/${prompt}`)).data.ans
  let rvfyprompt = ''
  if (promptReverse)
    rvfyprompt = (await axios.get(`/translate/${promptReverse}`)).data.ans
  let myprompt = fyprompt
  if (imgSize === 'show' && customSize)
    myprompt += ` --aspect ${customSize}`
  else myprompt += ` --aspect ${imgSize}`
  if (imgVersion === 'niji')
    myprompt += ' --niji '
  else myprompt += ` --v ${imgVersion}`
  if (rvfyprompt)
    myprompt += ` --no ${rvfyprompt}`
  const reqObj = {
    action: 'CREATE_IMAGE',
    fast: true,
    prompt: myprompt,
  }
  const response: IDrawIng = (await axios.post('/createImage', reqObj)).data
  return response
}
async function fetchDraw(type: string, imageId: string, index = 0) {
  const reqObj: {
    action: string
    fast: boolean
    imageId: string
    index?: number // 将 index 定义为可选属性
  } = {
    action: type,
    fast: true,
    imageId,
  }
  if (index)
    reqObj.index = index
  const response: IDrawIng = (await axios.post('/createImage', reqObj)).data
  return response
}
async function fetchImgInfo(taskId: string) {
  const res: IDrawResult = (await axios.get(`/getImage/${taskId}`)).data
  return res
}
async function fetchPackage(type: string, imageId: string, index = 0, time = 0) {
  addDraw(+uuid, {
    dateTime: new Date().toLocaleString(),
    text: 'https://i.imgloc.com/2023/05/24/VDwUlP.gif',
    prompt: dataSources.slice(-1)[0].form?.prompt,
    taskId: '',
    loading: true,
    imgId: '',
    form: dataSources.slice(-1)[0].form,
    isBigger: type === 'UPSCALE',
  })
  try {
    const res = await fetchDraw(type, imageId, index)
    if (res.code !== 200)
      throw new Error (res.message)
    const lxId = setInterval(async () => {
      const resImg = await fetchImgInfo(res.result.taskId)
      if (resImg.code !== 200) {
        clearInterval(lxId)
        throw new Error(resImg.message)
      }
      if (resImg.result.status === 2) {
        const resOss = (await axios.post('/uploadImgUrl', {
          urlImg: resImg.result.imageUrl,
        })).data
        updateDraw(+uuid, dataSources.length - 1, {
          dateTime: new Date().toLocaleString(),
          text: resOss.data.url,
          taskId: res.result.taskId,
          loading: false,
          imgId: resImg.result.imageId,
          isBigger: type === 'UPSCALE',
        })
        curChoose.value = dataSources.slice(-1)[0]
        authStore.useCodeOnce('draw')
        clearInterval(lxId)
      }
      else if (resImg.result.status === 1) {
        if (resImg.result.imageUrl) {
          updateChatSome(+uuid, dataSources.length - 1, {
            text: resImg.result.imageUrl,
          })
        }
        const regex = /(\d+)%/
        const match = resImg.result.msg.match(regex)
        if (match) {
          const percentage = match[1]
          updateChatSome(+uuid, dataSources.length - 1, {
            progress: Number(percentage),
          })
        }
        else {
          updateChatSome(+uuid, dataSources.length - 1, {
            progress: 0,
          })
        }
      }
      else if (resImg.result.status === 3) {
        message.warning('服务器繁忙,请重试')
        deleteDraw(+uuid, dataSources.length - 1)
        clearInterval(lxId)
        fetchPackage(type, imageId, index)
      }
    }, 4000)
  }
  catch (error: any) {
    message.error(error)
    deleteDraw(+uuid, dataSources.length - 1)
    if (time < 2)
      fetchPackage(type, imageId, index, ++time)
  }
}
function showOne(index: number) {
  if (dataSources.slice(-1)[0].loading) {
    message.warning('生成期间请勿切换')
    return
  }
  curChoose.value = dataSources[index]
}
async function handleBigger(index: number) {
  const imgId = imageId.value!
  await fetchPackage('UPSCALE', imgId, index)
}
async function handleRenewOne(index: number) {
  const imgId = imageId.value!
  await fetchPackage('VARIATION', imgId, index)
}
async function reset() {
  const imgId = imageId.value!
  await fetchPackage('RESET', imgId)
}
async function submit(time = 0) {
  const last = dataSources.slice(-1)[0]
  addDraw(+uuid, {
    dateTime: new Date().toLocaleString(),
    text: 'https://i.imgloc.com/2023/05/24/VDwUlP.gif',
    prompt: inputCreate.value,
    taskId: '',
    loading: true,
    imgId: '',
    form: { ...dataSources.slice(-1)[0].form!, prompt: inputCreate.value },
  })
  try {
    const res = await fetchDraw2(inputCreate.value, last.form!.imgSize, last.form!.imgVersion, last.form!.promptReverse, last.form!.customSize)
    if (res.code !== 200)
      throw new Error (res.message)
    const lxId = setInterval(async () => {
      const resImg = await fetchImgInfo(res.result.taskId)
      if (resImg.code !== 200) {
        clearInterval(lxId)
        throw new Error(resImg.message)
      }
      if (resImg.result.status === 2) {
        const resOss = (await axios.post('/uploadImgUrl', {
          urlImg: resImg.result.imageUrl,
        })).data
        updateDraw(+uuid, dataSources.length - 1, {
          dateTime: new Date().toLocaleString(),
          text: resOss.data.url,
          taskId: res.result.taskId,
          loading: false,
          imgId: resImg.result.imageId,
          isBigger: false,
        })
        curChoose.value = dataSources.slice(-1)[0]
        authStore.useCodeOnce('draw')
        clearInterval(lxId)
      }
      else if (resImg.result.status === 1) {
        if (resImg.result.imageUrl) {
          updateChatSome(+uuid, dataSources.length - 1, {
            text: resImg.result.imageUrl,
          })
        }
        const regex = /(\d+)%/
        const match = resImg.result.msg.match(regex)
        if (match) {
          const percentage = match[1]
          updateChatSome(+uuid, dataSources.length - 1, {
            progress: Number(percentage),
          })
        }
        else {
          updateChatSome(+uuid, dataSources.length - 1, {
            progress: 0,
          })
        }
      }
      else if (resImg.result.status === 3) {
        message.warning('服务器繁忙,请重试')
        deleteDraw(+uuid, dataSources.length - 1)
        clearInterval(lxId)
        submit()
      }
    }, 4000)
  }
  catch (error: any) {
    message.error(error)
    deleteDraw(+uuid, dataSources.length - 1)
    if (time < 2)
      submit(++time)
  }
}
</script>

<template>
  <div class="result h-full w-full">
    <NLayout has-sider style="height: 100%;">
      <NLayout>
        <NLayoutContent style="height: calc(100% - 70px);">
          <div class="content w-full h-full" style="position: relative;">
            <div v-if="curChoose.prompt" class="line-gradient text-lg text-[#00ae88] flex items-center justify-center" style="position: relative;height: 28px;overflow-x: scroll;white-space: nowrap;text-overflow: ellipsis;width: 80%;">
              <strong>关键词</strong> {{ `: ${curChoose.prompt}` }}
            </div>
            <div class="flex flex-1 justify-center items-center" style="position: relative;width: 100%;height: calc(100% - 25px);">
              <div v-if="!isBigger" class="h-full flex flex-col items-center justify-center">
                <div v-if="!isMobile" ref="wrapEl" class="imgWrapper" :style="{ width: `${wrapWidth}px` }">
                  <template v-if="!isMobile">
                    <template v-for="index in 4" :key="index">
                      <div :class="`wrap wrap${index}`" @mouseenter="Hovers[index] = true" @mouseleave="Hovers[index] = false">
                        <div v-if="Hovers[index]">
                          <NButton type="info" style="width: 126px; margin-bottom: 10px;" @click="handleBigger(index)">
                            放大图片
                          </NButton><br>
                          <NButton type="info" @click="handleRenewOne(index)">
                            以该图再次生成
                          </NButton>
                        </div>
                      </div>
                    </template>
                  </template>
                  <NImage id="mainImg" :src="changeUrl(curChoose.text)" alt="" />
                </div>
                <NImage
                  v-if="isMobile"
                  style="width: 90%;justify-content: center;"
                  object-fit="contain"
                  :src="changeUrl(curChoose.text)"
                />
                <div class="btns w-7/12 flex items-center justify-center flex-wrap" style="margin-top: 8px;width: 100%;">
                  <div
                    class="btns1" style="display: flex;justify-content: center;align-items: center;"
                  >
                    <NButton type="info" ghost style="margin-right: 3px;" @click="handleBigger(1)">
                      放大图1
                    </NButton>
                    <NButton type="info" ghost style="margin-right: 3px;" @click="handleBigger(2)">
                      放大图2
                    </NButton>
                    <NButton type="info" ghost style="margin-right: 3px;" @click="handleBigger(3)">
                      放大图3
                    </NButton>
                    <NButton type="info" ghost style="margin-right: 3px;" @click="handleBigger(4)">
                      放大图4
                    </NButton>
                  </div>
                  <div class="btns2" style="display: flex;justify-content: center;align-items: center;">
                    <NButton type="primary" ghost style="margin-right: 3px;" @click="handleRenewOne(1)">
                      变化图1
                    </NButton>
                    <NButton type="primary" ghost style="margin-right: 3px;" @click="handleRenewOne(2)">
                      变化图2
                    </NButton>
                    <NButton type="primary" ghost style="margin-right: 3px;" @click="handleRenewOne(3)">
                      变化图3
                    </NButton>
                    <NButton type="primary" ghost style="margin-right: 3px;" @click="handleRenewOne(4)">
                      变化图4
                    </NButton>
                  </div>
                </div>
                <NButton type="info" style="margin-top: 10px; width: 150px;margin-bottom: 10px;" @click="reset">
                  <template #icon>
                    <NIcon color="#fff">
                      <svg t="1684943596973" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1800" width="20" height="20"><path d="M754.37 65.01c6.37-2.72 13.74 0.24 16.47 6.61l65.71 153.84c0.47 1.09 0.78 2.25 0.92 3.43 0.83 6.88-4.08 13.13-10.96 13.96l-166.09 20.01c-2.7 0.32-5.42-0.23-7.77-1.59-6-3.46-8.06-11.14-4.59-17.14l34.17-59.29C505.21 95.19 286.92 158.66 186.5 332.59 82.56 512.62 144.24 742.83 324.27 846.77S734.5 889.03 838.44 709c29.07-50.35 45.76-105.61 49.63-162.3 1.18-17.28 16.14-30.34 33.43-29.16 17.28 1.18 30.34 16.14 29.16 33.43-4.51 66.18-24.01 130.71-57.89 189.4-121.26 210.03-389.83 282-599.87 160.73s-282-389.83-160.73-599.87C249.93 97.27 506.58 23.51 713.66 130.45l34.77-60.17c1.36-2.35 3.44-4.2 5.94-5.27z" p-id="1801" /></svg>
                    </NIcon>
                  </template>
                  重新生成
                </NButton>
              </div>
              <div v-if="isBigger" class="flex flex-col items-center justify-center w-full h-full">
                <NImage
                  style="width: 90%;justify-content: center;"
                  object-fit="contain"
                  :src="changeUrl(curChoose.text)"
                />
              </div>
            </div>
          </div>
        </NLayoutContent>
        <NLayoutFooter style="height: 70px;background-color: #ffffff;">
          <div class="flex items-center justify-center w-full h-full" :class="isMobile && ['flex', 'flex-col']" style="border-top: 1px solid #dfdfdf;">
            <div class="flex-1 flex w-full">
              <NInput v-model:value="inputCreate" :type="isMobile ? 'textarea' : 'text'" :autosize="true" :placeholder="curChoose.prompt" style="width: 90%;margin-right: 15px" @keyup.enter="submit(0)" />
              <NButton type="success" style="margin-right: 15px;" @click="submit(0)">
                生成
              </NButton>
            </div>
            <createPrompt @update-prompt="(value) => inputCreate = value" />
          </div>
        </NLayoutFooter>
      </NLayout>
      <NButton v-if="isMobile" size="small" round style="position: absolute;right: 10px;z-index: 30;" :style="{ top: isShowHistory ? '10px' : '25px' }" @click="isShowHistory = !isShowHistory">
        <template #icon>
          <NIcon>
            <svg t="1684943746931" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2978" width="200" height="200"><path d="M64.5 64.5H271V271H64.5zM408.7 64.5h550.8V271H408.7zM64.5 408.7H271v206.5H64.5zM408.7 408.7h550.8v206.5H408.7zM64.5 753H271v206.5H64.5zM408.7 753h550.8v206.5H408.7z" fill="#1196db" p-id="2979" />
            </svg>
          </NIcon>
        </template>
        历史记录
      </NButton>
      <NLayoutSider v-show="isShowHistory" content-style="min-width:100px;padding:6px" width="10.5rem" style="border-left: 1px solid #dfdfdf;">
        <h2 class="-top-1 font-bold text-xl" :class="isMobile ? 'mt-10' : ''">
          历史记录
        </h2>
        <template v-for="(item, index) in reverseDataSouces" :key="item.taskId">
          <img
            style="cursor: pointer;margin-bottom: 10px;"
            :src="changeUrl(item.text)"
            @click="showOne(reverseDataSouces.length - index - 1)"
          >
        </template>
      </NLayoutSider>
    </NLayout>
  </div>
</template>

<style lang="less" scoped>
.content{
	display: flex;
	flex-direction: column;
	align-items: center;
}
.imgWrapper{
	position: relative;
	height: calc(100% - 150px);

	.wrap{
		position: absolute;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 30%;
		height: 30%;
	}
	.wrap1{
		top: 10%;
		left: 10%;
	}
	.wrap2{
		top: 10%;
		left: 60%;
	}
	.wrap3{
		bottom: 10%;
		left: 10%;
	}
	.wrap4{
		bottom: 10%;
		left: 60%;
	}
}
::-webkit-scrollbar {
  display: none; /* Chrome Safari */
}
.line-gradient{
	padding-left: 10%;
	padding-right: 10%;
	background: linear-gradient(to right, #f6fcfb 0%, #e8f9f7 50%, #f6fcfb 100%);
}
</style>
