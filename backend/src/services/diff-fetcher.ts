import axios, { AxiosResponse } from 'axios';

/**
 * Fetches PR files from GitHub API with pagination support.
 */
export class DiffFetcher {
  private githubToken: string;

  constructor(githubToken: string) {
    this.githubToken = githubToken;
  }

  async fetchFiles(owner: string, repo: string, prNumber: number): Promise<Record<string, unknown>[]> {
    let url: string | null = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`;
    const headers = {
      'Authorization': `Bearer ${this.githubToken}`,
      'Accept': 'application/vnd.github+json',
    };
    const files: Record<string, unknown>[] = [];

    while (url) {
      const response: AxiosResponse = await axios.get(url, { headers, timeout: 30000 });
      files.push(...(response.data as Record<string, unknown>[]));

      // Parse Link header for pagination
      const linkHeader: string = (response.headers['link'] as string) || '';
      let nextUrl: string | null = null;
      for (const part of linkHeader.split(',')) {
        if (part.includes('rel="next"')) {
          const match: RegExpMatchArray | null = part.match(/<([^>]+)>/);
          if (match) {
            nextUrl = match[1];
          }
        }
      }
      url = nextUrl;
    }

    return files;
  }
}
