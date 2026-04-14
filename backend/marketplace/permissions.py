from rest_framework.permissions import BasePermission

class IsAdminRole(BasePermission):
    """
    Allows access only to users with the 'admin' role in their UserProfile.
    """
    def hasattr_profile(self, user):
        try:
            return hasattr(user, 'profile')
        except Exception:
            return False

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            self.hasattr_profile(request.user) and
            request.user.profile.role == 'admin'
        )
