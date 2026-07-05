"""
Custom DRF throttle classes for auth endpoint rate limiting.
"""
from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """5 login attempts per minute per IP."""
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    """3 registration attempts per minute per IP."""
    scope = 'register'
