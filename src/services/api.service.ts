/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { authService } from './auth.service';
import { errorHandler, StandardizedError } from '@/utils/errorHandler';
export const API_URL = 'http://localhost:4500';

const axiosInstance = axios.create({
  baseURL: API_URL,
});

interface RequestOptions {
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
}

interface ApiRequestData {
  [key: string]: any;
}

const setAuthHeader = (config: any) => {
  const sessionId = localStorage.getItem('jwtToken');
  if (sessionId) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${sessionId}`,
    };
  }
  return config;
};

// Add request interceptor to include token
axiosInstance.interceptors.request.use(setAuthHeader, (error) =>
  Promise.reject(error),
);

// Add response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Call refresh token endpoint
        const response = await apiService.get('/refresh-token');
        const { sessionId } = response.data;

        localStorage.setItem('jwtToken', sessionId);

        // Retry the original request with new token
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        authService.logout();
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

const handleResponse = async (response: Response): Promise<any> => {
  const data = await response.json();

  if (!response.ok) {
    // Handle specific error codes
    if (response.status === 409) {
      throw new StandardizedError(
        'ServerError',
        `資源已存在: ${data.error}`,
        'API_GET',
        'DATA_EXIST',
        409,
      );
    }
    throw new StandardizedError(
      'ServerError',
      `請求失敗: ${data.error}`,
      'API_GET',
      'FETCH',
      500,
    );
  }

  return data.data;
};

// Base API service
export const apiService = {
  // GET request
  get: async (endpoint: string) => {
    try {
      // Fetch
      const response = await fetch(`${API_URL}${endpoint}`);
      // Handle response
      const result = await handleResponse(response);
      return result;
    } catch (error: Error | any) {
      if (!(error instanceof StandardizedError)) {
        throw new StandardizedError(
          'ServerError',
          `獲取資料時發生預期外的錯誤: ${error.message}`,
          'API_GET',
          'EXCEPTION_ERROR',
          500,
        );
      }
      new errorHandler(error).show();
    }
  },

  // POST request
  post: async (
    endpoint: string,
    data: ApiRequestData,
    options?: RequestOptions,
  ) => {
    try {
      const headers = new Headers({
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      });
      // Fetch
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: headers,
        credentials: options?.credentials || 'omit',
        body: JSON.stringify(data),
      });
      // Handle response
      const result = await handleResponse(response);
      return result;
    } catch (error: Error | any) {
      if (!(error instanceof StandardizedError)) {
        throw new StandardizedError(
          'ServerError',
          `提交資料時發生預期外的錯誤: ${error.message}`,
          'API_POST',
          'EXCEPTION_ERROR',
          500,
        );
      }
      new errorHandler(error).show();
    }
  },

  // PATCH request
  patch: async (endpoint: string, data: Record<string, any>) => {
    try {
      // Fetch
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      // Handle response
      const result = await handleResponse(response);
      return result;
    } catch (error: Error | any) {
      if (!(error instanceof StandardizedError)) {
        throw new StandardizedError(
          'ServerError',
          `更新資料時發生預期外的錯誤: ${error.message}`,
          'API_PATCH',
          'EXCEPTION_ERROR',
          500,
        );
      }
      new errorHandler(error).show();
    }
  },
  axiosInstance,
};
