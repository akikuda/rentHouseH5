<template>
  <div class="user-container">
    <div class="user h-[30vh] flex flex-col justify-center items-center">
      <van-image
        @click="handleAvatarPreview"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
        @touchmove="handleTouchMove"
        round
        width="30vw"
        height="30vw"
        :src="userStore.userInfo?.avatarUrl || defaultAvatarUrl"
      >
        <template v-slot:error>加载失败</template>
      </van-image>
      <div 
        class="mt-[8px] font-bold text-[16px] cursor-pointer"
        @click="handleNicknameClick"
      >
        {{ userStore.userInfo?.nickname || "测试" }}
      </div>
    </div>
    <div class="main-container flex justify-around mt-[30px]">
      <div
        v-for="item in navList"
        :key="item.path"
        class="flex flex-col justify-center items-center"
        @click="router.push(item.path)"
      >
        <SvgIcon :name="item.icon" size="50" />
        <span>{{ item.name }}</span>
      </div>
    </div>
    <div class="main-container flex justify-center mt-[150px]">
      <!--      退出登录-->
      <van-button type="primary" class="w-[50vw]" @click="logoutHandle"
        >退出登录</van-button
      >
    </div>
  </div>
  
  <!-- 头像预览 -->
  <van-image-preview
    v-model:show="showPreview"
    :images="previewImages"
    close-on-popstate
  />
  
  <!-- 上传头像弹窗 -->
  <van-dialog v-model:show="showAvatarUploader" title="更新头像" :show-confirm-button="false">
    <div class="p-4">
      <UploadImg
        v-model:fileList="avatarFileList"
        :max-count="1"
        @update:fileList="handleAvatarUpdated"
      />
      <div class="flex justify-end mt-4">
        <van-button plain type="primary" size="small" @click="showAvatarUploader = false">关闭</van-button>
      </div>
    </div>
  </van-dialog>
  
  <!-- 修改昵称弹窗 -->
  <van-dialog
    v-model:show="showNicknameDialog"
    title="修改昵称"
    show-cancel-button
    @confirm="confirmNickname"
  >
    <van-field
      v-model="newNickname"
      placeholder="请输入新昵称(不超过20个字符)"
      :maxlength="20"
    />
  </van-dialog>
</template>
<script setup lang="ts" name="UserCenter">
import { useUserStore } from "@/store/modules/user";
import { showImagePreview, showToast, type UploaderFileListItem } from "vant";
import defaultAvatarUrl from "../../../public/favicon.ico";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { updateUserAvatar, updateUserNickname } from "@/api/search";
import UploadImg from "@/components/uploadImg";

const router = useRouter();
const navList = ref([
  {
    icon: "历史",
    name: "浏览历史",
    path: "/browsingHistory"
  },
  {
    icon: "预约",
    name: "我的预约",
    path: "/myAppointment"
  },
  {
    icon: "合同",
    name: "我的租约",
    path: "/myAgreement"
  }
]);
const userStore = useUserStore();

// 预览头像相关
const showPreview = ref(false);
const previewImages = ref<string[]>([]);

// 头像上传相关
const showAvatarUploader = ref(false);
const avatarFileList = ref<UploaderFileListItem[]>([]);

// 昵称相关
const showNicknameDialog = ref(false);
const newNickname = ref('');

// 长按相关变量
const touchTimer = ref<number | null>(null);
const isTouchMoving = ref(false);
const longPressDuration = 600; // 长按时间阈值（毫秒）

// 预览头像
const handleAvatarPreview = () => {
  const avatarUrl = userStore.userInfo?.avatarUrl;
  if (avatarUrl) {
    previewImages.value = [avatarUrl];
    showPreview.value = true;
  } else {
    // 如果没有头像，则直接打开上传对话框
    showAvatarUploader.value = true;
  }
};

// 处理触摸开始事件
const handleTouchStart = () => {
  isTouchMoving.value = false;
  // 清除之前可能存在的定时器
  if (touchTimer.value) {
    clearTimeout(touchTimer.value);
  }
  // 设置新的定时器
  touchTimer.value = window.setTimeout(() => {
    if (!isTouchMoving.value && userStore.userInfo?.avatarUrl) {
      // 长按触发修改头像
      showAvatarUploader.value = true;
      // 震动提示（如果设备支持）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  }, longPressDuration);
};

// 处理触摸结束事件
const handleTouchEnd = () => {
  // 清除定时器
  if (touchTimer.value) {
    clearTimeout(touchTimer.value);
    touchTimer.value = null;
  }
};

// 处理触摸移动事件（避免滑动时触发长按）
const handleTouchMove = () => {
  isTouchMoving.value = true;
  // 清除定时器
  if (touchTimer.value) {
    clearTimeout(touchTimer.value);
    touchTimer.value = null;
  }
};

// 处理头像更新
const handleAvatarUpdated = async (files: UploaderFileListItem[]) => {
  // 当上传完成后处理
  const completedFile = files.find(file => file.status === 'done' && file.url);
  if (completedFile && completedFile.url) {
    try {
      // 调用API更新头像
      await updateUserAvatar(completedFile.url);
      
      // 更新用户信息
      await userStore.GetInfoAction();
      
      showToast('头像更新成功');
      // 关闭上传对话框
      showAvatarUploader.value = false;
    } catch (error) {
      showToast('头像更新失败');
    }
  }
};

// 点击昵称处理
const handleNicknameClick = () => {
  newNickname.value = userStore.userInfo?.nickname || '';
  showNicknameDialog.value = true;
};

// 确认修改昵称
const confirmNickname = async () => {
  if (!newNickname.value.trim()) {
    showToast('昵称不能为空');
    return;
  }
  
  try {
    await updateUserNickname(newNickname.value);
    
    // 更新用户信息
    await userStore.GetInfoAction();
    
    showToast('昵称更新成功');
  } catch (error) {
    showToast('昵称更新失败');
  }
};

// 退出登陆
const logoutHandle = () => {
  userStore.Logout();
  // 清空路由浏览历史记录
  router.replace("/");
};

onMounted(() => {
  userStore.GetInfoAction();
});
</script>

<style scoped lang="less">
.user {
  background: var(--van-primary-background-color);
}
</style>
