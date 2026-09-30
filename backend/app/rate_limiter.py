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


class SlidingWindowRateLimiter:
    """In-memory sliding-window rate limiter based on client IP.

    Supports:
    1. Pre-request checking & recording (e.g., max 10 registration attempts per minute per IP).
    2. Failed attempt tracking & lockout (e.g., max 10 failed login attempts per minute per IP).
    """
    def __init__(self, max_attempts: int = 10, window_seconds: int = 60, name: str = "rate_limit"):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.name = name
        self.records = defaultdict(list)

    @staticmethod
    def get_client_ip(request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        client = getattr(request, "client", None)
        if client and hasattr(client, "host"):
            return client.host
        return "127.0.0.1"

    def _get_active_timestamps(self, ip: str, now: float) -> list:
        cutoff = now - self.window_seconds
        active = [t for t in self.records[ip] if t > cutoff]
        self.records[ip] = active
        return active

    def check(self, request: Request):
        """Check and record an attempt. Used for sensitive request-rate limited endpoints like registration."""
        ip = self.get_client_ip(request)
        now = time.time()
        active = self._get_active_timestamps(ip, now)
        if len(active) >= self.max_attempts:
            oldest = active[0]
            retry_after = max(1, int(self.window_seconds - (now - oldest)))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests for {self.name}. Rate limit exceeded. Please wait {retry_after} seconds before trying again.",
                headers={"Retry-After": str(retry_after)},
            )
        self.records[ip].append(now)

    def check_pre_attempt(self, request: Request):
        """Check if IP is currently blocked due to exceeding max failed attempts in sliding window."""
        ip = self.get_client_ip(request)
        now = time.time()
        active = self._get_active_timestamps(ip, now)
        if len(active) >= self.max_attempts:
            oldest = active[0]
            retry_after = max(1, int(self.window_seconds - (now - oldest)))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts for {self.name}. Rate limit exceeded. Please wait {retry_after} seconds before trying again.",
                headers={"Retry-After": str(retry_after)},
            )

    def record_failure(self, request: Request):
        """Record a failed attempt for client IP and raise 429 if threshold is reached."""
        ip = self.get_client_ip(request)
        now = time.time()
        active = self._get_active_timestamps(ip, now)
        self.records[ip].append(now)
        if len(self.records[ip]) >= self.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts for {self.name}. Rate limit reached ({self.max_attempts} attempts/minute). Please wait {self.window_seconds} seconds before trying again.",
                headers={"Retry-After": str(self.window_seconds)},
            )

    def record_success(self, request: Request):
        """Reset failed attempt records on successful authentication."""
        ip = self.get_client_ip(request)
        self.records.pop(ip, None)


# Standard limiters for endpoints
order_creation_limiter = RateLimiter(requests_per_minute=60, name="order_creation")
service_call_limiter = RateLimiter(requests_per_minute=30, name="service_calls")
general_api_limiter = RateLimiter(requests_per_minute=300, name="api")
auth_limiter = AuthRateLimiter(max_failures=5, lockout_seconds=900)

# Sensitive endpoint sliding window rate limiters (max 10 attempts/min per IP)
auth_login_limiter = SlidingWindowRateLimiter(max_attempts=10, window_seconds=60, name="auth_login")
customer_login_limiter = SlidingWindowRateLimiter(max_attempts=10, window_seconds=60, name="customer_login")
customer_register_limiter = SlidingWindowRateLimiter(max_attempts=10, window_seconds=60, name="customer_register")

