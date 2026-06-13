import requests

GITHUB_API = "https://api.github.com"

def get_commit_status(owner: str, repo: str, sha: str, token: str):
    url = f"{GITHUB_API}/repos/{owner}/{repo}/commits/{sha}/status"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json"
    }
    return requests.get(url, headers=headers).json()


def get_check_runs(owner: str, repo: str, sha: str, token: str):
    url = f"{GITHUB_API}/repos/{owner}/{repo}/commits/{sha}/check-runs"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json"
    }
    return requests.get(url, headers=headers).json()
