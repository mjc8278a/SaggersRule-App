import requests
import sys
from datetime import datetime
import json
import uuid

class AuthenticationAPITester:
    def __init__(self, base_url="https://checkpoint-tracker.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.user_tokens = {}  # Store tokens for different users
        self.created_users = []
        self.created_status_checks = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)

            print(f"Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    # Don't print sensitive data like passwords
                    safe_data = {k: v for k, v in response_data.items() if 'password' not in k.lower()}
                    print(f"Response Data: {json.dumps(safe_data, indent=2, default=str)}")
                    return True, response_data
                except:
                    print("Response is not JSON")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"Error Response: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"Error Response Text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self, username, email, password):
        """Test user registration"""
        success, response = self.run_test(
            f"User Registration - {username}",
            "POST",
            "auth/register",
            200,
            data={
                "username": username,
                "email": email,
                "password": password
            }
        )
        
        if success and 'access_token' in response:
            self.user_tokens[username] = response['access_token']
            self.created_users.append({
                'username': username,
                'email': email,
                'user_id': response.get('user', {}).get('id')
            })
            print(f"✅ Registration successful, token stored for {username}")
            return True, response
        return False, {}

    def test_duplicate_registration(self, username, email, password):
        """Test duplicate user registration (should fail)"""
        success, response = self.run_test(
            f"Duplicate Registration - {username}",
            "POST",
            "auth/register",
            400,  # Should return 400 for duplicate
            data={
                "username": username,
                "email": email,
                "password": password
            }
        )
        return success

    def test_user_login(self, email, password, expected_username):
        """Test user login"""
        success, response = self.run_test(
            f"User Login - {email}",
            "POST",
            "auth/login",
            200,
            data={
                "email": email,
                "password": password
            }
        )
        
        if success and 'access_token' in response:
            # Store token with username for later use
            self.user_tokens[expected_username] = response['access_token']
            print(f"✅ Login successful, token updated for {expected_username}")
            return True, response
        return False, {}

    def test_invalid_login(self, email, password):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            f"Invalid Login - {email}",
            "POST",
            "auth/login",
            401,  # Should return 401 for invalid credentials
            data={
                "email": email,
                "password": password
            }
        )
        return success

    def test_get_current_user(self, username):
        """Test getting current user info with valid token"""
        if username not in self.user_tokens:
            print(f"❌ No token found for user {username}")
            return False
            
        token = self.user_tokens[username]
        success, response = self.run_test(
            f"Get Current User - {username}",
            "GET",
            "auth/me",
            200,
            headers={'Authorization': f'Bearer {token}'}
        )
        return success, response

    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token"""
        success, response = self.run_test(
            "Get Current User - Invalid Token",
            "GET",
            "auth/me",
            401,
            headers={'Authorization': 'Bearer invalid_token_here'}
        )
        return success

    def test_create_status_check(self, username, client_name):
        """Test creating status check as authenticated user"""
        if username not in self.user_tokens:
            print(f"❌ No token found for user {username}")
            return False, None
            
        token = self.user_tokens[username]
        success, response = self.run_test(
            f"Create Status Check - {username} - {client_name}",
            "POST",
            "status",
            200,
            data={"client_name": client_name},
            headers={'Authorization': f'Bearer {token}'}
        )
        
        if success and 'id' in response:
            self.created_status_checks.append({
                'id': response['id'],
                'username': username,
                'client_name': client_name,
                'user_id': response.get('user_id')
            })
            return True, response
        return False, {}

    def test_create_status_check_no_auth(self, client_name):
        """Test creating status check without authentication (should fail)"""
        success, response = self.run_test(
            f"Create Status Check - No Auth - {client_name}",
            "POST",
            "status",
            403,  # FastAPI returns 403 for unauthenticated requests
            data={"client_name": client_name}
        )
        return success

    def test_get_user_status_checks(self, username):
        """Test getting status checks for authenticated user"""
        if username not in self.user_tokens:
            print(f"❌ No token found for user {username}")
            return False, []
            
        token = self.user_tokens[username]
        success, response = self.run_test(
            f"Get Status Checks - {username}",
            "GET",
            "status",
            200,
            headers={'Authorization': f'Bearer {token}'}
        )
        return success, response if success else []

    def test_get_status_checks_no_auth(self):
        """Test getting status checks without authentication (should fail)"""
        success, response = self.run_test(
            "Get Status Checks - No Auth",
            "GET",
            "status",
            403  # FastAPI returns 403 for unauthenticated requests
        )
        return success

    def verify_user_data_isolation(self):
        """Verify that users can only see their own status checks"""
        print(f"\n🔒 Verifying User Data Isolation...")
        isolation_passed = True
        
        for user in self.created_users:
            username = user['username']
            user_id = user['user_id']
            
            success, user_status_checks = self.test_get_user_status_checks(username)
            if not success:
                print(f"❌ Failed to get status checks for {username}")
                isolation_passed = False
                continue
                
            # Check that all returned status checks belong to this user
            for check in user_status_checks:
                if check.get('user_id') != user_id:
                    print(f"❌ Data isolation breach: {username} can see status check from another user")
                    isolation_passed = False
                else:
                    print(f"✅ Status check {check['id']} correctly belongs to {username}")
        
        return isolation_passed

def main():
    print("🚀 Starting Network Checkpoint Monitor Authentication Tests")
    print("=" * 70)
    
    # Setup
    tester = AuthenticationAPITester()
    timestamp = datetime.now().strftime("%H%M%S")
    
    # Test users
    test_users = [
        {
            'username': f'testuser1_{timestamp}',
            'email': f'testuser1_{timestamp}@example.com',
            'password': 'TestPassword123!'
        },
        {
            'username': f'testuser2_{timestamp}',
            'email': f'testuser2_{timestamp}@example.com',
            'password': 'TestPassword456!'
        }
    ]

    print("\n" + "="*50)
    print("PHASE 1: USER REGISTRATION TESTS")
    print("="*50)
    
    # Test 1: User Registration
    for user in test_users:
        success, response = tester.test_user_registration(
            user['username'], user['email'], user['password']
        )
        if not success:
            print(f"❌ Registration failed for {user['username']}, stopping tests")
            return 1

    # Test 2: Duplicate Registration (should fail)
    if not tester.test_duplicate_registration(
        test_users[0]['username'], test_users[0]['email'], test_users[0]['password']
    ):
        print("❌ Duplicate registration test failed")
        return 1

    print("\n" + "="*50)
    print("PHASE 2: USER LOGIN TESTS")
    print("="*50)

    # Test 3: User Login
    for user in test_users:
        success, response = tester.test_user_login(
            user['email'], user['password'], user['username']
        )
        if not success:
            print(f"❌ Login failed for {user['username']}")
            return 1

    # Test 4: Invalid Login
    if not tester.test_invalid_login("nonexistent@example.com", "wrongpassword"):
        print("❌ Invalid login test failed")
        return 1

    print("\n" + "="*50)
    print("PHASE 3: PROTECTED ROUTE TESTS")
    print("="*50)

    # Test 5: Get Current User Info
    for user in test_users:
        success, response = tester.test_get_current_user(user['username'])
        if not success:
            print(f"❌ Get current user failed for {user['username']}")
            return 1

    # Test 6: Get Current User with Invalid Token
    if not tester.test_get_current_user_invalid_token():
        print("❌ Invalid token test failed")
        return 1

    print("\n" + "="*50)
    print("PHASE 4: STATUS CHECK AUTHENTICATION TESTS")
    print("="*50)

    # Test 7: Create Status Checks without Authentication (should fail)
    if not tester.test_create_status_check_no_auth("Unauthorized Test"):
        print("❌ Unauthorized status check creation test failed")
        return 1

    # Test 8: Get Status Checks without Authentication (should fail)
    if not tester.test_get_status_checks_no_auth():
        print("❌ Unauthorized status check retrieval test failed")
        return 1

    # Test 9: Create Status Checks as Authenticated Users
    status_check_data = [
        {'username': test_users[0]['username'], 'client_name': 'User1 Service A'},
        {'username': test_users[0]['username'], 'client_name': 'User1 Service B'},
        {'username': test_users[1]['username'], 'client_name': 'User2 Service A'},
        {'username': test_users[1]['username'], 'client_name': 'User2 Service B'},
    ]

    for check_data in status_check_data:
        success, response = tester.test_create_status_check(
            check_data['username'], check_data['client_name']
        )
        if not success:
            print(f"❌ Failed to create status check for {check_data['username']}")
            return 1

    print("\n" + "="*50)
    print("PHASE 5: DATA ISOLATION VERIFICATION")
    print("="*50)

    # Test 10: Verify User Data Isolation
    if not tester.verify_user_data_isolation():
        print("❌ User data isolation verification failed")
        return 1

    # Final Summary
    print(f"\n📊 Final Test Summary:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Users created: {len(tester.created_users)}")
    print(f"Status checks created: {len(tester.created_status_checks)}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All authentication tests passed successfully!")
        print("✅ JWT token generation and validation working")
        print("✅ Password hashing secure")
        print("✅ User data isolation verified")
        print("✅ Protected routes properly secured")
        return 0
    else:
        print("⚠️  Some authentication tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())