// * 请求响应参数(不包含data)
export interface Result {
  code: number;
  message: string;
  success?: boolean;
}

// * 请求响应参数(包含data)
export interface ResultData<T = any> extends Result {
  data: T;
}

/**
 * SSE事件类型定义
 */
// export interface SSEEvent {
//   data: string;
//   id?: string;
//   type?: string;
//   retry?: number;
// }

/**
 * 流式响应类型
 */
// export interface StreamResponse {
//   text: string;
//   complete: boolean;
// }
