import requests
import sys
import json
from datetime import datetime

class GitStackAPITester:
    def __init__(self, base_url="https://all-features-8.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
            
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list) and len(response_data) > 0:
                        print(f"   Response: {len(response_data)} items returned")
                    elif isinstance(response_data, dict):
                        keys = list(response_data.keys())[:3]
                        print(f"   Response keys: {keys}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")

            return success, response.json() if success and response.text else {}

        except Exception as e:
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH ENDPOINTS")
        print("="*50)
        
        self.run_test("Root endpoint", "GET", "", 200)
        self.run_test("Health check", "GET", "health", 200)

    def test_tools_endpoints(self):
        """Test tools-related endpoints"""
        print("\n" + "="*50)
        print("TESTING TOOLS ENDPOINTS")
        print("="*50)
        
        # Test getting all tools
        success, tools_data = self.run_test("Get all tools", "GET", "tools", 200)
        
        if success and tools_data:
            print(f"   Found {len(tools_data)} tools")
            
            # Test getting a specific tool
            if len(tools_data) > 0:
                tool_id = tools_data[0].get('tool_id')
                if tool_id:
                    self.run_test(f"Get tool {tool_id}", "GET", f"tools/{tool_id}", 200)
        
        # Test tools with search
        self.run_test("Search tools", "GET", "tools?search=react", 200)
        
        # Test tools with category
        self.run_test("Filter tools by category", "GET", "tools?category=UI/UX Tools", 200)
        
        # Test trending tools
        self.run_test("Get trending tools", "GET", "tools/trending/list", 200)

    def test_topics_endpoints(self):
        """Test topics-related endpoints"""
        print("\n" + "="*50)
        print("TESTING TOPICS ENDPOINTS")
        print("="*50)
        
        # Test getting all topics
        success, topics_data = self.run_test("Get all topics", "GET", "topics", 200)
        
        if success and topics_data:
            print(f"   Found {len(topics_data)} topics")
            
            # Test getting tools for a specific topic
            if len(topics_data) > 0:
                topic_id = topics_data[0].get('topic_id')
                if topic_id:
                    self.run_test(f"Get tools for topic {topic_id}", "GET", f"topics/{topic_id}/tools", 200)

    def test_collections_endpoints(self):
        """Test collections-related endpoints"""
        print("\n" + "="*50)
        print("TESTING COLLECTIONS ENDPOINTS")
        print("="*50)
        
        # Test getting all collections
        success, collections_data = self.run_test("Get all collections", "GET", "collections", 200)
        
        if success and collections_data:
            print(f"   Found {len(collections_data)} collections")
            
            # Test getting a specific collection
            if len(collections_data) > 0:
                collection_id = collections_data[0].get('collection_id')
                if collection_id:
                    self.run_test(f"Get collection {collection_id}", "GET", f"collections/{collection_id}", 200)

    def test_public_stacks_endpoints(self):
        """Test public stacks endpoints"""
        print("\n" + "="*50)
        print("TESTING PUBLIC STACKS ENDPOINTS")
        print("="*50)
        
        # Test getting public stacks
        success, stacks_data = self.run_test("Get public stacks", "GET", "stacks/public", 200)
        
        if success and stacks_data:
            print(f"   Found {len(stacks_data)} public stacks")
            
            # Test getting a specific stack
            if len(stacks_data) > 0:
                stack_id = stacks_data[0].get('stack_id')
                if stack_id:
                    self.run_test(f"Get stack {stack_id}", "GET", f"stacks/{stack_id}", 200)
                    
                    # Test copying a stack
                    self.run_test(f"Copy stack {stack_id}", "POST", f"stacks/{stack_id}/copy", 200)

    def test_ai_endpoints(self):
        """Test AI-powered endpoints"""
        print("\n" + "="*50)
        print("TESTING AI ENDPOINTS")
        print("="*50)
        
        # Test Dead Tool Detector
        dead_tool_data = {"paid_tools": "Typeform, Calendly, Mailchimp"}
        print("   Testing Dead Tool Detector (may take 10-15 seconds)...")
        success, result = self.run_test("Dead Tool Detector", "POST", "ai/dead-tool-detector", 200, dead_tool_data)
        if success:
            alternatives = result.get('alternatives', [])
            print(f"   Found {len(alternatives)} alternatives")
        
        # Test Stack Generator
        stack_data = {"idea": "I want to build a simple blog with newsletter signup"}
        print("   Testing Stack Generator (may take 10-15 seconds)...")
        success, result = self.run_test("Stack Generator", "POST", "ai/stack-generator", 200, stack_data)
        if success:
            stack = result.get('stack', [])
            print(f"   Generated stack with {len(stack)} tools")
        
        # Test Repo Translator
        repo_data = {"github_url": "https://github.com/facebook/react"}
        print("   Testing Repo Translator (may take 10-15 seconds)...")
        success, result = self.run_test("Repo Translator", "POST", "ai/repo-translator", 200, repo_data)
        if success:
            translation = result.get('translation', '')
            print(f"   Translation length: {len(translation)} characters")
        
        # Test Roast My Stack
        roast_data = {"tools": ["Notion", "Slack", "Zapier", "Airtable"]}
        print("   Testing Roast My Stack (may take 10-15 seconds)...")
        success, result = self.run_test("Roast My Stack", "POST", "ai/roast-my-stack", 200, roast_data)
        if success:
            roast = result.get('roast', '')
            print(f"   Roast length: {len(roast)} characters")

    def test_seed_endpoint(self):
        """Test database seeding"""
        print("\n" + "="*50)
        print("TESTING SEED ENDPOINT")
        print("="*50)
        
        success, result = self.run_test("Seed database", "POST", "seed", 200)
        if success:
            tools_count = result.get('tools_count', 0)
            topics_count = result.get('topics_count', 0)
            collections_count = result.get('collections_count', 0)
            print(f"   Seeded: {tools_count} tools, {topics_count} topics, {collections_count} collections")

    def test_auth_endpoints_without_auth(self):
        """Test auth endpoints that should fail without authentication"""
        print("\n" + "="*50)
        print("TESTING AUTH ENDPOINTS (WITHOUT AUTH)")
        print("="*50)
        
        # These should return 401 without authentication
        self.run_test("Get current user (no auth)", "GET", "auth/me", 401)
        self.run_test("Get my stacks (no auth)", "GET", "my-stacks", 401)
        
        # Test logout without auth (should still work)
        self.run_test("Logout (no auth)", "POST", "auth/logout", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting GitStack API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test in logical order
        self.test_health_endpoints()
        self.test_seed_endpoint()  # Seed first to ensure data exists
        self.test_tools_endpoints()
        self.test_topics_endpoints()
        self.test_collections_endpoints()
        self.test_public_stacks_endpoints()
        self.test_ai_endpoints()
        self.test_auth_endpoints_without_auth()
        
        # Print final results
        print("\n" + "="*60)
        print("FINAL RESULTS")
        print("="*60)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests ({len(self.failed_tests)}):")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['name']}")
                if 'expected' in test:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                if 'response' in test:
                    print(f"   Response: {test['response']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🎯 Success rate: {success_rate:.1f}%")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = GitStackAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())