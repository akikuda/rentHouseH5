<template>
  <div class="upload-container">
    <van-uploader
      v-model="fileList"
      :after-read="handleAfterRead"
      multiple
      accept="image/*"
      :max-size="mediaOverSize * 1024 * 1024"
      :max-count="maxCount"
      @oversize="onOversize"
      :deletable="true"
    >
      <template #default>
        <div class="my-upload" v-if="fileList.length < maxCount">
          <van-icon name="plus" size="24px" />
          <div>点击上传</div>
        </div>
      </template>
    </van-uploader>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineComponent } from 'vue';
import { showToast, showSuccessToast, showFailToast, type UploaderFileListItem } from 'vant';
import axios from 'axios';
import { useUserStore } from "@/store/modules/user";
// 使用import type导入类型定义，以防没有直接导出
import Compressor from 'compressorjs';

// 明确定义组件，以便能正确被导入
defineComponent({
  name: 'UploadImg'
});

interface Props {
  fileList: UploaderFileListItem[];
  maxCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  maxCount: 9
});

const emit = defineEmits(['update:fileList']);

// 创建一个本地的fileList
const fileList = ref<UploaderFileListItem[]>([...props.fileList]);

// 监听本地fileList变化，通知父组件
watch(fileList, (newVal) => {
  emit('update:fileList', newVal);
}, { deep: true });

// 监听props.fileList变化
watch(() => props.fileList, (newVal) => {
  if (JSON.stringify(newVal) !== JSON.stringify(fileList.value)) {
    fileList.value = [...newVal];
  }
}, { deep: true });

// 限制文件上传大小
const mediaOverSize = 3;

// 当文件被读取后调用此函数
const handleAfterRead = async (file: UploaderFileListItem | UploaderFileListItem[]) => {
  // 如果是一次多张上传
  if (Array.isArray(file)) {
    file.forEach(async item => {
      await processFile(item);
    });
  } else {
    // 单文件上传
    await processFile(file);
  }
};

// 处理文件上传
const processFile = async (file: UploaderFileListItem) => {
  try {
    file.status = 'uploading'; // 显示上传状态
    
    // 压缩图片
    if (file.file) {
      const compressedFile = await compressImage(file.file);
      
      // 创建 FormData 对象
      const formData = new FormData();
      formData.append('file', compressedFile);

      // 发起上传请求
      const response = await axios.post('/app/file/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'access-token': useUserStore().token,
        },
      });

      // 更新文件信息
      file.status = 'done';
      file.url = response.data.data; // 直接设置URL
      // 这里已经正确设置了file.url，会通过v-model传递回父组件
      showSuccessToast('上传成功');
    }
  } catch (error) {
    file.status = 'failed';
    showFailToast('上传失败');
    console.error('上传失败:', error);
  }
};

// 压缩图片并将图片修正
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.6,
      maxWidth: 1000,
      maxHeight: 1000,
      convertSize: 1000000,
      checkOrientation: true,
      success(result: Blob) {
        const compressedImage = new File([result], file.name, { type: file.type });
        resolve(compressedImage);
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
};

// 文件大小超出限制时的回调
const onOversize = () => {
  showFailToast(`文件大小不能超过${mediaOverSize}MB`);
};
</script>

<style lang="less" scoped>
.upload-container {
  margin: 16px 0;
}

.my-upload {
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f7f8fa;
  border-radius: 8px;
  
  img {
    width: 24px;
    height: 24px;
    margin-bottom: 4px;
  }
  
  div {
    font-size: 12px;
    color: #646566;
  }
}
</style>

