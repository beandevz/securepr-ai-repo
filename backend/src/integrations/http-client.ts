import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';

/**
 * Reusable HTTP client with connection pooling and retry logic.
 */
export class HttpClient {
  private client: AxiosInstance;
  private maxRetries: number;
  private retryDelay: number;

  constructor(options: {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
  } = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1.0;
    this.client = axios.create({
      baseURL: options.baseURL || '',
      headers: options.headers || {},
      timeout: (options.timeout ?? 30) * 1000,
      maxRedirects: 5,
    });
  }

  private shouldRetry(status: number): boolean {
    return [429, 500, 502, 503, 504].includes(status);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async request(method: string, url: string, options: {
    headers?: Record<string, string>;
    json?: Record<string, unknown>;
    data?: unknown;
    params?: Record<string, unknown>;
  } = {}): Promise<AxiosResponse> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.maxRetries) {
      try {
        const config: AxiosRequestConfig = {
          method: method as AxiosRequestConfig['method'],
          url,
          headers: options.headers,
          data: options.json || options.data,
          params: options.params,
        };
        const response = await this.client.request(config);
        return response;
      } catch (err) {
        const error = err as AxiosError;
        lastError = error;

        if (error.response && this.shouldRetry(error.response.status)) {
          attempt++;
          if (attempt < this.maxRetries) {
            const delay = this.retryDelay * Math.pow(2, attempt - 1) * 1000;
            await this.sleep(delay);
            continue;
          }
        } else if (!error.response) {
          // Network error or timeout
          attempt++;
          if (attempt < this.maxRetries) {
            const delay = this.retryDelay * Math.pow(2, attempt - 1) * 1000;
            await this.sleep(delay);
            continue;
          }
        }
        throw error;
      }
    }
    throw lastError || new Error('Request failed');
  }

  async get(url: string, options?: { headers?: Record<string, string>; params?: Record<string, unknown> }): Promise<AxiosResponse> {
    return this.request('GET', url, options);
  }

  async post(url: string, options?: { headers?: Record<string, string>; json?: Record<string, unknown> }): Promise<AxiosResponse> {
    return this.request('POST', url, options);
  }

  async put(url: string, options?: { headers?: Record<string, string>; json?: Record<string, unknown> }): Promise<AxiosResponse> {
    return this.request('PUT', url, options);
  }

  async patch(url: string, options?: { headers?: Record<string, string>; json?: Record<string, unknown> }): Promise<AxiosResponse> {
    return this.request('PATCH', url, options);
  }

  async delete(url: string, options?: { headers?: Record<string, string> }): Promise<AxiosResponse> {
    return this.request('DELETE', url, options);
  }
}
