import { defineStore } from "pinia";
import { getChatHistory, getChatSessionList, getUserInfoByUserId, getUnreadMessageCount } from "@/api/message";
import { MessageStatus, type ChatSession, type MessageInfo } from "@/api/message/types";
import { useUserStore } from "./user";
import { wsManager } from "@/utils/websocket";

export const useMessageStore = defineStore({
  id: "app-message",
  state: () => ({
    chatSessions: [] as ChatSession[], // 聊天会话列表
    currentChatId: null as number | null, // 当前选中的聊天会话ID
    chatMessages: {} as Record<number, MessageInfo[]>, // 聊天消息记录，key为会话ID
    totalUnreadCount: 0, // 总未读消息数
  }),
  actions: {
    /**
     * 加载聊天会话列表
     */
    async loadChatSessions() {
      try {
        const { data } = await getChatSessionList();
        this.chatSessions = data;
        // 计算总未读消息数
        this.totalUnreadCount = (await getUnreadMessageCount()).data;
      } catch (error) {
        console.error("加载聊天会话列表失败", error);
      }
    },
    /**
     * 加载当前用户与指定用户的聊天历史记录
     * @param targetUserId 目标用户ID
     */
    async loadChatHistory(targetUserId: number) {
      const userStore = useUserStore();
      if (!userStore.userInfo?.id) return;
      try {
        const { data } = await getChatHistory(Number(userStore.userInfo.id), targetUserId);
        this.chatMessages[targetUserId] = data;
        // 更新当前会话ID
        this.currentChatId = targetUserId;
      } catch (error) {
        console.error("加载聊天历史记录失败", error);
      }
    },
    /**
     * 发送消息
     * @param content 消息内容
     */
    async sendMessageToCurrentChat(content: string) {
      const userStore = useUserStore();
      if (!userStore.userInfo?.id || !this.currentChatId) return;
      
      const message: MessageInfo = {
        sendUserId: Number(userStore.userInfo.id),
        receiveUserId: this.currentChatId,
        content
      };
      
      try {
        // 发送消息到后端保存
        // await sendMessage(message);
        
        // 通过WebSocket发送消息
        wsManager.send(JSON.stringify(message));
        
        // 更新本地消息列表
        if (!this.chatMessages[this.currentChatId]) {
          this.chatMessages[this.currentChatId] = [];
        }
        
        // 添加时间戳
        message.createTime = new Date().toISOString();
        this.chatMessages[this.currentChatId].push(message);
        
        // 更新会话列表中的最后一条消息
        const sessionIndex = this.chatSessions.findIndex(
          session => session.userInfo.id === this.currentChatId
        );
        
        if (sessionIndex !== -1) {
          this.chatSessions[sessionIndex].lastMessage = content;
          this.chatSessions[sessionIndex].lastMessageTime = message.createTime;
          
          // 将该会话移到顶部
          const session = this.chatSessions[sessionIndex];
          this.chatSessions.splice(sessionIndex, 1);
          this.chatSessions.unshift(session);
        }
      } catch (error) {
        console.error("发送消息失败", error);
      }
    },
    /**
     * 接收新消息
     * @param message 消息内容
     */
    receiveMessage(message: MessageInfo) {
      // console.log('Store接收新消息:', message);
      const senderId = Number(message.sendUserId);
      const receiverId = Number(message.receiveUserId);
      const userStore = useUserStore();
      const currentUserId = userStore.userInfo?.id ? Number(userStore.userInfo.id) : null;
      
      // 只处理与当前用户相关的消息
      if (receiverId !== currentUserId && senderId !== currentUserId) {
        console.log('忽略与当前用户无关的消息');
        return;
      }
      
      // 确定对话的另一方ID (对方ID)
      const chatTargetId = receiverId === currentUserId ? senderId : receiverId;
      
      // 更新聊天记录
      if (!this.chatMessages[chatTargetId]) {
        this.chatMessages[chatTargetId] = [];
      }
      this.chatMessages[chatTargetId].push(message);
      
      // 查找对应的会话
      const sessionIndex = this.chatSessions.findIndex(
        session => session.userInfo.id === chatTargetId
      );
      
      if (sessionIndex !== -1) {
        // 更新现有会话
        this.chatSessions[sessionIndex].lastMessage = message.content;
        this.chatSessions[sessionIndex].lastMessageTime = message.createTime || new Date().toISOString();
        
        // 使用后端提供的unreadCount更新未读消息数
        if (message.unreadCount !== undefined) {
          // 更新会话的未读数
          this.chatSessions[sessionIndex].unreadCount = message.unreadCount;
          
          // 重新计算总未读数
          this.updateTotalUnreadCount();
        }
        
        // 将有新消息的会话移到顶部
        const session = this.chatSessions[sessionIndex];
        this.chatSessions.splice(sessionIndex, 1);
        this.chatSessions.unshift(session);
      } else {
        // 如果是新会话，需要创建会话
        this.createNewSession(chatTargetId, message);
      }
    },
    
    /**
     * 创建新的聊天会话
     * @param userId 对方用户ID
     * @param message 消息内容
     */
    async createNewSession(userId: number, message: MessageInfo) {
      try {
        // 获取对方用户信息
        const { data } = await getUserInfoByUserId(userId);
        
        // 创建新会话
        const newSession: ChatSession = {
          userInfo: {
            id: userId,
            nickname: data.nickname || `用户${userId}`,
            avatarUrl: data.avatarUrl || ''
          },
          lastMessage: message.content,
          lastMessageTime: message.createTime || new Date().toISOString(),
          unreadCount: 0,
          isOnline: true
        };
        
        // 优先使用后端提供的未读数，如果没有则根据消息状态设置
        if (message.unreadCount !== undefined) {
          newSession.unreadCount = message.unreadCount;
        } else if (message.isRead === MessageStatus.UNREAD) {
          newSession.unreadCount = 1;
        }
        
        // 将新会话添加到顶部
        this.chatSessions.unshift(newSession);
        
        // 更新总未读数
        this.updateTotalUnreadCount();
      } catch (error) {
        console.error('创建新聊天会话失败:', error);
      }
    },
    /**
     * 更新总未读消息数
     */
    updateTotalUnreadCount() {
      // 计算所有会话的未读消息总数
      this.totalUnreadCount = this.chatSessions.reduce(
        (total, session) => total + (session.unreadCount || 0), 
        0
      );
    }
  },
  persist: true
}); 