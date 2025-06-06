<template>
  <van-nav-bar
    v-if="shouldShowNavBar"
    fixed
    placeholder
    @click-right="onClickRight"
    @click-left="onClickLeft"
    :left-arrow="showBackArrow"
    :title="pageTitle"
  >
    <template #right>
      <svg-icon class="text-[18px]" :name="useDarkMode() ? 'light' : 'dark'" />
    </template>
  </van-nav-bar>
</template>
<script setup lang="ts">
import { useDarkMode, useToggleDarkMode } from "@/hooks/useToggleDarkMode";
import { computed } from "vue";
import tabBarRoutes from "@/router/tabBarRoutes";
import otherRoutes from "@/router/otherRoutes";
import { useRoute, useRouter } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const route = useRoute();
const router = useRouter();

const onClickRight = () => {
  useToggleDarkMode();
};

const onClickLeft = () => {
  router.back();
};

// 需要显示返回箭头的路径列表
const showBackArrowPaths = [
  '/roomDetail',
  '/apartmentDetail',
  '/browsingHistory',
  '/myAppointment',
  '/appointment',
  '/myAgreement',
  '/agreement'
];

// 是否显示返回箭头，只在指定路径上显示
const showBackArrow = computed(() => {
  return showBackArrowPaths.includes(route.path);
});

// 原来的导航栏显示条件
const isShowNavBar = computed(() => {
  const showNavBarRoutePathList = [...tabBarRoutes, ...otherRoutes]
    .filter(item => item?.meta?.isShowNavBar)
    .map(item => item.path);
  return showNavBarRoutePathList.includes(route.path);
});

// 最终导航栏显示条件：原条件或者需要显示返回箭头
const shouldShowNavBar = computed(() => {
  return isShowNavBar.value || showBackArrow.value;
});

// 获取页面标题
const pageTitle = computed((): string => {
  const currentRoute = [...tabBarRoutes, ...otherRoutes].find(
    item => item.path === route.path
  ) as RouteRecordRaw | undefined;
  
  return currentRoute?.meta?.title as string || '';
});
</script>

<style scoped></style>
