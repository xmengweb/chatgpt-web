<!-- eslint-disable no-mixed-spaces-and-tabs -->
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus/es/components/form'
import { reactive, ref } from 'vue'
import { ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElInputNumber, ElRadio, ElRadioGroup } from 'element-plus'
import axios from '@/utils/request/axiosAdmin'

const emit = defineEmits(['close', 'submit'])
const formData = ref({
  amount: 2,
  times: '',
  notes: '',
  state: 1,
})
const labelWidth = ref('80px')
const ruleFormRef = ref<FormInstance>()

const validatePass = (rule: any, value: any, callback: any) => {
  // eslint-disable-next-line max-statements-per-line
  if (value === '') { callback(new Error('请输入使用次数')) }

  // eslint-disable-next-line max-statements-per-line
  else if (value.split('/').length !== 2) { callback(new Error('请输入正确的格式')) }
  else {
    const array = value.split('/')
    if (parseInt(array[0]) > parseInt(array[1]))
      callback(new Error('剩余量需要小于总量'))
    else callback()
  }
}
// 确认提交表单数据
function handleDialogConfirm() {
  ruleFormRef.value?.validate(async (valid) => {
    if (valid) {
      // 这里可以将表单数据提交到后端
      const timesArray = formData.value.times.split('/')
      await axios.post('/addManyCode', {
        amount: formData.value.amount,
        notes: formData.value.notes,
        state: formData.value.state,
        remain: timesArray[0],
        total: timesArray[1],
      })
      emit('submit')
    }
    else {
      return false
    }
  })
}
// 取消表单输入
function handleDialogCancel() {
  emit('close')
}
const rules = reactive<FormRules>({
  amount: [
    { required: true, message: '请输入数量', trigger: 'blur' },
    { min: 2, message: '数量至少为2', trigger: 'blur' },
  ],
  times: [
    {
      validator: validatePass,
      trigger: 'blur',
    },
  ],
})
const isShow = ref(true)
</script>

<template>
  <ElDialog
    v-model="isShow"
    class="dialog"
    title="批量增加"
    width="35%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <ElForm ref="ruleFormRef" :model="formData" :rules="rules">
      <ElFormItem label="数量" :label-width="labelWidth" prop="code">
        <div style="display: flex;width: 100%;align-items: center;">
          <ElInputNumber v-model="formData.amount" :min="2" style="width: 100%;" />
        </div>
      </ElFormItem>
      <ElFormItem label="总次数" :label-width="labelWidth" prop="times">
        <ElInput v-model="formData.times" placeholder="请输入次数(50/100)" />
      </ElFormItem>
      <ElFormItem label="备注" :label-width="labelWidth">
        <ElInput v-model="formData.notes" placeholder="请输入备注" />
      </ElFormItem>
      <ElFormItem label="状态" :label-width="labelWidth">
        <ElRadioGroup v-model="formData.state">
          <ElRadio :label="1">
            启用
          </ElRadio>
          <ElRadio :label="0">
            禁用
          </ElRadio>
        </ElRadioGroup>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="handleDialogCancel">
        取消
      </ElButton>
      <ElButton type="primary" @click="handleDialogConfirm">
        确定
      </ElButton>
    </template>
  </ElDialog>
</template>

<style lang="less" scoped>
.el-button--primary[type='button']{
	background-color: #409eff;
}
</style>
