<!-- eslint-disable no-mixed-spaces-and-tabs -->
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus/es/components/form'
import { computed, reactive, ref } from 'vue'
import { ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElRadio, ElRadioGroup } from 'element-plus'
import MyIcon2 from './myIcon2.vue'
import axios from '@/utils/request/axiosAdmin'
const props = defineProps(['dialogVisible', 'dialogInfo'])
const emit = defineEmits(['update:dialogVisible', 'patchInfo', 'add'])
const isVisible = computed({
  get() {
    return props.dialogVisible
  },
  set(value) {
    emit('update:dialogVisible', value)
  },
})
const { dialogInfo } = props
const title = computed(() => {
  return dialogInfo.id ? '编辑信息' : '添加验证码'
})
const formData = ref(dialogInfo)
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
  ruleFormRef.value?.validate((valid) => {
    if (valid) {
      // 这里可以将表单数据提交到后端
      // console.log('表单数据：', formData.value)
      if (formData.value.id)
      	emit('patchInfo', { ...formData.value })
      else emit('add', { ...formData.value })
      isVisible.value = false
    }
    else {
      return false
    }
  })
}
// 取消表单输入
function handleDialogCancel() {
  isVisible.value = false
}
// 生成激活码
async function giveCode() {
  const code = await axios.get('/getNewcode')
  formData.value.code = code.data.info
}
const rules = reactive<FormRules>({
  code: [
    { required: true, message: '请输入激活码', trigger: 'blur' },
    { min: 6, max: 32, message: '激活码的长度应该在6-32个字符之间', trigger: 'blur' },
  ],
  times: [
    {
      validator: validatePass,
      trigger: 'blur',
    },
  ],
})
</script>

<template>
  <ElDialog
    v-model="isVisible"
    class="dialog"
    :title="title"
    width="35%"
    :close-on-click-modal="false"
  >
    <ElForm ref="ruleFormRef" :model="formData" :rules="rules">
      <ElFormItem label="激活码" :label-width="labelWidth" prop="code">
        <div style="display: flex;width: 100%;align-items: center;">
          <ElInput v-model="formData.code" class="newCode" placeholder="请输入激活码" style="width: 100%;" />
          <MyIcon2 style="padding-right: 20px;margin-left: 10px;cursor: pointer;" @click="giveCode" />
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
