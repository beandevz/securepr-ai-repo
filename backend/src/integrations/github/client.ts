import { HttpClient } from '../http-client.js';

/**
 * Singleton GitHub HTTP client with connection pooling.
 */
export class GitHubClient {
  private static clients: Map<string, GitHubClient> = new Map();
  public readonly http: HttpClient;
  public readonly token: string;

  private constructor(token: string) {
    this.token = token;
    this.http = new HttpClient({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      timeout: 30,
      maxRetries: 3,
      retryDelay: 1.0,
    });
  }

  /** Get or create a singleton client per token. */
  static getInstance(token: string): GitHubClient {
    if (!GitHubClient.clients.has(token)) {
      GitHubClient.clients.set(token, new GitHubClient(token));
    }
    return GitHubClient.clients.get(token)!;
  }

  /** Reset all client instances (useful for testing). */
  static resetAll(): void {
    GitHubClient.clients.clear();
  }
}
