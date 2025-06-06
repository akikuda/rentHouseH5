import { useUserStore } from "@/store/modules/user";
import { showToast } from "vant";
/**
 * WebSocket连接管理类
 * 负责处理WebSocket连接的建立、消息发送和接收、连接关闭等操作
 */
export class WebSocketManager {
  ws: WebSocket | null = null; // WebSocket实例
  url: string; // 服务器地址
  reconnectAttempts: number = 0; // 重连尝试次数
  maxReconnectAttempts: number = 5; // 最大重连次数
  reconnectInterval: number = 1000; // 初始重连延迟(毫秒)
  messageCallbacks: Function[] = []; // 消息回调函数数组
  heartbeatTimer: number | null = null;
  heartbeatInterval: number = 30000; // 30秒发送一次心跳
  isReconnecting: boolean = false; // 是否正在重连

  /**
   * 构造函数
   * @param url WebSocket服务器地址(不包含用户ID)
   */
  constructor(url: string) {
    this.url = url;
  }

  /**
   * 建立WebSocket连接
   */
  connect() {
    const userStore = useUserStore();
    if (!userStore.userInfo?.id) {
      console.error('用户未登录，无法建立WebSocket连接');
      return;
    }
    // 连接WebSocket，用户ID作为路径参数
    this.ws = new WebSocket(`${this.url}/${userStore.userInfo.id}`);
    // 绑定事件
    this.ws.onopen = this.onOpen.bind(this);
    this.ws.onmessage = this.onMessage.bind(this);
    this.ws.onclose = this.onClose.bind(this);
    this.ws.onerror = this.onError.bind(this);
  }

  /**
   * WebSocket连接成功回调
   */
  onOpen() {
    console.log('WebSocket连接已建立');
    this.reconnectAttempts = 0;
    this.startHeartbeat(); // 启动心跳
  }

  /**
   * 接收消息回调
   * @param event 消息事件
   */
  onMessage(event: MessageEvent) {
    let data: any;
    try {
      data = JSON.parse(event.data);
      console.log('WebSocket收到消息:', data);
      
      // 转换为MessageInfo格式，确保消息对象格式统一
      if (data && typeof data === 'object') {
        // MessageInfo格式标准化
        const messageInfo = {
          id: data.id,
          sendUserId: Number(data.sendUserId),
          receiveUserId: Number(data.receiveUserId),
          content: data.content,
          isRead: data.isRead,
          isAi: data.isAi,
          createTime: data.createTime || new Date().toISOString(),
          unreadCount: data.unreadCount // 直接使用后端提供的unreadCount值，不设置默认值
        };
        
        // 通知所有注册的回调函数
        this.messageCallbacks.forEach(callback => callback(messageInfo));
      } else {
        console.log('收到非消息数据:', data);
        this.messageCallbacks.forEach(callback => callback(data));
      }
    } catch (e) {
      console.error('WebSocket消息解析错误:', e);
      this.messageCallbacks.forEach(callback => callback(event.data));
    }
  }

  /**
   * WebSocket连接关闭回调
   */
  onClose() {
    console.log('WebSocket连接已关闭');
    this.clearHeartbeat(); // 清除心跳
    if(!this.isReconnecting){
      this.reconnect(); // 重连
    }
  }

  /**
   * WebSocket连接错误回调
   */
  onError() {
    console.error('WebSocket连接错误');
  }

  /**
   * WebSocket重连机制
   */
  reconnect() {
    
    this.isReconnecting = true; // 标记为正在重连

    // 指数退避重连 策略 重连间隔时间从1秒开始，每次重连间隔时间翻倍，最大不超过30秒
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts), 30000);
    console.log('重连间隔时间:', delay, '重连次数:', this.reconnectAttempts);
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, delay);
    }else{
      console.error('重连次数超过最大重连次数，不再重连');
      this.isReconnecting = false; // 重置重连状态
      // 通知用户手动刷新页面
      showToast('自动重连失败，请手动刷新页面');
    }
  }

  /**
   * 发送消息
   * @param data 要发送的数据
   */
  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket发送消息:', data);
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else if(!this.isReconnecting) {
      console.error('WebSocket未连接，无法发送消息, 正在尝试重连...');
      this.reconnect();
    }
  }

  /**
   * 注册消息回调函数
   * @param callback 回调函数
   */
  registerCallback(callback: Function) {
    this.messageCallbacks.push(callback);
  }

  /**
   * 移除消息回调函数
   * @param callback 要移除的回调函数
   */
  unregisterCallback(callback: Function) {
    const index = this.messageCallbacks.indexOf(callback);
    if (index !== -1) {
      this.messageCallbacks.splice(index, 1);
    }
  }

  /**
   * 关闭WebSocket连接
   */
  disconnect() {
    this.clearHeartbeat(); // 清除心跳
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // 启动心跳机制
  startHeartbeat() {
    
    this.clearHeartbeat(); // 先清除心跳，防止重复启动心跳

    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // 发送心跳包 心跳包内容为ping
        this.ws.send(JSON.stringify({
          type: 'ping',
          userId: useUserStore().userInfo?.id?.toString()
        }));
        console.log('发送心跳包');
      }
    }, this.heartbeatInterval);
  }
  
  // 清除心跳
  clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// 创建WebSocket管理器实例，使用环境变量VITE_APP_BASE_URL
export const wsManager = new WebSocketManager(`${import.meta.env.VITE_APP_BASE_URL}/webSocket`); 