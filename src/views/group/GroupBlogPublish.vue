<template>
  <div class="min-h-screen bg-white">
    <!-- 顶部导航栏 -->
    <div
      class="fixed top-0 left-0 right-0 flex justify-between items-center px-4 h-[44px] bg-white border-b border-gray-100 z-50"
    >
      <div class="text-[16px]" @click="showCancelConfirm">取消</div>
      <van-button
        :disabled="!canPublish"
        class="publish-btn"
        @click="handlePublish"
        >发送</van-button
      >
    </div>

    <!-- 内容区域 -->
    <div class="pt-[44px] px-4">
      <!-- 标题输入 -->
      <van-field
        v-model="formData.title"
        placeholder="标题"
        class="!p-0 text-[18px]"
        :border="false"
      />

      <!-- 正文输入 -->
      <van-field
        v-model="formData.content"
        type="textarea"
        placeholder="这一刻的想法..."
        class="!p-0 content-textarea"
        :border="false"
        rows="5"
        autosize
      />

      <!-- 选择博文类型 -->
      <div class="my-3" v-if="hasApartment">
        <van-field name="radio" label="博文类型">
          <template #input>
            <van-radio-group v-model="blogType" direction="horizontal">
              <van-radio name="public">公共博文</van-radio>
              <van-radio name="apartment">公寓博文</van-radio>
            </van-radio-group>
          </template>
        </van-field>
      </div>

      <!-- 图片上传 -->
      <upload-img
        v-model:file-list="formData.images"
        :max-count="9"
      ></upload-img>
    </div>

    <!-- 取消确认弹窗 -->
    <van-dialog
      v-model:show="showCancelDialog"
      title="提示"
      show-cancel-button
      @confirm="handleCancel"
    >
      <div class="p-4">确定要放弃编辑吗？</div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { showToast, showLoadingToast } from "vant";
import type { UploaderFileListItem } from "vant";
import { saveBlog } from "@/api/search";
import type { GroupBlogItemInterface } from "@/api/search/types";
import UploadImg from "@/components/uploadImg";
// import { useUserStore } from "@/store/modules/user";

const router = useRouter();
const route = useRoute();
const showCancelDialog = ref(false);

// 用户是否有公寓以及公寓ID
const hasApartment = ref(false);
const userApartmentId = ref<string | number | undefined>(undefined);

// 博文类型选择
const blogType = ref<'public' | 'apartment'>('public');

// 从路由参数获取用户公寓信息
onMounted(() => {
  const hasApartmentParam = route.query.hasApartment;
  const apartmentIdParam = route.query.apartmentId;
  
  hasApartment.value = hasApartmentParam === '1';
  userApartmentId.value = apartmentIdParam ? String(apartmentIdParam) : undefined;
});

// 表单数据
const formData = ref({
  title: "",
  content: "",
  images: [] as UploaderFileListItem[]
});

// 判断是否可以发布
const canPublish = computed(() => {
  return (
    (formData.value.title.trim() !== "" &&
      formData.value.content.trim() !== "") ||
    formData.value.images.length > 0
  );
});

// 显示取消确认弹窗
const showCancelConfirm = () => {
  if (
    formData.value.title.trim() !== "" ||
    formData.value.content.trim() !== "" ||
    formData.value.images.length > 0
  ) {
    showCancelDialog.value = true;
  } else {
    handleCancel();
  }
};

// 处理取消
const handleCancel = () => {
  router.back();
};

// 处理发布
const handlePublish = async () => {
  if (!canPublish.value) return;

  const loading = showLoadingToast({
    message: "发布中...",
    forbidClick: true
  });

  try {
    // 确保图片数组存在且有上传成功的图片
    const validImages = formData.value.images.filter(img => img.status === 'done' && img.url);
    
    const params: Partial<GroupBlogItemInterface> = {
      title: formData.value.title,
      content: formData.value.content,
      // 根据选择的博文类型决定是否添加公寓ID
      apartmentId: (hasApartment.value && blogType.value === 'apartment') ? userApartmentId.value : -1,
      graphVoList: validImages.length > 0 ? validImages.map(
        (img: UploaderFileListItem, index: number) => ({
          url: img.url || "",
          name: index
        })
      ) : []
    };

    console.log('发送博文参数:', params); // 添加日志便于调试

    await saveBlog(params);
    showToast("发布成功");
    // 返回上一页并传递刷新标记
    router.replace({
      path: "/group",
      query: {
        refresh: Date.now().toString()
      }
    });
  } catch (error) {
    showToast("发布失败");
    console.error('发布失败:', error); // 添加错误日志
  } finally {
    loading.close();
  }
};
</script>

<style lang="less" scoped>
.publish-btn {
  background-color: #07c160 !important;
  color: white !important;
  border: none !important;
  border-radius: 4px;
  padding: 0 12px;
  height: 32px;
  line-height: 32px;

  &:disabled {
    opacity: 0.5;
    background-color: #95ec95 !important;
  }
}

.content-textarea {
  :deep(.van-field__control) {
    min-height: 100px;
  }
}
</style>