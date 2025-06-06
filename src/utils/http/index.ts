import axios from "axios";
import type {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse
} from "axios";
import { showToast, showFailToast } from "vant";
import { ResultEnum } from "@/enums/requestEnum";
import NProgress from "../progress";
import "vant/es/toast/style";
import { getToken, removeToken } from "@/utils/token";
import type { ResultData } from "@/utils/http/type";
import { useToLoginPage } from "@/hooks/useToLoginPage";

// 扩展AxiosRequestConfig接口
declare module "axios" {
  interface AxiosRequestConfig {
    isStreamResponse?: boolean;
  }
}

export const service: AxiosInstance = axios.create({
  // 判断环境设置不同的baseURL
  baseURL: import.meta.env.PROD ? import.meta.env.VITE_APP_BASE_URL : "/",
  timeout: 25000
});
/**
 * @description: 请求拦截器
 * @returns {*}
 */
service.interceptors.request.use(
  config => {
    if ((config as HttpConfigProps).showNProgress) {
      NProgress.start();
    }
    const token = getToken();
    if (token) {
      config.headers["access-token"] = token;
    }
    return config;
  },
  (error: AxiosError) => {
    showFailToast(error.message);
    return Promise.reject(error);
  }
);
/**
 * @description: 响应拦截器
 * @returns {*}
 */
service.interceptors.response.use(
  (response: AxiosResponse) => {
    NProgress.done();
    // 如果是流式响应，直接返回原始响应对象
    // if (response.config.responseType === 'stream' || 
    //     response.config.isStreamResponse) {
    //   return response;
    // }
    
    const { data } = response;
    // * 登陆失效
    if (ResultEnum.EXPIRE.includes(data.code)) {
      // 清除token
      removeToken();
      const useToLogin = useToLoginPage();
      useToLogin.showToLoginPageDialog();
      return Promise.reject(data);
    }

    if (data.code && data.code !== ResultEnum.SUCCESS) {
      showToast(data.message || ResultEnum.ERRMESSAGE);
      return Promise.reject(data);
    }
    return data;
  },
  (error: AxiosError) => {
    NProgress.done();
    // 处理 HTTP 网络错误
    let message = "";
    // HTTP 状态码
    const status = error.response?.status;
    switch (status) {
      case 400:
        message = "请求错误";
        break;
      case 401:
        message = "未授权，请登录";
        break;
      case 403:
        message = "拒绝访问";
        break;
      case 404:
        message = `请求地址出错: ${error.response?.config?.url}`;
        break;
      case 408:
        message = "请求超时";
        break;
      case 500:
        message = "服务器内部错误";
        break;
      case 501:
        message = "服务未实现";
        break;
      case 502:
        message = "网关错误";
        break;
      case 503:
        message = "服务不可用";
        break;
      case 504:
        message = "网关超时";
        break;
      case 505:
        message = "HTTP版本不受支持";
        break;
      default:
        message = "网络连接故障";
    }

    showFailToast(message);
    return Promise.reject(error);
  }
);

/**
 * @description: 导出封装的请求方法
 * @returns {*}
 */
interface HttpConfigProps extends AxiosRequestConfig {
  showNProgress?: boolean;
}

const http = {
  get<T>(
    url: string,
    params?: object,
    config?: HttpConfigProps
  ): Promise<ResultData<T>> {
    return service.get(url, { params, ...config });
  },

  post<T>(
    url: string,
    data?: object,
    config?: HttpConfigProps
  ): Promise<ResultData<T>> {
    return service.post(url, data, config);
  },

  put<T>(
    url: string,
    data?: object,
    config?: HttpConfigProps
  ): Promise<ResultData<T>> {
    return service.put(url, data, config);
  },

  delete<T>(
    url: string,
    data?: object,
    config?: AxiosRequestConfig
  ): Promise<ResultData<T>> {
    return service.delete(url, { data, ...config });
  },
  
  /**
   * 专门用于处理流式响应的请求方法
   * @param url 请求地址
   * @param params 请求参数
   * @param config 配置项
   * @returns 原始响应对象，可用于直接处理流数据
   */
  // stream<T = any>(
  //   url: string,
  //   params?: object,
  //   config?: HttpConfigProps
  // ): Promise<AxiosResponse<T>> {
  //   return service.get(url, { 
  //     params, 
  //     ...config,
  //     isStreamResponse: true,
  //     timeout: 60000 // 流式响应通常需要更长的超时时间
  //   });
  // }
};

export default http;
