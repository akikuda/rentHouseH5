import http from "@/utils/http";
import { service } from "@/utils/http";
import axios from "axios";
import type { MessageInfo, ChatSession } from "./types";
// import type { UserInfoInterface } from "@/api/user/types";
// import type { StreamResponse } from "@/utils/http/type";

// 从用户API导入getUserInfoByUserId函数
import { getUserInfoByUserId } from "@/api/user";

// 重新导出getUserInfoByUserId，使其可以被message模块导入
export { getUserInfoByUserId };

/**
 * 获取当前用户总的未读消息数量
 */
export function getUnreadMessageCount() {
  return http.get<number>("/app/message/unread");
}

/**
 * 智能客服聊天 - 使用SSE连接实现流式输出
 * 
 * 注意: 前端直接使用原生EventSource连接，不再通过此API函数调用
 * 实际请求路径为: /app/ai/service，参数包括:
 * - prompt: 用户输入的内容
 * - chatId: 会话ID
 * - userId: 用户ID
 * 
 * 后端需要按照SSE规范返回数据:
 * - 数据以 'data:' 开头的行
 * - 消息以空行结束
 * - 生成完成后发送 [complete] 标记
 */
// 注释掉旧的API函数，前端将直接使用EventSource

// export function chatWithAIService(prompt: string, chatId: string, userId?: number | string) {
//   console.log('调用AI服务(SSE):', prompt, chatId, userId);
  
//   // 使用http.sse方法处理服务器发送事件，实现真正的流式输出
//   return http.stream('/app/ai/service', {
//     prompt,
//     chatId,
//     userId
//   }, {
//     timeout: 0 // SSE连接不需要设置超时
//   });
// }


/**
 * 获取智能客服会话ID列表
 * @param type 会话类型，可以包含用户ID，例如 "service/123"
 */
export function getAIChatIds(type: string) {
  return http.get(`/app/ai/history/${type}`);
}

/**
 * 获取智能客服聊天历史
 * @param chatId 会话ID
 * @param userId 用户ID，用于区分不同用户的会话
 */
export function getAIChatHistory(chatId: string, userId?: number | string) {
  // 构建请求URL
  let url = `/app/ai/history/service/${chatId}`;
  // 如果有用户ID，添加到请求参数
  const params = userId ? { userId } : {};
  
  return http.get(url, params);
}

/**
 * 有新消息时
 * @param message 消息内容
 */
// export function sendMessage(message: MessageInfo) {
//   return http.post("/app/message/send", message);
// }

/**
 * 获取两人之间的聊天记录
 * @param sendUserId 用户1ID
 * @param receiveUserId 用户2ID
 */
export function getChatHistory(sendUserId: number, receiveUserId: number) {
  return http.get<MessageInfo[]>(`/app/message/chat/history`, {
    sendUserId,
    receiveUserId
  });
}

/**
 * 获取聊天会话列表
 */
export function getChatSessionList() {
  return http.get<ChatSession[]>("/app/message/sessions");
}

/**
 * 更新用户当前查看的聊天会话ID
 * @param userId 当前用户ID
 * @param currentChatId 当前查看的会话用户ID，如果为-1表示退出聊天
 */
export function updateCurrentChatSession(userId: number, currentChatId: number) {
  return http.post("/app/message/updateCurrentChatId", {}, {
    params: {
      userId,
      currentChatId
    }
  });
} 