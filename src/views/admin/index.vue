<script setup lang="ts">
import type { Component } from 'vue'
import { h, onMounted, ref } from 'vue'
import { NIcon, NLayout, NLayoutSider, NMenu, NSpace } from 'naive-ui'
import { useRoute } from 'vue-router'
import MyIcon from './myIcon.vue'
import MyIcon3 from './myIcon3.vue'
import { router } from '@/router'

// 处理左边menu
const inverted = ref(false)
const activeKey = ref<string | null>('charge')

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}
function handleChange(key: string) {
  if (key !== activeKey.value)
    router.push(`/Admin/${key}`)
}

const menuOptions: any = [
  {
    label: '秘钥管理',
    key: 'charge',
    icon: renderIcon(MyIcon),
  },
  {
    label: '参数管理',
    key: 'arguments',
    icon: renderIcon(MyIcon3),
  },
]

onMounted(() => {
  const route = useRoute()
  if (route.name === 'Charge')
    activeKey.value = 'charge'
  else activeKey.value = 'arguments'
})
</script>

<template>
  <div class="admin">
    <div class="navBar">
      <div class="logo">
        <img src="../../assets/logo.jpg" alt="" srcset="">
        ChatGpt秘钥管理系统
      </div>
      <div class="middle">
        秘钥后台管理系统
      </div>
      <div class="user">
        <span>欢迎登录, 超级管理员</span>
      </div>
    </div>
    <div class="content">
      <NSpace vertical>
        <NLayout has-sider style="height: calc(100vh - 6vh);">
          <NLayoutSider
            bordered
            collapse-mode="width"
            :collapsed-width="64"
            :width="200"
            show-trigger
            :inverted="inverted"
          >
            <NMenu
              v-model:value="activeKey"
              :inverted="inverted"
              :collapsed-width="64"
              :collapsed-icon-size="22"
              :options="menuOptions"
              @update-value="handleChange"
            />
          </NLayoutSider>
          <NLayout style="padding-left: 10px;background-color: #f0f0f0;display: flex;flex-direction: column;height: 100%;">
            <RouterView />
          </NLayout>
        </NLayout>
      </NSpace>
    </div>
  </div>
</template>

<style lang="less" scoped>
.n-layout-scroll-container{
	height: 100%;
	display: flex;
	flex-direction: column;
}
.admin{
	position: relative;
	display: flex;
	flex-direction: column;
	height: 100%;
}
.navBar {
	background-color: #2c8cf0;
	display: flex;
	justify-content: space-between;
	align-items: center;
	color: #fff;
	height: 6%;
	padding: 4px 20px;
	.logo {
		display: flex;
		align-items: center;
		img {
			width: 35px;
			margin-right: 10px;
		}
	}

}
.content{
	background-color: #f0f0f0;
	height: 100%;
	width: 100%;
}
</style>
