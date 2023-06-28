<script setup lang="ts">
// import { ElTabPane, ElTabs } from 'element-plus'
// import type { TabsPaneContext } from 'element-plus'
import { NButton, NDivider } from 'naive-ui'
import { computed, ref } from 'vue'
import { useChatStore } from '@/store'
const chatStore = useChatStore()

const curChoose = ref<undefined | number>(undefined)
const active = computed(() => chatStore.type === 1)
const isShowDia = ref(false)

function handleShow(type: number) {
  if (type === 0 && active.value) {
    if (chatStore.getChatByUuid(chatStore.active!).length !== 0 && chatStore.getChatByUuid(chatStore.active!).slice(-1)[0].loading)
      return
    curChoose.value = type
    isShowDia.value = true
  }
  else if (type === 1 && type !== chatStore.type) {
    curChoose.value = type
    isShowDia.value = true
  }
}

function handleChange() {
  if (curChoose.value !== undefined && chatStore.type !== curChoose.value)
    chatStore.changeType(chatStore.active!, curChoose.value)
  isShowDia.value = false
}
</script>

<template>
  <div class="home">
    <div class="tabs">
      <div class="tab tab1" :class="active || 'active'" style="white-space: nowrap;" @click="handleShow(0)">
        ChatGPT聊天模式
      </div>
      <div class="tab tab2" :class="active && 'active'" @click="handleShow(1)">
        AI生图模式
      </div>
    </div>
    <NDivider style="margin: 0;margin-top: 1rem;" />
  </div>
  <!-- 遮罩层 -->
  <div v-if="isShowDia" class="mask">
    <!-- 表单 -->
    <div class="myform" style="display: flex;flex-direction: column;align-items: center;justify-content: center;">
      <h2>注意:切换后历史记录将会清空,并且计费会发生变化</h2>
      <div style="margin: 50px auto;margin-bottom: 10px;">
        <NButton type="info" @click="handleChange">
          确定
        </NButton>
        <NButton type="error" style="margin-left: 10px;" @click="isShowDia = false">
          取消
        </NButton>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.home{
	width: 100%;
	padding-top: 1rem;
	z-index: 1;
	.tabs{
		display: flex;
		justify-content: center;
		align-items: center;
		.tab{
			text-align: center;
			padding: 0.5rem;
			width: 9rem;
			background-color: #f4f4f4;
			color: #9c9c9c;
			cursor: pointer;
			&:hover{
				background-color: #e6f1ff;
			}
		}
		.tab.active{
			box-sizing: border-box;
			background-color: #e6f1ff;
			border: 1px solid #0a76ff;
			color: #317cdc ;
			font-weight: 700;
		}
	}

}
/*遮罩层样式 */
.mask {
  position: fixed; /* 固定在页面顶部 */
  z-index: 1; /* 置于其他元素之上 */
  width: 100%; /* 宽度为100% */
  height: 100%; /* 高度为100% */
  background-color: rgba(0, 0, 0, 0.5); /* 半透明黑色背景 */
  top: 0;
  left: 0;
	z-index: 99999;
}

/* 表单样式 */
.myform {
  position: absolute; /* 相对于遮罩层定位 */
  top: 50%; /* 垂直居中 */
  left: 50%; /* 水平居中 */
  transform: translate(-50%, -50%); /* 调整位置 */
  background-color: #fff; /* 白色背景 */
  padding: 20px; /* 内边距 */
  border-radius: 5px; /* 圆角 */
  box-shadow: 2px 2px 5px #999; /* 阴影效果 */
	z-index: 99999;
}
</style>
