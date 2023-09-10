<script setup lang='ts'>
import { computed, onActivated, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAutoComplete, NButton, NIcon, NInput, useDialog, useMessage } from 'naive-ui'
import html2canvas from 'html2canvas'
import { Message } from './components'
import typeSelect from './components/typeSelect.vue'
import { useScroll } from './hooks/useScroll'
import { useChat } from './hooks/useChat'
import { useCopyCode } from './hooks/useCopyCode'
import { useUsingContext } from './hooks/useUsingContext'
import HeaderComponent from './components/Header/index.vue'
import { HoverButton, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAuthStore, useChatStore, usePromptStore } from '@/store'
import { fetchChatAPIProcess } from '@/api'
import { t } from '@/locales'
import { router } from '@/router'

let controller = new AbortController()

const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

const chatStore = useChatStore()
const authStore = useAuthStore()

const { uuid } = route.params as { uuid: string }
const type = chatStore.getTypeByUuid(+uuid) ? 'Draw' : 'Chat'
if (route.name !== type)
  router.replace({ name: 'Draw', params: { uuid } })

useCopyCode()

const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()

const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const conversationList = computed(() => dataSources.value.filter(item => (!item.inversion && !item.error)))

const prompt = ref<string>('')
const loading = ref<boolean>(false)
const curModel = ref('gpt3')

// 添加PromptStore
const promptStore = usePromptStore()
// 使用storeToRefs，保证store修改后，联想部分能够重新渲染
const { promptList: promptTemplate } = storeToRefs<any>(promptStore)

function handleSubmit() {
  onConversation()
}

async function onConversation() {
  let message = prompt.value

  if (loading.value)
    return

  if (!message || message.trim() === '')
    return

  controller = new AbortController()

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: message,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: null },
    },
  )
  scrollToBottom()

  loading.value = true
  prompt.value = ''

  let options: Chat.ConversationRequest = {}
  const lastContext = conversationList.value[conversationList.value.length - 1]?.conversationOptions

  if (lastContext && usingContext.value)
    options = { ...lastContext }

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: '',
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )
  scrollToBottom()

  try {
    let lastText = ''
    const fetchChatAPIOnce = async () => {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        model: curModel.value,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          const objArray = responseText.split('\n').filter(Boolean)
          const chunk = objArray[objArray.length - 2]
          try {
            const data = JSON.parse(chunk)
            updateChat(
              +uuid,
              dataSources.value.length - 1,
              {
                dateTime: new Date().toLocaleString(),
                text: lastText + (data.text ?? ''),
                inversion: false,
                error: false,
                loading: false,
                conversationOptions: { conversationId: data.id, parentMessageId: data.parentMessageId },
                requestOptions: { prompt: message, options: { ...options } },
              },
            )

            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce()
            }

            scrollToBottom()
          }
          catch (error) {
          //
          }
        },
      })
    }
    await fetchChatAPIOnce()
    // 在这里写
    await authStore.useCodeOnce(curModel.value)
  }
  catch (error: any) {
    const errorMessage = error?.message ?? t('common.wrong')

    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
      scrollToBottom()
      return
    }

    const currentChat = getChatByUuidAndIndex(+uuid, dataSources.value.length - 1)

    if (currentChat?.text && currentChat.text !== '') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          text: `${currentChat.text}\n[${errorMessage}]`,
          error: false,
          loading: false,
        },
      )
      return
    }

    updateChat(
      +uuid,
      dataSources.value.length - 1,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
    scrollToBottom()
  }
  finally {
    loading.value = false
  }
}

async function onRegenerate(index: number) {
  if (loading.value)
    return

  controller = new AbortController()

  const { requestOptions } = dataSources.value[index]

  let message = requestOptions?.prompt ?? ''

  let options: Chat.ConversationRequest = {}

  if (requestOptions?.options)
    options = { ...requestOptions.options }

  loading.value = true

  updateChat(
    +uuid,
    index,
    {
      dateTime: new Date().toLocaleString(),
      text: '',
      inversion: false,
      error: false,
      loading: true,
      conversationOptions: null,
      requestOptions: { prompt: message, ...options },
    },
  )

  try {
    let lastText = ''
    const fetchChatAPIOnce = async () => {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          const lastIndex = responseText.lastIndexOf('\n')
          let chunk = responseText
          if (lastIndex !== -1)
            chunk = responseText.substring(lastIndex)
          try {
            const data = JSON.parse(chunk)
            updateChat(
              +uuid,
              index,
              {
                dateTime: new Date().toLocaleString(),
                text: lastText + data.text ?? '',
                inversion: false,
                error: false,
                loading: false,
                conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                requestOptions: { prompt: message, ...options },
              },
            )

            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce()
            }
          }
          catch (error) {
            //
          }
        },
      })
      updateChatSome(+uuid, dataSources.value.length - 1, { loading: false })
    }
    await fetchChatAPIOnce()
  }
  catch (error: any) {
    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        index,
        {
          loading: false,
        },
      )
      return
    }

    const errorMessage = error?.message ?? t('common.wrong')

    updateChat(
      +uuid,
      index,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, ...options },
      },
    )
  }
  finally {
    loading.value = false
  }
}

function handleExport() {
  if (loading.value)
    return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        const canvas = await html2canvas(ele as HTMLDivElement, {
          useCORS: true,
        })
        const imgUrl = canvas.toDataURL('image/png')
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined')
          tempLink.setAttribute('target', '_blank')

        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
        Promise.resolve()
      }
      catch (error: any) {
        ms.error(t('chat.exportFailed'))
      }
      finally {
        d.loading = false
      }
    },
  })
}

function handleDelete(index: number) {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.deleteMessageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.deleteChatByUuid(+uuid, index)
    },
  })
}

function handleClear() {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.clearChat'),
    content: t('chat.clearChatConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearChatByUuid(+uuid)
    },
  })
}

function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
  else {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
}

function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)
// 理想状态下其实应该是key作为索引项,但官方的renderOption会出现问题，所以就需要value反renderLabel实现
const searchOptions = computed(() => {
  if (prompt.value.startsWith('/')) {
    return promptTemplate.value.filter((item: { key: string }) => item.key.toLowerCase().includes(prompt.value.substring(1).toLowerCase())).map((obj: { value: any }) => {
      return {
        label: obj.value,
        value: obj.value,
      }
    })
  }
  else {
    return []
  }
})
// value反渲染key
const renderOption = (option: { label: string }) => {
  for (const i of promptTemplate.value) {
    if (i.value === option.label)
      return [i.key]
  }
  return []
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return loading.value || !prompt.value || prompt.value.trim() === ''
})

const footerClass = computed(() => {
  let classes = ['p-4']
  if (isMobile.value)
    classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden']
  return classes
})

function handleSwitch() {
  if (loading.value)
    return

  dialog.warning({
    title: '切换对话模型',
    content: `确定要切换为${curModel.value === 'gpt3' ? 'GPT4' : 'GPT3'}吗`,
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      if (curModel.value === 'gpt3')
        curModel.value = 'gpt4'
      else curModel.value = 'gpt3'
      ms.success('切换成功')
    },
  })
}

onMounted(() => {
  scrollToBottom()
})
onActivated(() => {
  scrollToBottom()
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()
})
</script>

<template>
  <div class="flex flex-col w-full h-full p-3" style="background-color: #fff;background-clip: content-box;">
    <HeaderComponent
      v-if="isMobile"
      :using-context="usingContext"
      @export="handleExport"
      @toggle-using-context="toggleUsingContext"
    />
    <typeSelect />
    <main class="flex-1 overflow-hidden">
      <div
        id="scrollRef"
        ref="scrollRef"
        class="h-full overflow-hidden overflow-y-auto"
      >
        <div
          id="image-wrapper"
          class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
          :class="[isMobile ? 'p-2' : 'p-4']"
        >
          <div>
            <Message
              v-for="(item, index) of dataSources"
              :key="index"
              :date-time="item.dateTime"
              :text="item.text"
              :inversion="item.inversion"
              :error="item.error"
              :loading="item.loading"
              @regenerate="onRegenerate(index)"
              @delete="handleDelete(index)"
            />
            <div class="sticky bottom-0 left-0 flex justify-center">
              <NButton v-if="loading" type="warning" @click="handleStop">
                <template #icon>
                  <SvgIcon icon="ri:stop-circle-line" />
                </template>
                Stop Responding
              </NButton>
            </div>
          </div>
        </div>
      </div>
    </main>
    <footer :class="footerClass">
      <div class="w-full max-w-screen-xl m-auto">
        <div class="flex items-center justify-between space-x-2">
          <HoverButton @click="handleSwitch">
            <span class="text-xl dark:text-white" style="line-height: 0;">
              <NIcon v-if="curModel === 'gpt3'">
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20px" height="20px" viewBox="0 0 20 20" version="1.1">
                  <title>画板备份</title>
                  <g id="画板备份" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <g id="编组" transform="translate(3.677305, 2.385742)" />
                    <g id="切换" fill-rule="nonzero">
                      <rect id="矩形" fill="#000000" opacity="0" x="0" y="0" width="20" height="20" />
                      <path id="形状" d="M5,3.33333984 L17.5,3.33333984 C17.9602333,3.33333984 18.3333398,3.7064269 18.3333398,4.16666016 L18.3333398,10 L16.6666602,10 L16.6666602,5 L5,5 L5,7.5 L0.833339844,4.16666016 L5,0.833339844 L5,3.33333984 Z M15,16.6666602 L2.5,16.6666602 C2.03976674,16.6666602 1.66666016,16.2935731 1.66666016,15.8333398 L1.66666016,10 L3.33333984,10 L3.33333984,15 L15,15 L15,12.5 L19.1666602,15.8333398 L15,19.1666602 L15,16.6666602 L15,16.6666602 Z" fill="#4F555E" />
                      <g id="3.5" transform="translate(5.462891, 7.385742)" fill="#4F555E">
                        <path id="路径" d="M0,3.62695312 C0.302734375,3.85351562 0.65625,3.96679688 1.06054688,3.96679688 C1.31640625,3.96679688 1.51953125,3.91015625 1.66992187,3.796875 C1.8203125,3.68359375 1.89550781,3.52246094 1.89550781,3.31347656 C1.89550781,3.09863281 1.80615234,2.93457031 1.62744141,2.82128906 C1.44873047,2.70800781 1.19824219,2.65136719 0.875976562,2.65136719 L0.471679688,2.65136719 L0.471679688,1.921875 L0.84375,1.921875 C1.453125,1.921875 1.7578125,1.71679688 1.7578125,1.30664062 C1.7578125,0.919921875 1.52441406,0.7265625 1.05761719,0.7265625 C0.752929688,0.7265625 0.45703125,0.826171875 0.169921875,1.02539062 L0.169921875,0.243164062 C0.482421875,0.0810546875 0.850585938,0 1.27441406,0 C1.70410156,0 2.05273438,0.0991210938 2.3203125,0.297363281 C2.58789062,0.495605469 2.72167969,0.770507813 2.72167969,1.12207031 C2.72167969,1.71582031 2.42089844,2.08886719 1.81933594,2.24121094 L1.81933594,2.25585938 C2.13574219,2.29101562 2.38867188,2.40673828 2.578125,2.60302734 C2.76757812,2.79931641 2.86230469,3.03808594 2.86230469,3.31933594 C2.86230469,3.75097656 2.70458984,4.08789062 2.38916016,4.33007812 C2.07373047,4.57226562 1.65332031,4.69335938 1.12792969,4.69335938 C0.661132812,4.69335938 0.28515625,4.61621094 0,4.46191406 L0,3.62695312 Z" />
                        <path id="路径" d="M3.53027344,4.18945312 C3.53027344,4.04296875 3.5859375,3.92285156 3.69726562,3.82910156 C3.80859375,3.73535156 3.94140625,3.68847656 4.09570312,3.68847656 C4.25195312,3.68847656 4.38378906,3.73632812 4.49121094,3.83203125 C4.59863281,3.92773438 4.65234375,4.046875 4.65234375,4.18945312 C4.65234375,4.33984375 4.59863281,4.46142578 4.49121094,4.55419922 C4.38378906,4.64697266 4.24804688,4.69335938 4.08398438,4.69335938 C3.93164062,4.69335938 3.80126953,4.64550781 3.69287109,4.54980469 C3.58447266,4.45410156 3.53027344,4.33398438 3.53027344,4.18945312 Z" />
                        <path id="路径" d="M5.45800781,4.49707031 L5.45800781,3.6796875 C5.77246094,3.87109375 6.10742188,3.96679688 6.46289062,3.96679688 C6.73046875,3.96679688 6.93994141,3.90087891 7.09130859,3.76904297 C7.24267578,3.63720703 7.31835938,3.45898438 7.31835938,3.234375 C7.31835938,2.76367188 6.99609375,2.52832031 6.3515625,2.52832031 C6.11328125,2.52832031 5.83886719,2.54589844 5.52832031,2.58105469 L5.69824219,0.076171875 L8.10058594,0.076171875 L8.10058594,0.85546875 L6.46289062,0.85546875 L6.3984375,1.81054688 C6.56054688,1.796875 6.70996094,1.79003906 6.84667969,1.79003906 C7.29003906,1.79003906 7.64013672,1.91113281 7.89697266,2.15332031 C8.15380859,2.39550781 8.28222656,2.72363281 8.28222656,3.13769531 C8.28222656,3.59472656 8.12695312,3.96826172 7.81640625,4.25830078 C7.50585938,4.54833984 7.08398438,4.69335938 6.55078125,4.69335938 C6.11914062,4.69335938 5.75488281,4.62792969 5.45800781,4.49707031 Z" />
                      </g>
                    </g>
                  </g>
                </svg>
              </NIcon>
              <NIcon v-else color="#4b9e5f">
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="20px" height="20px" style="color: #4b9e5f;" viewBox="0 0 20 20" version="1.1">
                  <title>切换</title>
                  <g id="页面-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <g id="画板备份-2" fill-rule="nonzero">
                      <g id="切换">
                        <rect id="矩形" fill="#000000" opacity="0" x="0" y="0" width="20" height="20" />
                        <path id="形状" d="M5,3.33333984 L17.5,3.33333984 C17.9602333,3.33333984 18.3333398,3.7064269 18.3333398,4.16666016 L18.3333398,10 L16.6666602,10 L16.6666602,5 L5,5 L5,7.5 L0.833339844,4.16666016 L5,0.833339844 L5,3.33333984 Z M15,16.6666602 L2.5,16.6666602 C2.03976674,16.6666602 1.66666016,16.2935731 1.66666016,15.8333398 L1.66666016,10 L3.33333984,10 L3.33333984,15 L15,15 L15,12.5 L19.1666602,15.8333398 L15,19.1666602 L15,16.6666602 L15,16.6666602 Z" fill="#4F555E" />
                        <g id="4.0" transform="translate(5.096680, 7.385742)" fill="#4C9D5F">
                          <path id="形状" d="M2.88867188,0.076171875 L2.88867188,2.95898438 L3.53027344,2.95898438 L3.53027344,3.64746094 L2.88867188,3.64746094 L2.88867188,4.61425781 L2.02734375,4.61425781 L2.02734375,3.64746094 L0,3.64746094 L0,2.953125 C0.419921875,2.484375 0.813476562,1.98828125 1.18066406,1.46484375 C1.54785156,0.94140625 1.82519531,0.478515625 2.01269531,0.076171875 L2.88867188,0.076171875 Z M0.837890625,2.95898438 L2.02734375,2.95898438 L2.02734375,1.29492188 C1.93359375,1.47070312 1.79931641,1.68359375 1.62451172,1.93359375 C1.44970703,2.18359375 1.1875,2.52539062 0.837890625,2.95898438 Z" />
                          <path id="路径" d="M3.89648438,4.18945312 C3.89648438,4.04296875 3.95214844,3.92285156 4.06347656,3.82910156 C4.17480469,3.73535156 4.30761719,3.68847656 4.46191406,3.68847656 C4.61816406,3.68847656 4.75,3.73632812 4.85742188,3.83203125 C4.96484375,3.92773438 5.01855469,4.046875 5.01855469,4.18945312 C5.01855469,4.33984375 4.96484375,4.46142578 4.85742188,4.55419922 C4.75,4.64697266 4.61425781,4.69335938 4.45019531,4.69335938 C4.29785156,4.69335938 4.16748047,4.64550781 4.05908203,4.54980469 C3.95068359,4.45410156 3.89648438,4.33398438 3.89648438,4.18945312 Z" />
                          <path id="形状" d="M5.54589844,2.41992188 C5.54589844,1.63476562 5.69042969,1.03515625 5.97949219,0.62109375 C6.26855469,0.20703125 6.68652344,0 7.23339844,0 C8.27636719,0 8.79785156,0.771484375 8.79785156,2.31445312 C8.79785156,3.07421875 8.65625,3.66064453 8.37304688,4.07373047 C8.08984375,4.48681641 7.68066406,4.69335938 7.14550781,4.69335938 C6.07910156,4.69335938 5.54589844,3.93554688 5.54589844,2.41992188 Z M6.50390625,2.39648438 C6.50390625,3.44335938 6.72753906,3.96679688 7.17480469,3.96679688 C7.61425781,3.96679688 7.83398438,3.42773438 7.83398438,2.34960938 C7.83398438,1.26757812 7.62011719,0.7265625 7.19238281,0.7265625 C6.73339844,0.7265625 6.50390625,1.28320312 6.50390625,2.39648438 Z" />
                        </g>
                      </g>
                    </g>
                  </g>
                </svg>
              </NIcon>
            </span>
          </HoverButton>
          <HoverButton @click="handleClear">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:delete-bin-line" />
            </span>
          </HoverButton>
          <HoverButton v-if="!isMobile" @click="handleExport">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:download-2-line" />
            </span>
          </HoverButton>
          <HoverButton v-if="!isMobile" @click="toggleUsingContext">
            <span class="text-xl" :class="{ 'text-[#4b9e5f]': usingContext, 'text-[#a8071a]': !usingContext }">
              <SvgIcon icon="ri:chat-history-line" />
            </span>
          </HoverButton>
          <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption">
            <template #default="{ handleInput, handleBlur, handleFocus }">
              <NInput
                v-model:value="prompt"
                type="textarea"
                :placeholder="placeholder"
                :autosize="{ minRows: 1, maxRows: isMobile ? 4 : 8 }"
                @input="handleInput"
                @focus="handleFocus"
                @blur="handleBlur"
                @keypress="handleEnter"
              />
            </template>
          </NAutoComplete>
          <NButton type="primary" :disabled="buttonDisabled" @click="handleSubmit">
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>
        </div>
      </div>
    </footer>
  </div>
</template>
