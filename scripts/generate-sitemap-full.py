#!/usr/bin/env python3
"""
Generate full sitemap for GitStack including all tool pages.
Run: python scripts/generate-sitemap-full.py
"""

import json
import os
import xml.etree.ElementTree as ET
from xml.dom import minidom
import urllib.request
import urllib.error

BACKEND_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://gitstack-backend.onrender.com")
SITE_URL = "https://gitstack.pro"
OUTPUT_DIR = "frontend/public"


def fetch_tools():
    """Fetch all tools from the backend API."""
    url = f"{BACKEND_URL}/api/tools?limit=20000"
    print(f"Fetching tools from {url}...")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "GitStack-Sitemap-Generator/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
            print(f"Fetched {len(data)} tools")
            return data
    except Exception as e:
        print(f"Error fetching tools: {e}")
        return []


def fetch_blog_posts():
    """Fetch blog post list from blog-data directory."""
    blog_dir = "frontend/public/blog-data"
    posts = []
    if os.path.exists(blog_dir):
        for f in os.listdir(blog_dir):
            if f.endswith(".json"):
                try:
                    with open(os.path.join(blog_dir, f), "r", encoding="utf-8") as fp:
                        post = json.load(fp)
                        posts.append({
                            "slug": post.get("slug", f.replace(".json", "")),
                            "date": post.get("date", "2026-01-01"),
                        })
                except Exception:
                    pass
    print(f"Found {len(posts)} blog posts")
    return posts


def create_sitemap(urls, filename):
    """Create a single sitemap XML file."""
    urlset = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

    for url_data in urls:
        url_elem = ET.SubElement(urlset, "url")
        loc = ET.SubElement(url_elem, "loc")
        loc.text = url_data["loc"]
        if "lastmod" in url_data:
            lastmod = ET.SubElement(url_elem, "lastmod")
            lastmod.text = url_data["lastmod"]
        changefreq = ET.SubElement(url_elem, "changefreq")
        changefreq.text = url_data.get("changefreq", "weekly")
        priority = ET.SubElement(url_elem, "priority")
        priority.text = str(url_data.get("priority", 0.5))

    # Pretty print
    rough_string = ET.tostring(urlset, encoding="unicode")
    reparsed = minidom.parseString(rough_string)
    pretty = reparsed.toprettyxml(indent="  ")
    # Remove empty lines
    lines = [line for line in pretty.split("\n") if line.strip()]
    pretty = "\n".join(lines)

    output_path = os.path.join(OUTPUT_DIR, filename)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(pretty)
    print(f"Created {output_path} with {len(urls)} URLs")
    return filename


def create_sitemap_index(sitemaps):
    """Create sitemap index file."""
    sitemapindex = ET.Element("sitemapindex", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")

    for sitemap_file in sitemaps:
        sitemap_elem = ET.SubElement(sitemapindex, "sitemap")
        loc = ET.SubElement(sitemap_elem, "loc")
        loc.text = f"{SITE_URL}/{sitemap_file}"

    rough_string = ET.tostring(sitemapindex, encoding="unicode")
    reparsed = minidom.parseString(rough_string)
    pretty = reparsed.toprettyxml(indent="  ")
    lines = [line for line in pretty.split("\n") if line.strip()]
    pretty = "\n".join(lines)

    output_path = os.path.join(OUTPUT_DIR, "sitemap.xml")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(pretty)
    print(f"Created {output_path}")


def main():
    tools = fetch_tools()
    blog_posts = fetch_blog_posts()

    # Static pages
    static_urls = [
        {"loc": f"{SITE_URL}/", "changefreq": "daily", "priority": 1.0, "lastmod": "2026-05-20"},
        {"loc": f"{SITE_URL}/tools/", "changefreq": "daily", "priority": 0.9, "lastmod": "2026-05-20"},
        {"loc": f"{SITE_URL}/marketplace/", "changefreq": "daily", "priority": 0.9, "lastmod": "2026-05-20"},
        {"loc": f"{SITE_URL}/collections/", "changefreq": "weekly", "priority": 0.7},
        {"loc": f"{SITE_URL}/repo-of-the-day/", "changefreq": "daily", "priority": 0.7},
        {"loc": f"{SITE_URL}/compare/", "changefreq": "weekly", "priority": 0.6},
        {"loc": f"{SITE_URL}/stack-generator/", "changefreq": "weekly", "priority": 0.9},
        {"loc": f"{SITE_URL}/roast-my-stack/", "changefreq": "weekly", "priority": 0.9},
        {"loc": f"{SITE_URL}/dead-tool-detector/", "changefreq": "weekly", "priority": 0.9},
        {"loc": f"{SITE_URL}/repo-translator/", "changefreq": "weekly", "priority": 0.8},
        {"loc": f"{SITE_URL}/repo-xray/", "changefreq": "weekly", "priority": 0.8},
        {"loc": f"{SITE_URL}/readme-badge/", "changefreq": "monthly", "priority": 0.7},
        {"loc": f"{SITE_URL}/idea-exists/", "changefreq": "weekly", "priority": 0.8},
        {"loc": f"{SITE_URL}/error-explainer/", "changefreq": "weekly", "priority": 0.8},
        {"loc": f"{SITE_URL}/founder-stacks/", "changefreq": "weekly", "priority": 0.8},
        {"loc": f"{SITE_URL}/solution-finder/", "changefreq": "weekly", "priority": 0.9},
        {"loc": f"{SITE_URL}/solutions/", "changefreq": "weekly", "priority": 0.8},
        {"loc": f"{SITE_URL}/about/", "changefreq": "monthly", "priority": 0.5},
        {"loc": f"{SITE_URL}/terms/", "changefreq": "yearly", "priority": 0.3},
        {"loc": f"{SITE_URL}/privacy/", "changefreq": "yearly", "priority": 0.3},
        {"loc": f"{SITE_URL}/faq/", "changefreq": "weekly", "priority": 0.8},
        {"loc": f"{SITE_URL}/blog/", "changefreq": "daily", "priority": 0.8},
    ]

    # Blog post URLs
    blog_urls = [
        {
            "loc": f"{SITE_URL}/blog/{post['slug']}/",
            "changefreq": "monthly",
            "priority": 0.7,
            "lastmod": post["date"],
        }
        for post in blog_posts
    ]

    # Tool URLs
    tool_urls = [
        {
            "loc": f"{SITE_URL}/tools/{tool.get('tool_id', tool.get('name', '').lower().replace(' ', '-'))}/",
            "changefreq": "weekly",
            "priority": 0.8,
        }
        for tool in tools
    ]

    print(f"\nTotal URLs to generate:")
    print(f"  Static: {len(static_urls)}")
    print(f"  Blog: {len(blog_urls)}")
    print(f"  Tools: {len(tool_urls)}")

    # Create sitemap files
    sitemaps = []

    # Static + blog sitemap
    static_blog_urls = static_urls + blog_urls
    sitemaps.append(create_sitemap(static_blog_urls, "sitemap-static.xml"))

    # Tool sitemap (may be large, but under 50k limit)
    if tool_urls:
        sitemaps.append(create_sitemap(tool_urls, "sitemap-tools.xml"))

    # Create sitemap index
    create_sitemap_index(sitemaps)
    print("\n[SUCCESS] Sitemap generation complete!")


if __name__ == "__main__":
    main()
