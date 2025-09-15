import requests
import sys
from datetime import datetime, timedelta
import json

class EnhancedAuthTester:
    def __init__(self, base_url="https://network-checkpoint.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.verification_token = None
        self.reset_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and not headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)

            print(f"   Response Status: {response.status_code}")
            
            try:
                response_data = response.json()
                print(f"   Response: {json.dumps(response_data, indent=2)}")
            except:
                print(f"   Response Text: {response.text}")
                response_data = {}

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        if success:
            features = response.get('features', [])
            print(f"   Available features: {features}")
        return success

    def test_google_oauth_initiation(self):
        """Test Google OAuth initiation"""
        success, response = self.run_test(
            "Google OAuth Initiation",
            "GET",
            "auth/google",
            200
        )
        if success and 'auth_url' in response:
            print(f"   OAuth URL: {response['auth_url']}")
        return success

    def test_register_underage(self):
        """Test registration with underage user (should fail)"""
        underage_date = (datetime.now() - timedelta(days=365*16)).strftime("%Y-%m-%d")
        test_user = f"underage_user_{datetime.now().strftime('%H%M%S')}"
        
        success, response = self.run_test(
            "Register Underage User (Should Fail)",
            "POST",
            "auth/register",
            400,  # Should fail with 400
            data={
                "username": test_user,
                "email": f"{test_user}@test.com",
                "password": "TestPass123!",
                "date_of_birth": underage_date
            }
        )
        return success

    def test_register_valid_age(self):
        """Test registration with valid age (18+)"""
        valid_age_date = (datetime.now() - timedelta(days=365*20)).strftime("%Y-%m-%d")
        test_user = f"valid_user_{datetime.now().strftime('%H%M%S')}"
        
        success, response = self.run_test(
            "Register Valid Age User",
            "POST",
            "auth/register",
            200,
            data={
                "username": test_user,
                "email": f"{test_user}@test.com",
                "password": "TestPass123!",
                "date_of_birth": valid_age_date
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.test_email = f"{test_user}@test.com"
            self.test_password = "TestPass123!"
            print(f"   Token obtained: {self.token[:20]}...")
            
            # Check user verification status
            user_data = response.get('user', {})
            print(f"   Age Verified: {user_data.get('age_verified', False)}")
            print(f"   Email Verified: {user_data.get('email_verified', False)}")
        
        return success

    def test_register_no_age(self):
        """Test registration without age (should work)"""
        test_user = f"no_age_user_{datetime.now().strftime('%H%M%S')}"
        
        success, response = self.run_test(
            "Register Without Age",
            "POST",
            "auth/register",
            200,
            data={
                "username": test_user,
                "email": f"{test_user}@test.com",
                "password": "TestPass123!"
            }
        )
        
        if success:
            user_data = response.get('user', {})
            print(f"   Age Verified: {user_data.get('age_verified', False)}")
        
        return success

    def test_login(self):
        """Test login with registered user"""
        if not hasattr(self, 'test_email'):
            print("❌ No test user available for login")
            return False
            
        success, response = self.run_test(
            "Login Test",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.test_email,
                "password": self.test_password
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   New token obtained: {self.token[:20]}...")
        
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.token:
            print("❌ No token available for user info test")
            return False
            
        success, response = self.run_test(
            "Get Current User Info",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            print(f"   User ID: {response.get('id')}")
            print(f"   Username: {response.get('username')}")
            print(f"   Email: {response.get('email')}")
            print(f"   Age Verified: {response.get('age_verified')}")
            print(f"   Email Verified: {response.get('email_verified')}")
        
        return success

    def test_forgot_password(self):
        """Test forgot password functionality"""
        if not hasattr(self, 'test_email'):
            print("❌ No test email available for forgot password test")
            return False
            
        success, response = self.run_test(
            "Forgot Password",
            "POST",
            "auth/forgot-password",
            200,
            data={"email": self.test_email}
        )
        
        return success

    def test_reset_password_invalid_token(self):
        """Test password reset with invalid token"""
        success, response = self.run_test(
            "Reset Password Invalid Token",
            "POST",
            "auth/reset-password",
            400,  # Should fail
            data={
                "token": "invalid_token_12345",
                "new_password": "NewPassword123!"
            }
        )
        
        return success

    def test_email_verification_invalid_token(self):
        """Test email verification with invalid token"""
        success, response = self.run_test(
            "Email Verification Invalid Token",
            "POST",
            "auth/verify-email",
            400,  # Should fail
            data={"token": "invalid_verification_token"}
        )
        
        return success

    def test_logout(self):
        """Test logout functionality"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        
        return success

    def test_protected_endpoint_without_auth(self):
        """Test accessing protected endpoint without authentication"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Protected Endpoint Without Auth",
            "GET",
            "status",
            401  # Should fail with unauthorized
        )
        
        # Restore token
        self.token = temp_token
        return success

    def test_create_status_check(self):
        """Test creating a status check (protected endpoint)"""
        if not self.token:
            print("❌ No token available for status check test")
            return False
            
        success, response = self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data={"client_name": f"Test Client {datetime.now().strftime('%H%M%S')}"}
        )
        
        return success

    def test_get_status_checks(self):
        """Test getting status checks (protected endpoint)"""
        if not self.token:
            print("❌ No token available for status checks test")
            return False
            
        success, response = self.run_test(
            "Get Status Checks",
            "GET",
            "status",
            200
        )
        
        if success:
            print(f"   Status checks count: {len(response)}")
        
        return success

def main():
    print("🚀 Starting Enhanced Authentication System Tests")
    print("=" * 60)
    
    tester = EnhancedAuthTester()
    
    # Test sequence
    test_results = []
    
    # Basic health check
    test_results.append(("Health Check", tester.test_health_check()))
    
    # Google OAuth tests
    test_results.append(("Google OAuth Initiation", tester.test_google_oauth_initiation()))
    
    # Age verification tests
    test_results.append(("Register Underage (Should Fail)", tester.test_register_underage()))
    test_results.append(("Register Valid Age", tester.test_register_valid_age()))
    test_results.append(("Register Without Age", tester.test_register_no_age()))
    
    # Authentication tests
    test_results.append(("Login", tester.test_login()))
    test_results.append(("Get Current User", tester.test_get_current_user()))
    
    # Password reset tests
    test_results.append(("Forgot Password", tester.test_forgot_password()))
    test_results.append(("Reset Password Invalid Token", tester.test_reset_password_invalid_token()))
    
    # Email verification tests
    test_results.append(("Email Verification Invalid Token", tester.test_email_verification_invalid_token()))
    
    # Protected endpoint tests
    test_results.append(("Protected Endpoint Without Auth", tester.test_protected_endpoint_without_auth()))
    test_results.append(("Create Status Check", tester.test_create_status_check()))
    test_results.append(("Get Status Checks", tester.test_get_status_checks()))
    
    # Logout test
    test_results.append(("Logout", tester.test_logout()))
    
    # Print results summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed_tests = []
    failed_tests = []
    
    for test_name, result in test_results:
        if result:
            passed_tests.append(test_name)
            print(f"✅ {test_name}")
        else:
            failed_tests.append(test_name)
            print(f"❌ {test_name}")
    
    print(f"\n📈 Overall Results: {len(passed_tests)}/{len(test_results)} tests passed")
    
    if failed_tests:
        print(f"\n🔴 Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   - {test}")
    
    if passed_tests:
        print(f"\n🟢 Passed Tests ({len(passed_tests)}):")
        for test in passed_tests:
            print(f"   - {test}")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())