import requests
import sys
from datetime import datetime
import json

class NetworkCheckpointAPITester:
    def __init__(self, base_url="https://network-checkpoint.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_status_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            print(f"Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response Data: {json.dumps(response_data, indent=2)}")
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

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root Endpoint",
            "GET",
            "api/",
            200
        )
        return success

    def test_get_status_checks_empty(self):
        """Test getting status checks (might be empty initially)"""
        success, response = self.run_test(
            "Get Status Checks (Initial)",
            "GET",
            "api/status",
            200
        )
        if success:
            print(f"Found {len(response)} existing status checks")
        return success

    def test_create_status_check(self, client_name):
        """Create a status check"""
        success, response = self.run_test(
            f"Create Status Check: {client_name}",
            "POST",
            "api/status",
            200,  # FastAPI typically returns 200 for successful POST, not 201
            data={"client_name": client_name}
        )
        if success and 'id' in response:
            self.created_status_ids.append(response['id'])
            print(f"Created status check with ID: {response['id']}")
            return response['id']
        return None

    def test_get_status_checks_with_data(self):
        """Test getting status checks after creating some"""
        success, response = self.run_test(
            "Get Status Checks (With Data)",
            "GET",
            "api/status",
            200
        )
        if success:
            print(f"Found {len(response)} status checks after creation")
            for check in response:
                print(f"  - {check.get('client_name', 'Unknown')} (ID: {check.get('id', 'Unknown')})")
        return success, response

def main():
    print("🚀 Starting Network Checkpoint Monitor API Tests")
    print("=" * 60)
    
    # Setup
    tester = NetworkCheckpointAPITester()
    
    # Test 1: Root endpoint
    if not tester.test_root_endpoint():
        print("❌ Root endpoint failed, stopping tests")
        return 1

    # Test 2: Get initial status checks
    if not tester.test_get_status_checks_empty():
        print("❌ Get status checks failed, stopping tests")
        return 1

    # Test 3: Create multiple status checks
    test_clients = [
        "Port 3200 Connection Test",
        "Backend API Test",
        "Database Connection Test"
    ]
    
    created_count = 0
    for client_name in test_clients:
        status_id = tester.test_create_status_check(client_name)
        if status_id:
            created_count += 1
        else:
            print(f"❌ Failed to create status check for {client_name}")

    if created_count == 0:
        print("❌ No status checks were created successfully")
        return 1

    # Test 4: Verify created status checks appear in GET request
    success, status_checks = tester.test_get_status_checks_with_data()
    if not success:
        print("❌ Failed to retrieve status checks after creation")
        return 1

    # Verify our created status checks are in the response
    found_our_checks = 0
    for created_id in tester.created_status_ids:
        for check in status_checks:
            if check.get('id') == created_id:
                found_our_checks += 1
                break

    print(f"\n📊 Test Summary:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Status checks created: {created_count}")
    print(f"Status checks found in GET: {found_our_checks}/{len(tester.created_status_ids)}")
    
    if tester.tests_passed == tester.tests_run and found_our_checks == len(tester.created_status_ids):
        print("🎉 All tests passed successfully!")
        return 0
    else:
        print("⚠️  Some tests failed or data inconsistency detected")
        return 1

if __name__ == "__main__":
    sys.exit(main())