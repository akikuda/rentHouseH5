import { defineStore } from "pinia";
import { getAIChatHistory, getAIChatIds } from "@/api/message";
import { AIMessageRole, type AIMessage } from "@/api/message/types";
import { v4 as uuidv4 } from 'uuid';
import { useUserStore } from "@/store/modules/user";
import type { ResultData } from "@/utils/http/type";
// import { chatWithAIService } from "@/api/message";

// 本地存储键名
const AI_CHAT_ID_KEY = 'ai_chat_user_id';

/**
 * 验证消息格式
 * @param msg 消息对象
 */
function validateMessage(msg: any): AIMessage {
  return {
    content: typeof msg.content === 'string' ? msg.content : '小贝正在思考...',
    role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : AIMessageRole.ASSISTANT
  };
}

/**
 * 获取用户固定会话ID
 * 默认的固定会话ID为user_${userId}_fixed
 */
function getUserFixedChatId(): string {
  const userStore = useUserStore();
  const userId = userStore.userInfo?.id || 'anonymous';
  
  // 尝试从localStorage获取
  try {
    const storedData = localStorage.getItem(AI_CHAT_ID_KEY);
    if (storedData) {
      const data = JSON.parse(storedData);
      // 如果是当前用户的会话ID，直接返回
      if (data.userId === userId && data.chatId) {
        return data.chatId;
      }
    }
  } catch (e) {
    console.error('读取会话ID失败', e);
  }
  
  // 如果没有或不匹配，创建一个新的固定ID
  const fixedChatId = `user_${userId}_fixed`;
  
  // 保存到localStorage
  try {
    localStorage.setItem(AI_CHAT_ID_KEY, JSON.stringify({
      userId,
      chatId: fixedChatId,
      timestamp: new Date().getTime()
    }));
  } catch (e) {
    console.error('保存会话ID失败', e);
  }
  
  return fixedChatId;
}

export const useAIMessageStore = defineStore({
  id: "app-ai-message",
  state: () => ({
    currentChatId: "",           // 当前会话ID
    chatHistory: {} as Record<string, AIMessage[]>, // 聊天历史记录，key为会话ID
    chatIds: [] as string[],     // 会话ID列表
    isLoading: false,            // 是否正在加载
    aiStreaming: false,          // AI是否正在流式回复中
    aiCurrentResponse: ""        // AI当前正在生成的回复内容
  }),
  actions: {
    /**
     * 初始化状态
     */
    init() {
      // 验证加载的会话历史记录
      for (const chatId in this.chatHistory) {
        if (Array.isArray(this.chatHistory[chatId])) {
          // 验证并修复每条消息
          this.chatHistory[chatId] = this.chatHistory[chatId].map(validateMessage);
        } else {
          // 如果历史记录不是数组，重置为空数组
          this.chatHistory[chatId] = [];
        }
      }
      
      // 确保chatIds是数组
      if (!Array.isArray(this.chatIds)) {
        this.chatIds = [];
      }
      
      // 获取或创建用户固定会话ID
      const fixedChatId = getUserFixedChatId();
      
      // 设置为当前会话
      this.currentChatId = fixedChatId;
      
      // 确保会话ID在列表中
      if (!this.chatIds.includes(fixedChatId)) {
        this.chatIds.unshift(fixedChatId);
      }
      
      console.log('初始化AIMessageStore完成:', {
        currentChatId: this.currentChatId,
        chatHistoryCount: Object.keys(this.chatHistory).length,
        chatIds: this.chatIds
      });
    },
    
    /**
     * 创建新会话或获取现有会话
     */
    createNewChat() {
      // 使用固定会话ID
      const fixedChatId = getUserFixedChatId();
      
      // 初始化会话历史（如果不存在）
      if (!this.chatHistory[fixedChatId]) {
        this.chatHistory[fixedChatId] = [];
      }
      
      // 设置为当前会话
      this.currentChatId = fixedChatId;
      
      // 确保会话ID在列表中
      if (!this.chatIds.includes(fixedChatId)) {
        this.chatIds.unshift(fixedChatId);
      }
      
      return fixedChatId;
    },
    
    /**
     * 加载会话ID列表
     */
    async loadChatIds() {
      try {
        // 获取用户ID
        const userStore = useUserStore();
        const userId = userStore.userInfo?.id;
        
        // 使用用户ID获取会话列表
        const response = await getAIChatIds(`service${userId ? `/${userId}` : ''}`);
        
        // 处理统一格式返回
        let chatIds: string[] = [];
        const responseData = response.data as ResultData<string[]>;
        if (responseData && responseData.code === 200) {
          chatIds = Array.isArray(responseData.data) ? responseData.data : [];
        } else {
          console.error('加载会话ID列表失败:', response.data);
          chatIds = [];
        }
        
        // 获取固定会话ID
        const fixedChatId = getUserFixedChatId();
        
        // 如果固定会话ID不在列表中，添加到列表
        if (!chatIds.includes(fixedChatId)) {
          chatIds.unshift(fixedChatId);
        }
        
        this.chatIds = chatIds;
        return this.chatIds;
      } catch (error) {
        console.error("加载会话ID列表失败", error);
        
        // 设置为空数组，避免undefined
        this.chatIds = [];
        
        // 至少包含固定会话ID
        const fixedChatId = getUserFixedChatId();
        this.chatIds.push(fixedChatId);
        
        return this.chatIds;
      }
    },
    
    /**
     * 加载会话历史
     * @param chatId 会话ID
     */
    async loadChatHistory(chatId: string) {
      // 如果未提供chatId，使用固定会话ID
      if (!chatId) {
        chatId = getUserFixedChatId();
      }
      
      // 先检查本地是否有缓存
      if (this.chatHistory[chatId] && this.chatHistory[chatId].length > 0) {
        console.log('使用本地缓存的聊天记录:', this.chatHistory[chatId]);
        // 设置当前会话ID
        this.currentChatId = chatId;
        return this.chatHistory[chatId];
      }
      
      try {
        // 获取用户ID
        const userStore = useUserStore();
        const userId = userStore.userInfo?.id;
        
        // 使用用户ID和会话ID获取历史记录
        const response = await getAIChatHistory(chatId, userId);
        console.log('从服务器加载聊天记录:', response.data);
        
        let chatHistory: any[] = [];
        
        // 处理统一格式返回
        const responseData = response.data as ResultData<any[]>;
        if (responseData && responseData.code === 200) {
          chatHistory = Array.isArray(responseData.data) ? responseData.data : [];
        } else {
          console.error('加载会话历史失败:', response.data);
          chatHistory = [];
        }
        
        // 验证每条消息的格式
        const validatedHistory = chatHistory.map(msg => {
          // 确保每个消息对象有content和role属性
          return {
            content: msg.content || '',
            role: msg.role || AIMessageRole.ASSISTANT
          };
        });
        
        console.log('格式化后的聊天记录:', validatedHistory);
        this.chatHistory[chatId] = validatedHistory;
        
        // 设置当前会话ID
        this.currentChatId = chatId;
        
        return this.chatHistory[chatId];
      } catch (error) {
        console.error("从服务器加载会话历史失败", error);
        // 初始化为空数组
        this.chatHistory[chatId] = [];
        return [];
      }
    },
    
    /**
     * 发送消息给AI并获取回复
     * @param content 消息内容
     */
    async sendMessageToAI(content: string) {

      // 如果没有当前会话ID，创建或获取固定会话
      if (!this.currentChatId) {
        this.createNewChat();
      }
      
      try {
        // 设置加载状态
        this.isLoading = true;
        this.aiStreaming = true;
        this.aiCurrentResponse = "";
        
        // 添加用户消息到历史记录
        const userMessage: AIMessage = {
          content,
          role: AIMessageRole.USER
        };
        
        if (!this.chatHistory[this.currentChatId]) {
          this.chatHistory[this.currentChatId] = [];
        }
        
        this.chatHistory[this.currentChatId].push(userMessage);
        
        // 获取用户ID
        const userStore = useUserStore();
        const userId = userStore.userInfo?.id;
        
        // 初始化一个空的AI回复，立即在界面上显示
        const aiMessage: AIMessage = {
          content: "",
          role: AIMessageRole.ASSISTANT
        };
        this.chatHistory[this.currentChatId].push(aiMessage);
        
        // 发送消息到后端
        console.log('发送消息到后端:', content, this.currentChatId, userId);
        
        // 获取服务器请求URL和参数
        const url = '/app/ai/service';
        const params = {
          prompt: content,
          chatId: this.currentChatId,
          userId
        };
        
        // 手动创建EventSource
        // 构建URL参数
        const queryParams = new URLSearchParams();
        for (const key in params) {
          // @ts-ignore
          queryParams.append(key, params[key]);
        }
        
        // 获取完整URL 请求路径/app/ai/service?prompt=content&chatId=chatId&userId=userId
        const baseURL = import.meta.env.PROD ? import.meta.env.VITE_APP_BASE_URL : "";
        const fullUrl = `${baseURL}${url}?${queryParams.toString()}`;
        
        console.log('创建SSE连接:', fullUrl);
        
        // 创建EventSource
        const eventSource = new EventSource(fullUrl);
        let streamText = '';
        
        // 监听message事件
        eventSource.onmessage = (event) => {
          const chunk = event.data;
          // 检查是否是结束标志
          if (chunk.includes('[complete]')) {
            // 移除结束标志
            const finalText = streamText + chunk.replace('[complete]', '');
            // 更新AI消息内容
            const lastMessageIndex = this.chatHistory[this.currentChatId].length - 1;
            if (lastMessageIndex >= 0) {
              this.chatHistory[this.currentChatId][lastMessageIndex].content = finalText;
            }
            // 关闭SSE连接
            console.log('SSE数据流接收完成');
            this.isLoading = false;
            this.aiStreaming = false;
            eventSource.close();
            
            return;
          }
          
          // 累积文本内容
          streamText += chunk;
          
          // 实时更新AI回复内容
          const lastMessageIndex = this.chatHistory[this.currentChatId].length - 1;
          if (lastMessageIndex >= 0) {
            this.chatHistory[this.currentChatId][lastMessageIndex].content = streamText;
          }
        };
        
        // 监听错误事件
        eventSource.onerror = (error) => {
          console.error('SSE连接错误:', error);
          
          // 添加错误消息
          const errorMessage: AIMessage = {
            content: "抱歉，AI回复过程中出现错误，请稍后再试。",
            role: AIMessageRole.ASSISTANT
          };
          
          // 更新最后一条消息
          const lastIndex = this.chatHistory[this.currentChatId].length - 1;
          if (lastIndex >= 0 && this.chatHistory[this.currentChatId][lastIndex].role === AIMessageRole.ASSISTANT) {
            this.chatHistory[this.currentChatId][lastIndex] = errorMessage;
          }
          
          // 重置加载状态并关闭SSE连接
          this.isLoading = false;
          this.aiStreaming = false;
          eventSource.close();
        };
        
        // 返回最后更新的消息
        const lastMessageIndex = this.chatHistory[this.currentChatId].length - 1;
        return this.chatHistory[this.currentChatId][lastMessageIndex];
      } catch (error) {
        console.error("发送消息失败", error);
        
        // 添加错误消息
        const errorMessage: AIMessage = {
          content: "抱歉，我遇到了一些问题，请稍后再试。",
          role: AIMessageRole.ASSISTANT
        };
        
        if (!this.chatHistory[this.currentChatId]) {
          this.chatHistory[this.currentChatId] = [];
        }
        
        // 如果已经有一个空的AI消息（刚创建的），就更新它
        const lastIndex = this.chatHistory[this.currentChatId].length - 1;
        if (lastIndex >= 0 && this.chatHistory[this.currentChatId][lastIndex].role === AIMessageRole.ASSISTANT) {
          this.chatHistory[this.currentChatId][lastIndex] = errorMessage;
        } else {
          // 否则添加一个新的错误消息
          this.chatHistory[this.currentChatId].push(errorMessage);
        }
        
        return errorMessage;
      } finally {
        // 重置加载状态，注意：在SSE处理中，状态会在数据接收完毕时重置
        // 这里仅作为兜底措施
        if (this.isLoading) {
          setTimeout(() => {
            // 如果5秒后仍然在加载状态，强制重置
            if (this.isLoading) {
              this.isLoading = false;
              this.aiStreaming = false;
              console.log('强制重置加载状态');
            }
          }, 5000);
        }
      }
    },
    
    /**
     * 切换会话
     * @param chatId 会话ID
     */
    async switchChat(chatId: string) {
      if (!chatId) {
        chatId = getUserFixedChatId();
      }
      
      // 如果会话历史不存在，加载会话历史
      if (!this.chatHistory[chatId]) {
        await this.loadChatHistory(chatId);
      } else {
        console.log('使用已加载的会话历史:', this.chatHistory[chatId]);
        // 否则只更新当前会话ID
        this.currentChatId = chatId;
      }
    }
  },
  persist: true
});