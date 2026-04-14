import os
import sys
import subprocess

def run_command(command, cwd=None):
    print(f"\nRunning: {command}")
    result = subprocess.run(command, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"Error executing: {command}")
        sys.exit(1)

def main():
    # Detect the root and backend directories
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, 'backend')
    
    if not os.path.exists(backend_dir):
        print(f"Could not find backend directory at {backend_dir}")
        sys.exit(1)
    
    # Path setup based on exactly where python and pip exist in the Virtual Environment
    if os.name == 'nt':
        python_exe = os.path.join('venv', 'Scripts', 'python.exe')
        pip_exe = os.path.join('venv', 'Scripts', 'pip.exe')
    else:
        python_exe = os.path.join('venv', 'bin', 'python')
        pip_exe = os.path.join('venv', 'bin', 'pip')
    
    # 1. Ensure venv exists
    venv_path = os.path.join(backend_dir, 'venv')
    if not os.path.exists(venv_path):
        print("\nCreating virtual environment...")
        run_command(f"{sys.executable} -m venv venv", cwd=backend_dir)
        
    # 2. Install requirements
    print("\nInstalling requirements...")
    run_command(f"{pip_exe} install -r requirements.txt", cwd=backend_dir)
    
    # 3. Makemigrations and Migrate
    print("\nRunning makemigrations and migrate...")
    run_command(f"{python_exe} manage.py makemigrations", cwd=backend_dir)
    run_command(f"{python_exe} manage.py migrate", cwd=backend_dir)
    
    # 4. Programmatically create superuser 
    print("\nProvisioning master admin account...")
    script_content = """
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
email = 'admin@admin.com'
password = 'admin123'
role = 'ADMIN'

try:
    if not User.objects.filter(email=email).exists():
        # Step 1: Try creating with the 'role' arg (for custom managers using kwargs)
        try:
            user = User.objects.create_superuser(email=email, password=password, role=role)
        except TypeError as e:
            if 'username' in str(e):
                # Fallback if the user model manager strictly requires a username alongside email
                try:
                    user = User.objects.create_superuser(username=email.split('@')[0], email=email, password=password, role=role)
                except TypeError:
                    user = User.objects.create_superuser(username=email.split('@')[0], email=email, password=password)
            else:
                # Step 2: Fallback if create_superuser only accepts email and password strictly
                user = User.objects.create_superuser(email=email, password=password)
        
        # Ensure role is set manually if create_superuser ignored it
        if hasattr(user, 'role') and getattr(user, 'role', None) != role:
            user.role = role
            user.save()
        if hasattr(user, 'is_staff'):
            user.is_staff = True
            user.save()
        print(f'Superuser created successfully! [{email}]')
    else:
        print(f'Superuser [{email}] already exists in the database. Skipping creation.')
        
except Exception as e:
    print(f"Error creating superuser: {e}")
"""

    script_path = os.path.join(backend_dir, 'tmp_create_superuser.py')
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    # Run the dynamic ORM script that ensures the Superuser is generated correctly
    run_command(f"{python_exe} tmp_create_superuser.py", cwd=backend_dir)
    
    # Cleanup the temp script file immediately afterward
    if os.path.exists(script_path):
        os.remove(script_path)
    
    print("\nProject setup complete! You can now start the server and log in with admin@admin.com / admin123")

if __name__ == '__main__':
    main()
