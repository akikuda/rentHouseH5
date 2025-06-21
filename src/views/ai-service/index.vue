<template>
  <div class="ai-service">
    <!-- 头部导航 -->
    <van-nav-bar
      title="智能客服"
      left-arrow
      @click-left="goBack"
    >
    <template #right>
    <van-icon name="replay" size="18" @click="refreshChat" />
  </template>
    </van-nav-bar>
    
    <!-- 用户信息和会话标识 -->
    <div class="user-info-bar">
      <div class="user-id">当前用户: {{ userInfo }}</div>
      <div v-if="aiMessageStore.currentChatId" class="chat-owner">
        智能客服会话
      </div>
    </div>
    
    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <template v-if="currentMessages.length > 0">
        <div 
          v-for="(msg, index) in currentMessages" 
          :key="index"
          class="message"
        >
          <!-- 用户自己的消息 -->
          <div v-if="msg.role === 'user'" class="message-self">
            <div class="message-content user-message">
              <div v-if="msg.content" class="message-text" v-html="parseMarkdown(msg.content)"></div>
              <div v-else class="message-error">消息内容为空</div>
            </div>
            <van-image
              round
              width="40px"
              height="40px"
              :src="userStore.userInfo?.avatarUrl || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'"
              class="avatar"
            />
          </div>
          
          <!-- AI的消息 -->
          <div v-else class="message-other">
            <van-image
              round
              width="40px"
              height="40px"
              src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
              class="avatar"
            />
            <div class="message-content ai-message">
              <div v-if="msg.content" class="message-text" v-html="parseMarkdown(msg.content)"></div>
              <div v-else-if="aiMessageStore.aiStreaming && index === currentMessages.length - 1" class="message-text typing-animation">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
              </div>
              <div v-else class="message-error">消息内容为空</div>
            </div>
          </div>
        </div>
      </template>
      
      <!-- 加载中提示 -->
      <div v-if="aiMessageStore.isLoading && !aiMessageStore.aiStreaming" class="loading-container">
        <van-loading type="spinner" color="#4096ff" />
        <span>AI思考中...</span>
      </div>
      
      <!-- 无消息时显示 -->
      <div v-if="currentMessages.length === 0 && !aiMessageStore.isLoading" class="flex flex-col items-center justify-center py-[30px]">
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
        :disabled="aiMessageStore.isLoading"
      >
        <template #button>
          <van-button size="small" type="primary" :loading="aiMessageStore.isLoading" @click="sendMessage">
            发送
          </van-button>
        </template>
      </van-field>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import { useAIMessageStore } from "@/store/modules/aiMessage";
import { useUserStore } from "@/store/modules/user";
import { showToast } from "vant";
import type { AIMessage } from "@/api/message/types";
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const router = useRouter();
const aiMessageStore = useAIMessageStore();
const userStore = useUserStore();

// 消息内容
const messageContent = ref("");
// 消息列表容器
const messageListRef = ref<HTMLElement | null>(null);

/**
 * 验证并修复消息内容
 */
const validateMessages = (messages: AIMessage[]) => {
  if (!Array.isArray(messages)) return [];
  
  return messages.map(msg => {
    // 确保消息对象有正确的content和role属性
    return {
      content: msg.content || '小贝正在思考...',
      role: msg.role || 'assistant'
    };
  });
};

// 当前会话消息列表
const currentMessages = computed(() => {
  const chatId = aiMessageStore.currentChatId;
  // console.log('计算当前会话消息，会话ID:', chatId);
  
  if (!chatId || !aiMessageStore.chatHistory[chatId]) {
    return [];
  }
  
  // 添加调试日志，检查消息更新情况
  const messages = aiMessageStore.chatHistory[chatId];
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    // if (lastMessage.role === 'assistant') {
    //   console.log('AI消息内容更新:', lastMessage.content.substring(0, 30) + (lastMessage.content.length > 30 ? '...' : ''));
    // }
  }
  
  return messages;
});

// 在页面顶部添加用户信息和会话隔离提示
const userInfo = computed(() => {
  if (!userStore.userInfo?.id) return '未登录用户';
  return `${userStore.userInfo.nickname || '用户'}`;
});

/**
 * 发送消息
 */
const sendMessage = async () => {
  if (!messageContent.value.trim()) {
    return;
  }
  
  if (!userStore.userInfo?.id) {
    showToast("请先登录");
    return;
  }
  
  try {
    console.log('准备发送消息:', messageContent.value);
    
    // 保存消息内容并清空输入框
    const content = messageContent.value;
    messageContent.value = "";
    
    // 发送消息并获取回复
    const response = await aiMessageStore.sendMessageToAI(content);
    console.log('消息发送完成，收到回复:', response);
    
    // 滚动到底部
    scrollToBottom();
    
  } catch (error) {
    console.error('发送消息出错:', error);
    showToast('发送消息失败，请重试');
  }
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
 * 返回上一页
 */
const goBack = () => {
  router.back();
};

onMounted(async () => {
  if (!userStore.userInfo?.id) {
    showToast('请先登录');
    router.replace('/login');
    return;
  }
  
  // 初始化AI消息存储
  aiMessageStore.init();
  
  try {
    // 使用createNewChat获取会话ID并加载历史
    const chatId = aiMessageStore.createNewChat();
    await aiMessageStore.loadChatHistory(chatId);
    
    // 滚动到底部
    scrollToBottom();
  } catch (error) {
    showToast('加载会话失败');
  }
});

// 监听消息列表变化，自动滚动到底部
watch(() => currentMessages.value.length, () => {
  scrollToBottom();
});

/**
 * 创建新会话
 */
 const refreshChat = async () => {
  try {
    showToast('正在创建新会话...');
    const AI_CHAT_ID_KEY = 'ai_chat_user_id';
    // 生成新的会话ID
    const newChatId = 
    `chat_${userStore.userInfo?.id || 'anonymous'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 保存到localStorage，替换固定ID
    const userId = userStore.userInfo?.id || 'anonymous';
    localStorage.setItem(AI_CHAT_ID_KEY, JSON.stringify({
      userId,
      chatId: newChatId,
      timestamp: new Date().getTime()
    }));

    // 初始化新会话
    aiMessageStore.chatHistory[newChatId] = [];
    aiMessageStore.currentChatId = newChatId;
    aiMessageStore.chatIds.unshift(newChatId);
    // 清空历史记录
    aiMessageStore.chatHistory = {}
    showToast('新会话创建成功');
    // 滚动到顶部
    scrollToBottom();
  } catch (error) {
    showToast('创建新会话失败，请重试');
  }
};

// 添加 Markdown 解析函数
const parseMarkdown = (content: string) => {
  if (!content) return '';
  
  try {
    // 检查内容是否为JSON字符串（带引号的文本）
    if (content.startsWith('"') && content.endsWith('"')) {
      try {
        // 尝试解析JSON字符串
        content = JSON.parse(content);
      } catch (e) {
        // 如果解析失败，保留原始内容
        console.error('JSON解析错误:', e);
      }
    }
    
    // 使用 marked 解析 Markdown，指定async:false确保返回字符串而非Promise
    // 设置breaks: true使普通换行符转换为<br>
    // 不再提前将\n转换为<br>，让marked库正确处理Markdown语法
    const html = marked.parse(content, { 
      async: false, 
      breaks: true,
      gfm: true // 启用GitHub风格的Markdown
    }) as string;
    
    // 使用 DOMPurify 清理 HTML，防止 XSS 攻击
    return DOMPurify.sanitize(html);
  } catch (error) {
    console.error('Markdown解析错误:', error);
    // 处理失败时，至少确保换行符被处理
    return content.replace(/\n/g, '<br>');
  }
};

// 添加额外的消息监听，确保消息变化时执行滚动
watch(
  () => aiMessageStore.chatHistory[aiMessageStore.currentChatId],
  (newMessages) => {
    if (newMessages && newMessages.length > 0) {
      console.log('消息历史变化，触发滚动到底部');
      scrollToBottom();
    }
  },
  { deep: true }
);
</script>

<style lang="less" scoped>
.ai-service {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.user-info-bar {
  background-color: #f0f2f5;
  padding: 8px 12px;
  font-size: 12px;
  color: #666;
  border-bottom: 1px solid #e8e8e8;
}

.user-id {
  font-weight: bold;
}

.chat-owner {
  color: #8c8c8c;
  margin-top: 2px;
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

  // 添加 Markdown 样式
  :deep(p) {
    margin: 0.5em 0;
  }
  
  :deep(ul), :deep(ol) {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  
  :deep(li) {
    margin: 0.25em 0;
  }
  
  :deep(strong) {
    font-weight: bold;
  }
  
  :deep(em) {
    font-style: italic;
  }
  
  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 0.5em 0;
  }
  
  :deep(blockquote) {
    border-left: 4px solid #ddd;
    padding-left: 1em;
    margin: 0.5em 0;
    color: #666;
  }
  
  :deep(code) {
    background-color: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: monospace;
  }
  
  :deep(pre) {
    background-color: #f5f5f5;
    padding: 1em;
    border-radius: 5px;
    overflow-x: auto;
    
    code {
      background-color: transparent;
      padding: 0;
    }
  }
}

.message-error {
  color: #ff4d4f;
  font-size: 14px;
}

.message-input {
  padding: 10px;
  background-color: #fff;
  border-top: 1px solid #eee;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  color: #666;
  
  span {
    margin-top: 8px;
    font-size: 14px;
  }
}

/* 添加打字动画样式 */
.typing-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  min-width: 40px;
}

.typing-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #999;
  margin: 0 3px;
  animation: typing 1.4s infinite ease-in-out both;

  &:nth-child(1) {
    animation-delay: 0s;
  }
  
  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  &:nth-child(3) {
    animation-delay: 0.4s;
  }
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.6;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style> 