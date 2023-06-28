<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { FormInst } from 'naive-ui'
import { NButton, NCheckbox, NCheckboxGroup, NForm, NFormItem, NGrid, NGridItem, NInput, NInputNumber, NSpace } from 'naive-ui'
import axios from '@/utils/request/axiosAdmin'

interface IFormValueType {
  checkboxGroupValue: string[]
  gpt3: { api: string; fee: number;baseUrl: string }
  gpt4: { api: string; fee: number;baseUrl: string }
  draw: { api: string; fee: number;baseUrl: string }
}

interface List {
  type: string
  token?: string
  bl: number
  isUse: number
  baseUrl: string
}

interface IGetData {
  status: string
  message: string
  list: List[]
}

const formRef = ref<FormInst | null>(null)
const formValue = ref<IFormValueType>({
  checkboxGroupValue: [],
  gpt3: {
    api: '',
    fee: 1,
    baseUrl: '',
  },
  gpt4: {
    api: '',
    fee: 10,
    baseUrl: '',
  },
  draw: {
    api: '',
    fee: 10,
    baseUrl: '',
  },
})

// 获取全部数据
async function getlist() {
  const res = (await axios.get('/getArguments')).data as IGetData
  res.list.forEach((item) => {
    const key = item.type as 'gpt3' | 'gpt4' | 'draw'
    if (item.isUse)
      formValue.value.checkboxGroupValue.push(item.type)
    formValue.value[key].api = item.token!
    formValue.value[key].fee = item.bl
    formValue.value[key].baseUrl = item.baseUrl
  })
}

async function updateArg() {
  await axios.post('/updateArguments', {
    gpt3: { ...formValue.value.gpt3, isUse: formValue.value.checkboxGroupValue.includes('gpt3') ? 1 : 0 },
    gpt4: { ...formValue.value.gpt4, isUse: formValue.value.checkboxGroupValue.includes('gpt4') ? 1 : 0 },
    draw: { ...formValue.value.draw, isUse: formValue.value.checkboxGroupValue.includes('draw') ? 1 : 0 },
  })
}

onMounted(async () => {
  await getlist()
})

function handleButtonClick() {
  updateArg()
}
const rules = {
  gpt3: {
  },
}
</script>

<template>
  <div class="arguments">
    <NForm
      ref="formRef"
      inline
      label-width="auto"
      :model="formValue"
      :rules="rules"
      size="medium"
      label-placement="left"
      style="display: flex;flex-direction: column;width: 80%;"
    >
      <NFormItem label="模式开关" path="checkboxGroupValue">
        <NCheckboxGroup v-model:value="formValue.checkboxGroupValue">
          <NSpace>
            <NCheckbox value="gpt3">
              ChatGPT3.5
            </NCheckbox>
            <NCheckbox value="gpt4">
              ChatGPT4.0
            </NCheckbox>
            <NCheckbox value="draw">
              Midjourney
            </NCheckbox>
          </NSpace>
        </NCheckboxGroup>
      </NFormItem>
      <NGrid :y-gap="8" :x-gap="3" :cols="24">
        <NGridItem :span="12">
          <NFormItem label="ChatGPT3.5 Key" path="gpt3.api">
            <NInput v-model:value="formValue.gpt3.api" placeholder="输入Key" />
          </NFormItem>
        </NGridItem>
        <NGridItem :span="7">
          <NFormItem label="URL" path="gpt3.baseUrl">
            <NInput v-model:value="formValue.gpt3.baseUrl" placeholder="输入接口地址" />
          </NFormItem>
        </NGridItem>
        <NGridItem :span="5">
          <NFormItem label="倍率" path="gpt3.fee">
            <NInputNumber v-model:value="formValue.gpt3.fee" placeholder="输入倍率" />
          </NFormItem>
        </NGridItem>
        <NGridItem :span="12">
          <NFormItem label="ChatGPT4 Key" path="gpt4.api">
            <NInput v-model:value="formValue.gpt4.api" placeholder="输入Key" />
          </NFormItem>
        </NGridItem>
        <NGridItem :span="7">
          <NFormItem label="URL" path="gpt4.baseUrl">
            <NInput v-model:value="formValue.gpt4.baseUrl" placeholder="输入接口地址" />
          </NFormItem>
        </NGridItem>
        <NGridItem :span="5">
          <NFormItem label="倍率" path="gpt4.fee">
            <NInputNumber v-model:value="formValue.gpt4.fee" placeholder="输入倍率" />
          </NFormItem>
        </NGridItem>
        <NGridItem :span="12">
          <NFormItem label="Midjourney Key" path="draw.api">
            <NInput v-model:value="formValue.draw.api" placeholder="输入Key" />
          </NFormItem>
        </NGridItem>
        <NGridItem :span="7">
          <NFormItem label="URL" path="draw.baseUrl">
            <NInput v-model:value="formValue.draw.baseUrl" disabled placeholder="输入接口地址" />
          </NFormItem>
        </NGridItem>
        <NGridItem :span="5">
          <NFormItem label="倍率" path="draw.fee">
            <NInputNumber v-model:value="formValue.draw.fee" placeholder="输入倍率" />
          </NFormItem>
        </NGridItem>
      </NGrid>
      <NButton type="info" style="width: 15%;margin-left: 40%;" @click="handleButtonClick">
        提交
      </NButton>
    </NForm>
  </div>
</template>

<style lang="less" scoped>
.arguments{
	width: 100%;
	height: 100%;
	padding: 30px 30px;
	background-color: #fff;
}
</style>
