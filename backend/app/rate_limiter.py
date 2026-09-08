import time
from collections import defaultdict
from fastapi import Request, HTTPException, status

class RateLimiter:
    """In-memory sliding-window rate limiter for FastAPI routes."""
    def __init__(self, requests_per_minute: int = 60, name: str = "default"):
        self.requests_per_minute = requests_per_minute
        self.name = name
        self.window_seconds = 60
        self.ip_records = defaultdict(list)

    def _clean_old_records(self, ip: str, current_time: float):
        cutoff = current_time - self.window_seconds
        self.ip_records[ip] = [t for t in self.ip_records[ip] if t > cutoff]

    def check(self, request: Request):
        # Extract client IP (handle proxies & Cloudflare headers)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        # Exclude localhost/loopback from rate limiting
        if client_ip in ("127.0.0.1", "::1", "localhost"):
            return True

        now = time.time()
        self._clean_old_records(client_ip, now)

        if len(self.ip_records[client_ip]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {self.name}. Please wait a moment before trying again.",
            )

        self.ip_records[client_ip].append(now)
        return True


class AuthRateLimiter:
    """Brute-force lockout protector for login attempts."""
    def __init__(self, max_failures: int = 5, lockout_seconds: int = 900):
        self.max_failures = max_failures
        self.lockout_seconds = lockout_seconds
        self.failure_records = defaultdict(list)
        self.lockouts = {}

    def _get_key(self, request: Request, email: str = "") -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        return f"{ip}:{email.strip().lower()}"

    def check_pre_login(self, request: Request, email: str = ""):
        key = self._get_key(request, email)
        now = time.time()

        # Check if currently locked out
        if key in self.lockouts:
            unlock_time = self.lockouts[key]
            if now < unlock_time:
                remaining_mins = int((unlock_time - now) / 60) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Account temporarily locked due to too many failed login attempts. Please try again in {remaining_mins} minutes.",
                )
            else:
                del self.lockouts[key]
                self.failure_records[key] = []

    def record_failure(self, request: Request, email: str = ""):
        key = self._get_key(request, email)
        now = time.time()
        # Clean failures older than 10 mins (600s)
        self.failure_records[key] = [t for t in self.failure_records[key] if t > now - 600]
        self.failure_records[key].append(now)

        if len(self.failure_records[key]) >= self.max_failures:
            self.lockouts[key] = now + self.lockout_seconds
            remaining_mins = int(self.lockout_seconds / 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. You are locked out for {remaining_mins} minutes for your security.",
            )

    def record_success(self, request: Request, email: str = ""):
        key = self._get_key(request, email)
        self.failure_records.pop(key, None)
        self.lockouts.pop(key, None)


# Standard limiters for endpoints
order_creation_limiter = RateLimiter(requests_per_minute=60, name="order_creation")
service_call_limiter = RateLimiter(requests_per_minute=30, name="service_calls")
general_api_limiter = RateLimiter(requests_per_minute=300, name="api")
auth_limiter = AuthRateLimiter(max_failures=5, lockout_seconds=900)

