import os
import django
from django.contrib.auth import get_user_model

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')
django.setup()

def create_admin():
    """Create superuser from environment variables (for deployment)"""
    User = get_user_model()
    username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
    email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
    password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'adminpassword')

    if not User.objects.filter(username=username).exists():
        print(f"Creating superuser {username}...")
        User.objects.create_superuser(username, email, password)
        print(f"Superuser '{username}' created successfully.")
    else:
        print(f"Superuser '{username}' already exists.")


def create_default_admin():
    """
    Create the default admin user for the graduation project.
    Credentials: admin1 / admin123, is_staff=True
    Also creates a UserProfile so the auth flow works end-to-end.
    """
    User = get_user_model()
    from marketplace.models import UserProfile
    
    username = 'admin1'
    email = 'admin1@4sale.com'
    password = 'admin123'
    
    if User.objects.filter(username=username).exists():
        user = User.objects.get(username=username)
        # Ensure is_staff is set
        if not user.is_staff:
            user.is_staff = True
            user.save(update_fields=['is_staff'])
            print(f"Updated '{username}' to is_staff=True.")
        print(f"Admin user '{username}' already exists.")
    else:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name='Admin',
            last_name='User',
        )
        user.is_staff = True
        user.save(update_fields=['is_staff'])
        print(f"Admin user '{username}' created successfully.")
    
    # Ensure UserProfile exists
    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={'city': 'Cairo', 'phone': '01000000000', 'is_verified': True}
    )
    if created:
        print(f"UserProfile created for '{username}'.")
    else:
        print(f"UserProfile already exists for '{username}'.")
    
    print(f"\n[OK] Admin login ready:")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    print(f"   is_staff: {user.is_staff}")


if __name__ == '__main__':
    try:
        create_admin()
        print("")
        create_default_admin()
    except Exception as e:
        print(f"Failed: {e}")
        import traceback
        traceback.print_exc()
