<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCollapse, NCollapseItem, NDivider, NForm, NFormItem, NGrid, NGridItem, NIcon, NInput, NSelect, NSlider, NUpload, useMessage } from 'naive-ui'
import type { FormInst, UploadFileInfo } from 'naive-ui'
import { useChat } from '../../hooks/useChat'
import axios from '@/utils/request/axios'
import type { IDrawIng, IDrawResult } from '@/typings/draw'
import { useAuthStore } from '@/store'

const props = defineProps<{
  uuid: string
  dataSources: Chat.Chat[]
}>()
const message = useMessage()
const authStore = useAuthStore()
const { addDraw, updateDraw, deleteDraw, updateChatSome } = useChat()

// const imageUpUrl = ref('')
const upLoading = ref(false)
const formRef = ref<FormInst | null>(null)
const Divel = ref<HTMLDivElement | null>(null)
const formValue = ref({
  prompt: '',
  imgSize: '1:1',
  imgVersion: '5.2',
  promptReverse: '',
  customSize: '',
  weight: 50,
  upImgUrl: '',
})

const BarHeight = computed(() => Divel.value?.offsetHeight)
async function fetchDraw(prompt: string, imgSize: string, imgVersion: string, promptReverse: string, customSize: string) {
  const fyprompt = (await axios.get(`/translate/${prompt}`)).data.ans
  let rvfyprompt = ''
  if (promptReverse)
    rvfyprompt = (await axios.get(`/translate/${promptReverse}`)).data.ans
  let myprompt = ` ${formValue.value.upImgUrl} ${fyprompt}`
  if (imgSize === 'show' && customSize)
    myprompt += ` --aspect ${customSize}`
  else myprompt += ` --aspect ${imgSize}`
  if (imgVersion === 'niji')
    myprompt += ' --niji 5'
  else myprompt += ` --v ${imgVersion}`
  if (rvfyprompt)
    myprompt += ` --no ${rvfyprompt}`
  myprompt += ` --iw ${0.5 + 1.5 * (formValue.value.weight / 100)}`
  const reqObj = {
    action: 'CREATE_IMAGE',
    fast: true,
    prompt: myprompt,
  }
  const response: IDrawIng = (await axios.post('/createImage', reqObj)).data
  return response
}
async function fetchImgInfo(taskId: string) {
  const res: IDrawResult = (await axios.get(`/getImage/${taskId}`)).data
  return res
}
async function fetchPackage(time = 0) {
  addDraw(+props.uuid, {
    dateTime: new Date().toLocaleString(),
    text: 'https://x.imgs.ovh/x/2023/09/10/64fd61af122a5.gif',
    prompt: formValue.value.prompt,
    taskId: '',
    loading: true,
    imgId: '',
    form: formValue.value,
  })
  const {
    prompt,
    imgSize,
    imgVersion,
    promptReverse,
    customSize,
  } = formValue.value
  try {
    const res = await fetchDraw(prompt, imgSize, imgVersion, promptReverse, customSize)
    if (res.code !== 200)
      throw new Error (res.message)
    const lxId = setInterval(async () => {
      const resImg = await fetchImgInfo(res.result.taskId)
      if (resImg.code !== 200) {
        clearInterval(lxId)
        throw new Error (resImg.message)
      }
      if (resImg.result.status === 2) {
        const resOss = (await axios.post('/uploadImgUrl', {
          urlImg: resImg.result.imageUrl,
        })).data
        updateDraw(+props.uuid, props.dataSources.length - 1, {
          dateTime: new Date().toLocaleString(),
          text: resOss.data.url,
          prompt: formValue.value.prompt,
          taskId: res.result.taskId,
          loading: false,
          imgId: resImg.result.imageId,
          form: formValue.value,
        })
        authStore.useCodeOnce('draw')
        clearInterval(lxId)
      }
      else if (resImg.result.status === 1) {
        if (resImg.result.imageUrl) {
          updateChatSome(+props.uuid, props.dataSources.length - 1, {
            text: resImg.result.imageUrl,
          })
        }
        const regex = /(\d+)%/
        const match = resImg.result.msg.match(regex)
        if (match) {
          const percentage = match[1]
          updateChatSome(+props.uuid, props.dataSources.length - 1, {
            progress: Number(percentage),
          })
        }
        else {
          updateChatSome(+props.uuid, props.dataSources.length - 1, {
            progress: 0,
          })
        }
      }
      else if (resImg.result.status === 3) {
        message.warning('服务器繁忙,请重试')
        deleteDraw(+props.uuid, props.dataSources.length - 1)
        clearInterval(lxId)
        fetchPackage()
      }
    }, 4000)
  }
  catch (error: any) {
    message.error(error)
    deleteDraw(+props.uuid, props.dataSources.length - 1)
    if (time < 2)
      fetchPackage(++time)
  }
}
function handleClick(e: MouseEvent) {
  if (!formValue.value.upImgUrl) {
    message.error('未上传图片,请上传图片后再试')
    return
  }
  e.preventDefault()
  formRef.value?.validate(async (errors) => {
    if (!errors)
      await fetchPackage()
  })
}
async function beforeUpload(data: {
  file: UploadFileInfo
  fileList: UploadFileInfo[]
}) {
  upLoading.value = true
  const acceptArr = ['image/png', 'image/jpeg', 'image/jpg']
  if (!acceptArr.includes(data.file.file!.type)) {
    message.error('只能上传png,jpg格式的图片文件，请重新上传')
    return false
  }
  return true
}

function finishedUpload(options: { file: UploadFileInfo; event?: ProgressEvent }) {
  upLoading.value = false
  const distribute = JSON.parse((event?.target as XMLHttpRequest).response).data.url
  formValue.value.upImgUrl = distribute
  message.success('上传成功!')
  return options.file
}

const rules = {
  prompt: {
    required: true,
    message: '请输入所要生成的Prompt',
    trigger: ['input', 'blur'],
  },
  customSize: {
    required: true,
    message: '请输入自定义比例',
    trigger: ['input', 'blur'],
  },
}
const optionsSize = [
  {
    label: '1:1 (正方形)',
    value: '1:1',
  },
  {
    label: '16:9 (电脑)',
    value: '16:9',
  },
  {
    label: '9:16 (手机)',
    value: '9:16',
  },
  {
    label: '4:3 (画板)',
    value: '4:3',
  },
  {
    label: '自定义',
    value: 'show',
  },
]
const optionsVersion = [
  {
    label: 'V5.2 (相比V5更具有创造力)',
    value: '5.2',
  },
  {
    label: 'V4 (矢量图UI,写实)',
    value: '4',
  },
  {
    label: 'V5 (适合真实人物,写实)',
    value: '5',
  },
  {
    label: '卡通V5 (纯卡通)',
    value: 'niji',
  },
]
</script>

<template>
  <div class="text w-full h-full">
    <div class="flex flex-col justify-center max-w-4xl" style="margin: auto;position: relative;">
      <div class="bord" :style="{ height: `${270 + BarHeight!}px` }">
        <div
          style="position: absolute;left: 50%;
					border: 5px solid #0a76ff;
					transform: translateX(-50%)translateY(-130%)rotate(45deg);
					top: 50%;
					width: 0;height: 0;"
        />
      </div>
      <div class="upLoadBox" style="max-width: 50rem;margin-bottom: 15px;margin-top: 8px;">
        <h2 style="white-space: nowrap;margin-right: 15px;">
          请先上传图片:
        </h2>
        <NUpload
          action="/api/uploadImg"
          name="image"
          :show-file-list="false"
          accept="image/png, image/jpeg,image/jpg"
          @before-upload="beforeUpload"
          @finish="finishedUpload"
        >
          <div v-if="!upLoading && !formValue.upImgUrl" class="flex justify-center items-center" style="border: 1px dashed #46a1ff;width: 8.3rem;height: 8.3rem;">
            <NIcon size="100" :depth="3" class="cursor-pointer">
              <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M544 864V672h128L512 480 352 672h128v192H320v-1.6c-5.376.32-10.496 1.6-16 1.6A240 240 0 0 1 64 624c0-123.136 93.12-223.488 212.608-237.248A239.808 239.808 0 0 1 512 192a239.872 239.872 0 0 1 235.456 194.752c119.488 13.76 212.48 114.112 212.48 237.248a240 240 0 0 1-240 240c-5.376 0-10.56-1.28-16-1.6v1.6H544z" /></svg>
            </NIcon>
          </div>
          <div v-if="upLoading" class="loadingio-spinner-rolling-e4qfqqvpvx">
            <div class="ldio-59b9n4tz9bu">
              <div />
            </div>
          </div>
          <img
            v-if="formValue.upImgUrl && !upLoading" style="width: 150px;cursor: pointer;"
            :src="formValue.upImgUrl"
          >
        </NUpload>
      </div>
      <NForm
        ref="formRef"
        inline
        :label-width="80"
        :model="formValue"
        :rules="rules"
        size="medium"
      >
        <NFormItem label="请根据图片，输入提示词:" path="prompt" style="font-size: 15rem;width: 100%;">
          <NInput v-model:value="formValue.prompt" class="myinput" placeholder="Tip：某个人/物体在什么时候，在哪里，做什么，特殊条件" />
        </NFormItem>
        <div ref="Divel" class="tipsBox" style="width: 100%;padding: 1rem;margin-bottom: 10px;">
          <div style="color: #00ad86;">
            小技巧：写提示词的时候尽量围绕某个人/物体在什么时候，在哪里，做什么，特殊条件
          </div>
          <div style="color:#676767;">
            例1：一个漂亮的女孩在草地开心的笑，宫崎骏风格
          </div>
          <div style="color: #676767;">
            例2：两个小男孩在家里玩耍，素描风格
          </div>
        </div>
        <NCollapse arrow-placement="right">
          <NCollapseItem title="高级设置" name="1">
            <template #header>
              <div class="flex items-center">
                <NIcon>
                  <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" data-v-ea893728=""><path fill="currentColor" d="M600.704 64a32 32 0 0 1 30.464 22.208l35.2 109.376c14.784 7.232 28.928 15.36 42.432 24.512l112.384-24.192a32 32 0 0 1 34.432 15.36L944.32 364.8a32 32 0 0 1-4.032 37.504l-77.12 85.12a357.12 357.12 0 0 1 0 49.024l77.12 85.248a32 32 0 0 1 4.032 37.504l-88.704 153.6a32 32 0 0 1-34.432 15.296L708.8 803.904c-13.44 9.088-27.648 17.28-42.368 24.512l-35.264 109.376A32 32 0 0 1 600.704 960H423.296a32 32 0 0 1-30.464-22.208L357.696 828.48a351.616 351.616 0 0 1-42.56-24.64l-112.32 24.256a32 32 0 0 1-34.432-15.36L79.68 659.2a32 32 0 0 1 4.032-37.504l77.12-85.248a357.12 357.12 0 0 1 0-48.896l-77.12-85.248A32 32 0 0 1 79.68 364.8l88.704-153.6a32 32 0 0 1 34.432-15.296l112.32 24.256c13.568-9.152 27.776-17.408 42.56-24.64l35.2-109.312A32 32 0 0 1 423.232 64H600.64zm-23.424 64H446.72l-36.352 113.088-24.512 11.968a294.113 294.113 0 0 0-34.816 20.096l-22.656 15.36-116.224-25.088-65.28 113.152 79.68 88.192-1.92 27.136a293.12 293.12 0 0 0 0 40.192l1.92 27.136-79.808 88.192 65.344 113.152 116.224-25.024 22.656 15.296a294.113 294.113 0 0 0 34.816 20.096l24.512 11.968L446.72 896h130.688l36.48-113.152 24.448-11.904a288.282 288.282 0 0 0 34.752-20.096l22.592-15.296 116.288 25.024 65.28-113.152-79.744-88.192 1.92-27.136a293.12 293.12 0 0 0 0-40.256l-1.92-27.136 79.808-88.128-65.344-113.152-116.288 24.96-22.592-15.232a287.616 287.616 0 0 0-34.752-20.096l-24.448-11.904L577.344 128zM512 320a192 192 0 1 1 0 384 192 192 0 0 1 0-384zm0 64a128 128 0 1 0 0 256 128 128 0 0 0 0-256z" /></svg>
                </NIcon>
                <span style="margin-left: 3px;">高级设置</span>
              </div>
            </template>
            <NGrid :x-gap="5" :y-gap="2" :cols="24" :item-responsive="true">
              <NGridItem :span="12" style="display: flex;align-items: center;">
                <NFormItem label="图片比例" path="imgSize" style="white-space: nowrap;flex: 1;">
                  <NSelect v-model:value="formValue.imgSize" :options="optionsSize" placeholder="选择比例" />
                </NFormItem>
                <NFormItem v-if="formValue.imgSize === 'show'" label="图片比例" path="customSize" required style="white-space: nowrap;flex: 1;">
                  <NInput v-model:value="formValue.customSize" placeholder="eg:4:3" />
                </NFormItem>
              </NGridItem>
              <NGridItem :span="12">
                <NFormItem label="图片版本" path="imgVersion">
                  <NSelect v-model:value="formValue.imgVersion" :options="optionsVersion" placeholder="选择版本" />
                </NFormItem>
              </NGridItem>
              <NGridItem :span="24">
                <NFormItem label="反向提示词" path="promptReverse" :required="false">
                  <NInput v-model:value="formValue.promptReverse" placeholder="请输入不想在画面中出现的元素（可选）" />
                </NFormItem>
              </NGridItem>
              <NGridItem :span="24">
                <NFormItem label="图片与文字权重（百分比越大，原图权重越高）" path="weight" :required="false" style="white-space: nowrap;">
                  <NSlider v-model:value="formValue.weight" :step="10" />
                </NFormItem>
              </NGridItem>
            </NGrid>
          </NCollapseItem>
        </NCollapse>
        <NDivider style="margin-bottom: 15px;margin-top: 5px;" />
        <NFormItem style="display: flex; align-items: center;justify-content: center;align-self: center;">
          <NButton type="primary" style="width: 13rem;margin-bottom: 13px;" @click="handleClick">
            立即生成
          </NButton>
        </NFormItem>
      </NForm>
    </div>
  </div>
</template>

<style lang="less" scoped>
body {
  margin: 0;
}
.myinput{
	--n-border:1px solid #2080f0 !important;
	--n-border-hover:1px solid #2080f0 !important;
	--n-border-focus:1px solid #2080f0 !important;
}
.bord{
	position: absolute;
	top: 0;
	transform: translateX(-3rem)translateY(.9rem);
	width: 0;
	border-left: 2px solid #D8D8D8;
	&::before,
	&::after {
  content: '';
	top: 0;
  position: absolute;
  border: 5px solid #0a76ff;
	transform: translateX(50%)rotate(45deg);
}
 &::before {
  right: 50%;
}

 &::after {
  right: 50%;
	top: 100%;
}
}
.tipsBox{
	background-color: #e5f6f3;
	border: 1px solid #a4e1d5;
}
.n-form{
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding-top: 5px;
	margin: 0;
	max-width: 50rem;
}
@keyframes ldio-59b9n4tz9bu {
  0% { transform: translate(-50%,-50%) rotate(0deg); }
  100% { transform: translate(-50%,-50%) rotate(360deg); }
}
.ldio-59b9n4tz9bu div {
  position: absolute;
	top: 50%;
	left: 50%;
	transform: translateX(-50%);
  width: 3.1rem;
  height: 3.1rem;
  border: 8px solid #1d3f72;
  border-top-color: transparent;
  border-radius: 50%;
}
.ldio-59b9n4tz9bu div {
  animation: ldio-59b9n4tz9bu 1s linear infinite;
}
.loadingio-spinner-rolling-e4qfqqvpvx {
  width: 8.3rem;
	height: 8.3rem;
  display: inline-block;
  overflow: hidden;
  background: #f1f2f3;
	border: 1px dashed #46a1ff;
	cursor: pointer;
}
.ldio-59b9n4tz9bu {
  width: 100%;
  height: 100%;
  position: relative;
  transform: translateZ(0) scale(1);
  backface-visibility: hidden;
  transform-origin: 0 0; /* see note above */
}
.ldio-59b9n4tz9bu div { box-sizing: content-box; }
/* generated by https://loading.io/ */
</style>
