<template>
  <div>
    <!--    消息列表-->
    <PullDownRefreshContainer
      :request="loadData"
      ref="pullDownRefreshContainerRef"
      class="min-h-[70vh]"
    >
      <!--    顶部导航菜单-->
      <van-sticky offset-top="0">
        <div class="ai-service-nav">
          <div class="ai-service-card" @click="router.push('/ai-service')">
            <div class="ai-service-icon">
              <van-icon name="service-o" size="26" />
            </div>
            <div class="ai-service-text">
              <h3>智能客服</h3>
              <p>随时为您解答问题</p>
            </div>
            <div class="ai-service-arrow">
              <van-icon name="arrow" size="16" />
            </div>
          </div>
        </div>
      </van-sticky>
      <div class="flex flex-col main-container">
        <!-- 聊天列表 -->
        <div class="chat-list-title">
          <h2>我的聊天</h2>
        </div>
        <div class="chat-item" 
             v-for="chat in chatList" 
             :key="chat.userInfo.id"
             @click="enterChatRoom(chat)">
          <div class="relative">
          <van-image
            round
            width="50px"
            height="50px"
            :src="chat.userInfo.avatarUrl || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'"
          >
            <template v-slot:loading>
              <van-loading type="spinner" size="20" />
            </template>
          </van-image>
            <!-- 在线状态标记 -->
            <div 
              class="online-status" 
              :class="{'online': chat.isOnline, 'offline': !chat.isOnline}"
              :title="chat.isOnline ? '在线' : '离线'"
            ></div>
          </div>
          <div class="chat-info">
            <div class="chat-header">
              <div class="chat-name">
                {{ chat.userInfo.nickname }}
                <span class="online-text" v-if="chat.isOnline">在线</span>
              </div>
              <div class="chat-time">{{ formatTime(chat.lastMessageTime) }}</div>
            </div>
            <div class="chat-message">
              {{ chat.lastMessage }}
            </div>
          </div>
          <!-- 单个会话的未读数 -->
          <div class="chat-badge">
            <van-badge :content="chat.unreadCount || ''" max="99" v-if="chat.unreadCount>0"/>
          </div>
        </div>
        
        <!-- 无聊天记录时显示 -->
        <div v-if="chatList.length === 0" class="flex flex-col items-center justify-center py-[30px]">
          <van-empty description="暂无聊天记录" />
        </div>
      </div>
    </PullDownRefreshContainer>
  </div>
</template>

<script setup lang="ts" name="Message">
import { ref, onMounted, computed, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import { PullDownRefreshContainer } from "@/components/PullDownRefreshContainer";
import { useMessageStore } from "@/store/modules/message";
import { wsManager } from "@/utils/websocket";
import { useUserStore } from "@/store/modules/user";
import dayjs from "dayjs";
import type { ChatSession, MessageInfo } from "@/api/message/types";

const router = useRouter();
const messageStore = useMessageStore();
const userStore = useUserStore();

// 聊天列表
const chatList = computed(() => messageStore.chatSessions);

/**
 * 加载数据
 */
const loadData = async () => {
  if (!userStore.userInfo?.id) {
    showToast("请先登录");
    return;
  }
  await messageStore.loadChatSessions();
};

/**
 * 进入聊天室
 * @param chat 聊天会话信息
 */
const enterChatRoom = (chat: ChatSession) => {
  router.push({
    path: `/chat/${chat.userInfo.id}`,
    query: { 
      nickname: chat.userInfo.nickname, 
      avatar: chat.userInfo.avatarUrl
    }
  });
};

/**
 * 格式化时间
 * @param time 时间字符串
 * @returns 格式化后的时间
 */
const formatTime = (time: string) => {
  if (!time) return "";
  
  const now = dayjs();
  const messageTime = dayjs(time);
  
  // 如果是今天
  if (now.isSame(messageTime, 'day')) {
    return messageTime.format('HH:mm');
  }
  // 如果是昨天
  else if (now.subtract(1, 'day').isSame(messageTime, 'day')) {
    return '昨天';
  }
  // 如果是今年
  else if (now.isSame(messageTime, 'year')) {
    return messageTime.format('MM-DD');
  }
  // 其他情况
  else {
    return messageTime.format('YYYY-MM-DD');
  }
};

/**
 * 处理新消息
 * @param message 收到的消息
 */
const handleNewMessage = (message: MessageInfo) => {
  // 只处理发给当前用户的消息
  if (message.receiveUserId === userStore.userInfo?.id) {
    messageStore.receiveMessage(message);
  }
};

onMounted(() => {
  // 加载聊天列表
  loadData();
  
  // 连接WebSocket
  if (userStore.userInfo?.id) {
    wsManager.connect();
    wsManager.registerCallback(handleNewMessage);
  }
});

onUnmounted(() => {
  // 移除WebSocket消息处理函数
  wsManager.unregisterCallback(handleNewMessage);
});
</script>

<style lang="less" scoped>
.ai-service-nav {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4edf9 100%);
  padding: 16px;
  margin-bottom: 10px;
}

.ai-service-card {
  display: flex;
  align-items: center;
  background-color: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
  cursor: pointer;
  
  &:active {
    transform: scale(0.98);
  }
}

.ai-service-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background-color: #5d93fc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: white;
}

.ai-service-text {
  flex: 1;
  
  h3 {
    font-size: 16px;
    font-weight: bold;
    color: #000;
    margin: 0 0 4px 0;
  }
  
  p {
    font-size: 12px;
    color: #888;
    margin: 0;
  }
}

.ai-service-arrow {
  color: #bbb;
}

.chat-list-title {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  
  h2 {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    margin: 0;
  }
}

.chat-item {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s;
  
  &:active {
    background-color: #f9f9f9;
  }
}

.chat-info {
  flex: 1;
  margin-left: 12px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.chat-name {
  font-weight: bold;
  font-size: 14px;
  color: #000;
}

.chat-time {
  font-size: 12px;
  color: #999;
}

.chat-message {
  color: #666;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-badge {
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.online-status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.online {
  background-color: #4caf50; /* 绿色表示在线 */
}

.offline {
  background-color: #9e9e9e; /* 灰色表示离线 */
}

.online-text {
  font-size: 11px;
  color: #4caf50;
  margin-left: 4px;
  font-weight: normal;
}
</style>
