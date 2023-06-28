<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NCheckbox, NCheckboxGroup, NDivider, NForm, NFormItem, NIcon, NRadio, NRadioGroup, NSpace } from 'naive-ui'
import axios from '@/utils/request/axiosAdmin'

const emit = defineEmits(['updatePrompt'])
const prompt = ref('')
const isSetPrompt = ref(false)

let bfSetting: Array<string> = localStorage.getItem('promptSet') ? JSON.parse(localStorage.getItem('promptSet')!) : ['0', '3', '4', '5', '6']
const settingValue = ref({
  type: bfSetting[0],
  args: bfSetting.slice(1),
})
const isShowCheck = ref(!bfSetting.includes('1'))

watch(() => settingValue.value.type, (newsetting) => {
  if (newsetting === bfSetting[0]) {
    if (newsetting === '1')
      isShowCheck.value = false
    else isShowCheck.value = true
    settingValue.value.args = bfSetting.slice(1)
  }
  else if (newsetting === '0' || newsetting === '2') {
    settingValue.value.args = ['3', '4', '5', '6']
    isShowCheck.value = true
  }
  else {
    settingValue.value.args = ['3', '5', '6']
    isShowCheck.value = false
  }
})

function handlePrompt() {
  isSetPrompt.value = true
}
function setok() {
  isSetPrompt.value = false
  bfSetting = [settingValue.value.type, ...settingValue.value.args]
  localStorage.setItem('promptSet', JSON.stringify(bfSetting))
}
function setnot() {
  isSetPrompt.value = false
  settingValue.value.type = bfSetting[0]
  settingValue.value.args = bfSetting.slice(1)
}
async function handleCreatePrompt() {
  const reqBody = [...settingValue.value.args, settingValue.value.type].map(value => Number(value))
  const res = await axios.post('/getPrompt', { arr: reqBody.sort((a, b) => a - b) })
  prompt.value = res.data.message
  emit('updatePrompt', prompt.value)
}
</script>

<template>
  <div class="flex items-center">
    <NButton type="info" @click="handleCreatePrompt">
      随机生成提示词
    </NButton>
    <NIcon style="cursor: pointer;" size="35" @click="handlePrompt">
      <svg t="1684830508574" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4741"><path d="M924.8 625.7l-65.5-56c3.1-19 4.7-38.4 4.7-57.8s-1.6-38.8-4.7-57.8l65.5-56c10.1-8.6 13.8-22.6 9.3-35.2l-0.9-2.6c-18.1-50.5-44.9-96.9-79.7-137.9l-1.8-2.1c-8.6-10.1-22.5-13.9-35.1-9.5l-81.3 28.9c-30-24.6-63.5-44-99.7-57.6l-15.7-85c-2.4-13.1-12.7-23.3-25.8-25.7l-2.7-0.5c-52.1-9.4-106.9-9.4-159 0l-2.7 0.5c-13.1 2.4-23.4 12.6-25.8 25.7l-15.8 85.4c-35.9 13.6-69.2 32.9-99 57.4l-81.9-29.1c-12.5-4.4-26.5-0.7-35.1 9.5l-1.8 2.1c-34.8 41.1-61.6 87.5-79.7 137.9l-0.9 2.6c-4.5 12.5-0.8 26.5 9.3 35.2l66.3 56.6c-3.1 18.8-4.6 38-4.6 57.1 0 19.2 1.5 38.4 4.6 57.1L99 625.5c-10.1 8.6-13.8 22.6-9.3 35.2l0.9 2.6c18.1 50.4 44.9 96.9 79.7 137.9l1.8 2.1c8.6 10.1 22.5 13.9 35.1 9.5l81.9-29.1c29.8 24.5 63.1 43.9 99 57.4l15.8 85.4c2.4 13.1 12.7 23.3 25.8 25.7l2.7 0.5c26.1 4.7 52.8 7.1 79.5 7.1 26.7 0 53.5-2.4 79.5-7.1l2.7-0.5c13.1-2.4 23.4-12.6 25.8-25.7l15.7-85c36.2-13.6 69.7-32.9 99.7-57.6l81.3 28.9c12.5 4.4 26.5 0.7 35.1-9.5l1.8-2.1c34.8-41.1 61.6-87.5 79.7-137.9l0.9-2.6c4.5-12.3 0.8-26.3-9.3-35zM788.3 465.9c2.5 15.1 3.8 30.6 3.8 46.1s-1.3 31-3.8 46.1l-6.6 40.1 74.7 63.9c-11.3 26.1-25.6 50.7-42.6 73.6L721 702.8l-31.4 25.8c-23.9 19.6-50.5 35-79.3 45.8l-38.1 14.3-17.9 97c-28.1 3.2-56.8 3.2-85 0l-17.9-97.2-37.8-14.5c-28.5-10.8-55-26.2-78.7-45.7l-31.4-25.9-93.4 33.2c-17-22.9-31.2-47.6-42.6-73.6l75.5-64.5-6.5-40c-2.4-14.9-3.7-30.3-3.7-45.5 0-15.3 1.2-30.6 3.7-45.5l6.5-40-75.5-64.5c11.3-26.1 25.6-50.7 42.6-73.6l93.4 33.2 31.4-25.9c23.7-19.5 50.2-34.9 78.7-45.7l37.9-14.3 17.9-97.2c28.1-3.2 56.8-3.2 85 0l17.9 97 38.1 14.3c28.7 10.8 55.4 26.2 79.3 45.8l31.4 25.8 92.8-32.9c17 22.9 31.2 47.6 42.6 73.6L781.8 426l6.5 39.9z" p-id="4742" fill="#2e6ab4" /><path d="M512 326c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176z m79.2 255.2C570 602.3 541.9 614 512 614c-29.9 0-58-11.7-79.2-32.8C411.7 560 400 531.9 400 502c0-29.9 11.7-58 32.8-79.2C454 401.6 482.1 390 512 390c29.9 0 58 11.6 79.2 32.8C612.3 444 624 472.1 624 502c0 29.9-11.7 58-32.8 79.2z" p-id="4743" fill="#2e6ab4" /></svg>
    </NIcon>
  </div>

  <!-- 遮罩层 -->
  <div v-if="isSetPrompt" class="mymask">
    <div class="myform">
      <h2>随机生成提示词设置</h2>
      <NDivider />
      <NForm
        label-width="auto"
        :model="settingValue"
        label-placement="left"
        size="medium"
      >
        <NFormItem label="生成对象: " path="type">
          <NRadioGroup
            v-model:value="settingValue.type"
            name="top-size"
          >
            <NRadio value="0">
              人物
            </NRadio>
            <NRadio value="1">
              物体
            </NRadio>
            <NRadio value="2">
              动物
            </NRadio>
          </NRadioGroup>
        </NFormItem>
        <NFormItem label="其它参数: " path="args">
          <NCheckboxGroup v-model:value="settingValue.args">
            <NSpace vertical>
              <NCheckbox value="3">
                地点或场景
              </NCheckbox>
              <NCheckbox v-if="isShowCheck" value="4">
                动作或行为
              </NCheckbox>
              <NCheckbox value="5">
                风格
              </NCheckbox>
              <NCheckbox value="6">
                灯光
              </NCheckbox>
              <NCheckbox value="7">
                艺术家
              </NCheckbox>
              <NCheckbox value="8">
                视角
              </NCheckbox>
              <NCheckbox value="9">
                色彩
              </NCheckbox>
              <NCheckbox value="10">
                细节
              </NCheckbox>
            </NSpace>
          </NCheckboxGroup>
        </NFormItem>
        <NFormItem>
          <NButton type="info" style="margin: 0 auto;width: 5rem;" @click="setok">
            确定
          </NButton>
          <NButton type="error" style="margin: 0 auto;width: 5rem;" @click="setnot">
            取消
          </NButton>
        </NFormItem>
      </NForm>
    </div>
  </div>
</template>

<style lang="less" scoped>
.mymask {
  position: fixed; /* 固定在页面顶部 */
  z-index: 32; /* 置于其他元素之上 */
  width: 100%; /* 宽度为100% */
  height: 100%; /* 高度为100% */
  background-color: rgba(0, 0, 0, 0.5); /* 半透明黑色背景 */
  top: 0;
  left: 0;
}
// /* 表单样式 */
.myform {
  position: absolute; /* 相对于遮罩层定位 */
	min-width:40%;
  top: 50%; /* 垂直居中 */
  left: 50%; /* 水平居中 */
  transform: translate(-50%, -50%); /* 调整位置 */
  background-color: #fff; /* 白色背景 */
  padding: 20px; /* 内边距 */
  border-radius: 5px; /* 圆角 */
  box-shadow: 2px 2px 5px #999; /* 阴影效果 */
}

@media (max-width: 768px) {
	.myform{
		width: 80%;
	}
}
</style>
