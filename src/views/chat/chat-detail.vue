<template>
  <div class="chat-detail">
    <!-- 头部导航 -->
    <van-nav-bar
      :title="nickname"
      left-arrow
      @click-left="goBack"
    />
    
    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <template v-if="messages.length > 0">
        <div 
          v-for="msg in messages" 
          :key="msg.id"
          class="message"
        >
          <!-- 用户自己的消息 -->
          <div v-if="msg.sendUserId === userId" class="message-self">
            <div class="message-content user-message">
              <div class="message-text">{{ msg.content }}</div>
            </div>
            <van-image
              round
              width="40px"
              height="40px"
              :src="userStore.userInfo?.avatarUrl || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'"
              class="avatar"
            />
          </div>
          
          <!-- 对方的消息 -->
          <div v-else class="message-other">
            <van-image
              round
              width="40px"
              height="40px"
              :src="avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'"
              class="avatar"
            />
            <div class="message-content ai-message">
              <div class="message-text">{{ msg.content }}</div>
            </div>
          </div>
        </div>
      </template>
      
      <!-- 无消息时显示 -->
      <div v-if="messages.length === 0" class="flex flex-col items-center justify-center py-[30px]">
        <van-empty description="暂无聊天记录" />
      </div>
    </div>
    
    <!-- 输入框 -->
    <div class="message-input">
      <van-field
        v-model="messageContent"
        placeholder="请输入消息"
        :border="false"
        @keyup.enter="sendMessage"
      >
        <template #button>
          <van-button size="small" type="primary" @click="sendMessage">
            发送
          </van-button>
        </template>
      </van-field>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMessageStore } from "@/store/modules/message";
import { useUserStore } from "@/store/modules/user";
import { wsManager } from "@/utils/websocket";
import { showToast } from "vant";
import type { MessageInfo } from "@/api/message/types";
import { updateCurrentChatSession } from "@/api/message";

const route = useRoute();
const router = useRouter();
const messageStore = useMessageStore();
const userStore = useUserStore();

// 消息内容
const messageContent = ref("");
// 消息列表容器
const messageListRef = ref<HTMLElement | null>(null);

// 聊天对象ID
const targetId = computed(() => Number(route.params.id));
// 聊天对象昵称
const nickname = computed(() => route.query.nickname as string || "聊天");
// 聊天对象头像
const avatar = computed(() => route.query.avatar as string || "");
// 当前用户ID
const userId = computed(() => userStore.userInfo?.id ? Number(userStore.userInfo.id) : null);
// 消息列表
const messages = computed(() => messageStore.chatMessages[targetId.value] || []);

/**
 * 发送消息
 */
const sendMessage = async () => {
  if (!messageContent.value.trim()) {
    return;
  }
  
  if (!userId.value) {
    showToast("请先登录");
    return;
  }
  
  await messageStore.sendMessageToCurrentChat(messageContent.value);
  messageContent.value = "";
  
  // 滚动到底部
  scrollToBottom();
};

/**
 * 滚动到底部
 */
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  });
};

/**
 * 处理新消息
 * @param message 收到的消息
 */
const handleNewMessage = (message: MessageInfo) => {
  // console.log('聊天页收到新消息:', message, '当前聊天ID:', targetId.value);
  
  // 判断是否为当前聊天的消息(发送者或接收者是当前聊天对象)
  const isChatMessage = 
    (Number(message.sendUserId) === targetId.value && Number(message.receiveUserId) === userId.value) || 
    (Number(message.sendUserId) === userId.value && Number(message.receiveUserId) === targetId.value);
  
  if (isChatMessage) {
    console.log('是当前聊天的消息，滚动到底部');
    scrollToBottom();
  }
};

/**
 * 返回上一页
 */
const goBack = () => {
  router.back();
};

onMounted(async () => {
  if (!userId.value) {
    showToast('请先登录');
    router.replace('/login');
    return;
  }
  
  try {
    // 加载聊天历史
    await messageStore.loadChatHistory(targetId.value);
    
    // 通知后端当前查看的会话ID
    if (userId.value) {
      await updateCurrentChatSession(userId.value, targetId.value);
    }
    
    // 滚动到底部
    scrollToBottom();
    
    // 注册WebSocket消息处理函数
    wsManager.registerCallback(handleNewMessage);
    
    // 确保WebSocket已连接
    if (!wsManager.ws || wsManager.ws.readyState !== WebSocket.OPEN) {
      wsManager.connect();
    }
  } catch (error) {
    console.error('加载聊天历史失败:', error);
    showToast('加载聊天记录失败');
  }
});

// 监听消息列表变化，自动滚动到底部
watch(() => messages.value.length, () => {
  scrollToBottom();
});

onUnmounted(() => {
  // 移除WebSocket消息处理函数
  wsManager.unregisterCallback(handleNewMessage);
  
  // 通知后端用户已退出当前会话
  if (userId.value) {
    updateCurrentChatSession(userId.value, -1);
  }
});
</script>

<style lang="less" scoped>
.chat-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.message-list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.message {
  margin-bottom: 16px;
  width: 100%;
}

.message-self {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}

.message-other {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid #fff;
  flex-shrink: 0;
}

.message-self .avatar {
  margin-left: 8px;
}

.message-other .avatar {
  margin-right: 8px;
}

.message-content {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  word-break: break-all;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.user-message {
  background-color: #d9f4ff;
  color: #000;
  border-top-right-radius: 2px;
}

.ai-message {
  background-color: #fff;
  color: #000;
  border-top-left-radius: 2px;
}

.message-text {
  font-size: 15px;
  line-height: 1.5;
}

.message-input {
  padding: 10px;
  background-color: #fff;
  border-top: 1px solid #eee;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}
</style> 