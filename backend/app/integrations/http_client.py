"""Base HTTP client with connection pooling and retry logic."""
import httpx
from typing import Optional, Dict, Any
import time


class HttpClient:
    """
    Reusable HTTP client with connection pooling and retry logic.

    Prevents creating a new client for each request, which is inefficient.
    """

    def __init__(
        self,
        base_url: str = "",
        headers: Optional[Dict[str, str]] = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        """
        Initialize HTTP client.

        Args:
            base_url: Base URL for requests
            headers: Default headers to include
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            retry_delay: Initial delay between retries (exponential backoff)
        """
        self.base_url = base_url
        self.default_headers = headers or {}
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._client: Optional[httpx.Client] = None

    def _get_client(self) -> httpx.Client:
        """Get or create httpx client with connection pooling."""
        if self._client is None:
            self._client = httpx.Client(
                base_url=self.base_url,
                timeout=self.timeout,
                headers=self.default_headers,
                follow_redirects=True,
            )
        return self._client

    def _should_retry(self, response: httpx.Response) -> bool:
        """Determine if request should be retried based on status code."""
        # Retry on rate limit, server errors, and specific client errors
        return response.status_code in (429, 500, 502, 503, 504)

    def request(
        self,
        method: str,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        json: Optional[Dict[str, Any]] = None,
        data: Optional[Any] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> httpx.Response:
        """
        Make HTTP request with retry logic.

        Args:
            method: HTTP method (GET, POST, etc.)
            url: Request URL (relative to base_url)
            headers: Additional headers
            json: JSON body
            data: Form data
            params: Query parameters

        Returns:
            HTTP response

        Raises:
            httpx.HTTPStatusError: If request fails after retries
        """
        client = self._get_client()
        merged_headers = {**self.default_headers, **(headers or {})}

        attempt = 0
        last_exception = None

        while attempt < self.max_retries:
            try:
                response = client.request(
                    method=method,
                    url=url,
                    headers=merged_headers,
                    json=json,
                    data=data,
                    params=params,
                )

                # Raise for 4xx/5xx status codes
                response.raise_for_status()
                return response

            except httpx.HTTPStatusError as e:
                last_exception = e

                if self._should_retry(e.response):
                    attempt += 1
                    if attempt < self.max_retries:
                        delay = self.retry_delay * (2 ** (attempt - 1))  # Exponential backoff
                        time.sleep(delay)
                        continue

                raise

            except (httpx.RequestError, httpx.TimeoutException) as e:
                last_exception = e
                attempt += 1
                if attempt < self.max_retries:
                    delay = self.retry_delay * (2 ** (attempt - 1))
                    time.sleep(delay)
                    continue
                raise

        raise last_exception if last_exception else Exception("Request failed")

    def get(self, url: str, **kwargs) -> httpx.Response:
        """Make GET request."""
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs) -> httpx.Response:
        """Make POST request."""
        return self.request("POST", url, **kwargs)

    def put(self, url: str, **kwargs) -> httpx.Response:
        """Make PUT request."""
        return self.request("PUT", url, **kwargs)

    def patch(self, url: str, **kwargs) -> httpx.Response:
        """Make PATCH request."""
        return self.request("PATCH", url, **kwargs)

    def delete(self, url: str, **kwargs) -> httpx.Response:
        """Make DELETE request."""
        return self.request("DELETE", url, **kwargs)

    def close(self) -> None:
        """Close the HTTP client and cleanup connections."""
        if self._client is not None:
            self._client.close()
            self._client = None

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup connections."""
        self.close()
