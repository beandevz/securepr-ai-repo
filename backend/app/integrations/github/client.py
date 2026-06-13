"""Shared GitHub HTTP client with connection pooling."""
from typing import Optional
from app.integrations.http_client import HttpClient


class GitHubClient:
    """
    Singleton GitHub HTTP client with connection pooling.

    Prevents creating new httpx.Client for each GitHub API request.
    """

    _instance: Optional['GitHubClient'] = None
    _clients: dict = {}

    def __new__(cls, token: str):
        """Implement singleton per token."""
        if token not in cls._clients:
            instance = super().__new__(cls)
            instance._init(token)
            cls._clients[token] = instance
        return cls._clients[token]

    def _init(self, token: str):
        """Initialize the client."""
        self.token = token
        self._http_client = HttpClient(
            base_url="https://api.github.com",
            headers={
                'Authorization': f'Bearer {token}',
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            timeout=30.0,
            max_retries=3,
            retry_delay=1.0
        )

    @property
    def http(self) -> HttpClient:
        """Get the HTTP client instance."""
        return self._http_client

    @classmethod
    def reset_all(cls) -> None:
        """Reset all client instances (useful for testing)."""
        for client in cls._clients.values():
            client._http_client.close()
        cls._clients.clear()
