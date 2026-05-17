"""
Load test suite for GitStack API.

Run locally:
    locust -f backend/tests/load/locustfile.py --host http://localhost:8001

Run headless (CI):
    locust -f backend/tests/load/locustfile.py --host http://localhost:8001 -u 10 -r 2 -t 60s --headless
"""
from locust import HttpUser, task, between
import random


class GitStackUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def browse_solutions(self):
        self.client.get("/api/solutions")
        categories = ["crm", "email-marketing", "analytics", "chatbot", "cms"]
        self.client.get(f"/api/solutions/{random.choice(categories)}")

    @task(2)
    def search_solutions(self):
        queries = ["crm", "email marketing", "analytics", "chatbot", "project management", "invoice"]
        self.client.post("/api/ai/solution-finder", json={"query": random.choice(queries), "limit": 5})

    @task(2)
    def view_stacks(self):
        self.client.get("/api/stacks/public")

    @task(2)
    def view_tools(self):
        self.client.get("/api/tools")

    @task(1)
    def view_marketplace(self):
        self.client.get("/api/marketplace/products")

    @task(1)
    def view_stats(self):
        self.client.get("/api/stats")
