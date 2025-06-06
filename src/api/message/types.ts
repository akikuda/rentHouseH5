import type { UserInfoInterface } from "@/api/user/types";

// 消息状态枚举
export enum MessageStatus {
  UNREAD = 0, // 未读
  READ = 1    // 已读
}

// 消息类型枚举
export enum MessageType {
  USER = 0, // 用户对话
  AI = 1    // AI对话
}

/**
 * AI消息角色枚举
 */
export enum AIMessageRole {
  USER = 'user',       // 用户
  ASSISTANT = 'assistant' // AI助手
}

/**
 * AI消息接口
 */
export interface AIMessage {
  content: string;   // 消息内容
  role: string;      // 消息角色
}

/**
 * 消息信息接口
 */
export interface MessageInfo {
  id?: number | string; // 消息ID
  sendUserId: number;   // 发送人ID
  receiveUserId: number; // 接收人ID
  content: string;      // 消息内容
  isRead?: MessageStatus; // 是否已读
  isAi?: MessageType;     // 是否AI对话
  createTime?: string;    // 发送时间
  unreadCount?: number;   // 未读消息数量（从WebSocket返回）
}

/**
 * 用户基本信息接口
 */
export interface UserInfo {
  id: number;           // 用户ID
  nickname: string;     // 用户昵称
  avatarUrl: string;    // 用户头像
}

/**
 * 聊天会话信息接口
 * id为对方用户ID
 */
export interface ChatSession {
  userInfo: UserInfoInterface;// 用户信息
  lastMessage: string;        // 最后一条消息内容
  lastMessageTime: string;    // 最后一条消息时间
  unreadCount: number;        // 未读消息数量
  isOnline: boolean;          // 是否在线,true为在线,false为离线
} 