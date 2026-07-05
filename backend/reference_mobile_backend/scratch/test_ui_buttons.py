from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"CONSOLE {msg.type}: {msg.text}"))
        
        # Go to login
        print("Navigating to login...")
        page.goto("http://localhost:3000/auth/login")
        
        # Fill credentials
        print("Logging in...")
        page.fill('input[name="username"]', 'admin3')
        page.fill('input[name="password"]', '12345678')
        page.click('button[type="submit"]')
        
        # Wait for navigation
        page.wait_for_timeout(3000)
        
        # Go to admin products
        print("Navigating to admin products...")
        page.goto("http://localhost:3000/admin-dashboard/products/")
        page.wait_for_timeout(3000)
        
        # Find delete or review buttons
        print("Looking for buttons...")
        
        # Dump logs so far
        for log in console_logs:
            print(log)
            
        print("Clicking the first checkmark (accept) button if exists...")
        buttons = page.locator('button[title="قبول المنتج"]').all()
        if buttons:
            print(f"Found {len(buttons)} accept buttons. Clicking first...")
            
            page.on("dialog", lambda dialog: dialog.accept()) # Accept the confirm dialog
            
            buttons[0].click()
            page.wait_for_timeout(3000)
        else:
            print("No accept buttons found. Trying delete button...")
            del_buttons = page.locator('button[title="حذف المنتج نهائياً"]').all()
            if del_buttons:
                print(f"Found {len(del_buttons)} delete buttons. Clicking first...")
                page.on("dialog", lambda dialog: dialog.accept()) # Accept the confirm dialog
                del_buttons[0].click()
                page.wait_for_timeout(3000)
        
        print("\nFinal Console Logs:")
        for log in console_logs:
            print(log)
            
        browser.close()

if __name__ == "__main__":
    run()
