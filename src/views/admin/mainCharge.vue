<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { NButton, NDataTable, NFormItem, NInput, NSelect, NTag } from 'naive-ui'
import type { DataTableRowKey } from 'naive-ui'
import { ElNotification } from 'element-plus'
import editDialog from './editDialog.vue'
import addDialog from './addDialog.vue'
import axios from '@/utils/request/axiosAdmin'

// 查询栏信息
const	formValue = ref<{
  isRemain: any
  canUse: any
  notes: string
}>({
  isRemain: undefined,
  notes: '',
  canUse: undefined,
})

const checkedRowKeysRef = ref<DataTableRowKey[]>([])
// 显示编辑框
const dialogVisible = ref(false)
// 增加编辑框
const dialogVisible2 = ref(false)
// 传递给编辑框的信息
const dialogInfo = reactive({
  id: '',
  code: '',
  times: '',
  notes: '',
  state: 1,
})

// 分页配置
const paginationReactive = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 25, 50, 100],
  onChange: (page: number) => {
    paginationReactive.page = page
  },
  onUpdatePageSize: (pageSize: number) => {
    paginationReactive.pageSize = pageSize
    paginationReactive.page = 1
  },
})

// table栏信息
const ListData = ref<any>([])
// 获取全部数据
async function getlist() {
  const res = await axios.post('/getCodeInfo', {
    info: '',
    state: undefined,
    remain: undefined,
  })
  ListData.value = dealList(res.data.list)
}
onMounted(async () => {
  await getlist()
})
// 处理获取的列表信息
function dealList(res: any) {
  return res.map((value: any, index: number) => {
    return {
      id: value.Id,
      index: index + 1,
      code: value.code,
      use: `${value.remain}/${value.total}`,
      notes: value.notes || '无备注',
      state: value.state ? '可用' : '禁用',
    }
  })
}

// 查询
async function handleValidateClick() {
  const res = await axios.post('/getCodeInfo', {
    info: formValue.value.notes,
    state: formValue.value.canUse === 1 ? 1 : (formValue.value.canUse === 0 ? 0 : undefined),
    remain: formValue.value.isRemain === 1 ? 1 : (formValue.value.isRemain === 0 ? 0 : undefined),
  })
  ListData.value = dealList(res.data.list)
  ElNotification({
    title: 'Success',
    message: '查询成功',
    type: 'success',
    duration: 1000,
  })
}
// 重置
async function handleCzClick() {
  formValue.value.canUse = -1
  formValue.value.isRemain = -1
  formValue.value.notes = ''
  await getlist()
  ElNotification({
    title: 'Success',
    message: '重置成功',
    type: 'success',
    duration: 1000,
  })
}
// 删除所选项
async function deleteChoose() {
  const idArray = [...checkedRowKeysRef.value]
  await axios.post('/deleteCode', {
    idArray,
  })
  await getlist()
  ElNotification({
    title: 'Success',
    message: '删除',
    type: 'success',
    duration: 1000,
  })
}
function addMany() {
  dialogVisible2.value = true
}
// 增加一个
function addOne() {
  dialogInfo.id = ''
  dialogInfo.code = ''
  dialogInfo.notes = ''
  dialogInfo.times = ''
  dialogInfo.state = 1
  dialogVisible.value = true
}
async function add(obj: any) {
  const timesArray = obj.times.split('/')
  const res = await axios.post('/addCode', {
    code: obj.code,
    notes: obj.notes,
    state: obj.state,
    remain: timesArray[0],
    total: timesArray[1],
  })
  await getlist()
  if (res.data.status === 'Fail') {
    ElNotification({
      title: 'Error',
      message: res.data.message,
      type: 'error',
      duration: 1000,
    })
  }
  else {
    ElNotification({
      title: 'Success',
      message: '添加成功',
      type: 'success',
      duration: 1000,
    })
  }
}
// 勾选框回调函数
function handleCheck(rowKeys: DataTableRowKey[]) {
  checkedRowKeysRef.value = rowKeys
}

// 编辑某一个
function editInfo(row?: any) {
  dialogInfo.id = row.id
  dialogInfo.code = row.code
  dialogInfo.notes = row.notes
  dialogInfo.times = row.use
  dialogInfo.state = row.state === '可用' ? 1 : 0
  dialogVisible.value = true
}
async function patchInfo(obj: any) {
  const timesArray = obj.times.split('/')
  const res = await axios.patch('/editCondeInfo', {
    id: obj.id,
    code: obj.code,
    notes: obj.notes,
    state: obj.state,
    remain: timesArray[0],
    total: timesArray[1],
  })
  await getlist()
  if (res.data.status === 'Fail') {
    ElNotification({
      title: 'Error',
      message: res.data.message,
      type: 'error',
      duration: 1000,
    })
  }
  else {
    ElNotification({
      title: 'Success',
      message: '编辑成功',
      type: 'success',
      duration: 1000,
    })
  }
}
// 删除某一个
async function deleteInfo(row?: any) {
  const idArray = [row.id]
  await axios.post('/deleteCode', {
    idArray,
  })
  await getlist()
  ElNotification({
    title: 'Success',
    message: '删除',
    type: 'success',
    duration: 1000,
  })
}
async function addManySubmit() {
  dialogVisible2.value = false
  await getlist()
  ElNotification({
    title: 'Success',
    message: '添加成功',
    type: 'success',
    duration: 1000,
  })
}
const options: any = [
  {
    label: '不区分',
    value: -1,
  },
  {
    label: '无剩余',
    value: 0,
  },
  {
    label: '有剩余',
    value: 1,
  },
]
const options2: any = [
  {
    label: '不区分',
    value: -1,
  },
  {
    label: '禁用',
    value: 0,
  },
  {
    label: '可用',
    value: 1,
  },
]
const createColumns = (): any => [
  {
    type: 'selection',
    disabled(row: any) {
      return row.name === 'Edward King 3'
    },
  },
  {
    title: '序号',
    key: 'index',
    sorter(rowA: any, rowB: any) {
      return parseInt(rowB.id) - parseInt(rowA.id)
    },
    defaultSortOrder: 'ascend',
  },
  {
    title: '激活码',
    key: 'code',
  },
  {
    title: '剩余量/总量',
    key: 'use',
  },
  {
    title: '备注',
    key: 'notes',
  },
  {
    title: '状态',
    key: 'state',
    render(row: any) {
      const tags: any = [h(
        NTag,
        {
          style: {
            marginRight: '6px',
          },
          type: row.state === '可用' ? 'info' : 'error',
          bordered: false,
        },
        {
          default: () => row.state,
        },
      )]
      return tags
    },
  },
  {
    title: '操作',
    key: 'cz',
    render(row: any) {
      return [h(
        NButton,
        {
          style: 'margin-right:15px;',
          size: 'small',
          type: 'info',
          onClick: () => editInfo(row),
        },
        { default: () => '编辑' },
      ), h(
        NButton,
        {
          size: 'small',
          type: 'error',
          onClick: () => deleteInfo(row),
        },
        { default: () => '删除' },
      )]
    },
  },
]
</script>

<template>
  <div class="charge">
    <div class="caozuo">
      <div class="box" style="display: flex;margin-bottom: 20px;">
        <NFormItem id="select" label="是否有剩余" label-placement="left" style="margin-right: 200px;">
          <NSelect id="selectOption" v-model:value="formValue.isRemain" :options="options" />
        </NFormItem>
        <NFormItem id="select" label="状态是否可用" label-placement="left">
          <NSelect id="selectOption" v-model:value="formValue.canUse" :options="options2" />
        </NFormItem>
      </div>
      <div class="box2" style="display: flex;">
        <NInput v-model:value="formValue.notes" placeholder="模糊搜索" style="margin-right: 200px;" />
        <div style="display: flex;">
          <NButton type="success" style="margin-right: 20px;" @click="handleValidateClick">
            查询
          </NButton>
          <NButton @click="handleCzClick">
            重置
          </NButton>
        </div>
      </div>
    </div>
    <div class="list">
      <div class="infoBar">
        <h2>数据列表</h2>
        <div class="adddelete">
          <NButton type="info" style="margin-right: 20px;" @click="addMany">
            批量增加
          </NButton>
          <NButton type="success" style="margin-right: 20px;" @click="addOne">
            增加
          </NButton>
          <NButton type="error" @click="deleteChoose">
            删除
          </NButton>
        </div>
      </div>
      <div class="info">
        <NDataTable
          :columns="createColumns()"
          :data="ListData"
          :pagination="paginationReactive"
          :row-key="(row) => row.id"
          max-height="calc(85vh - 280px)"
          @update:checked-row-keys="handleCheck"
        />
      </div>
    </div>
    <editDialog v-if="dialogVisible" v-model:dialog-visible="dialogVisible" :dialog-info="dialogInfo" @patch-info="patchInfo" @add="add" />
    <addDialog v-if="dialogVisible2" @close="dialogVisible2 = false" @submit="addManySubmit" />
  </div>
</template>

<style lang="less" scoped>
.caozuo{
	display: flex;
  flex-direction: column;
	justify-content: space-between;
	margin-top: 8px;
	margin-right: 20px;
	border-radius: 5px;
	padding: 30px 30px;
	padding-right: 300px;
	background-color: #fff;

	.n-input{
		width: 385px;
	}

	#select{
		display: flex;
    justify-content: space-between;
		align-items: center;
		#selectOption{
			width: 300px;
			align-items: center;
		}
	}
}
.list{
	margin-right: 20px;
	margin-top: 15px;
	padding: 5px;
	background-color: #fff;
	border-radius: 5px;
	.infoBar{
		display: flex;
		justify-content: space-between;
		padding: 10px 10px;
		padding-right: 100px;
		.adddelete{
			display: flex;
			align-items: center;
		}
		h2{
			font-size:x-large;
			font-weight: 600;
		}
	}
}
</style>
