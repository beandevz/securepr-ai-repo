import httpx

class DiffFetcher:
    def __init__(self, github_token: str):
        self.github_token = github_token

    def fetch_files(self, owner: str, repo: str, pr_number: int):
        url = f'https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/files?per_page=100'
        headers = {'Authorization': f'Bearer {self.github_token}', 'Accept': 'application/vnd.github+json'}
        files = []
        with httpx.Client(timeout=30.0) as client:
            while url:
                r = client.get(url, headers=headers)
                r.raise_for_status()
                files.extend(r.json())
                link = r.headers.get('link', '')
                next_url = None
                for part in link.split(','):
                    if 'rel="next"' in part:
                        next_url = part.split(';')[0].strip().strip('<>')
                url = next_url
        return files
