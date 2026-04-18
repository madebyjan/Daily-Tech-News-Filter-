"""
Investor Signal – Daily News Filter for Early-stage VCs
--------------------------------------------------------
Aggregates news from RSS feeds + Hacker News,
then uses Claude to pick the top 2-3 stories.

Setup:
    pip install anthropic feedparser requests
    export ANTHROPIC_API_KEY=your_key_here
"""

import os
import json
import feedparser
import requests
from datetime import datetime, timezone, timedelta
import anthropic

# ── Sources ──────────────────────────────────────────────────────────────────

RSS_FEEDS = {
    "TechCrunch Startups": "https://techcrunch.com/category/startups/feed/",
    "TechCrunch Venture":  "https://techcrunch.com/category/venture/feed/",
    "Axios Pro Rata":      "https://api.axios.com/feed/",
}

HN_API = "https://hacker-news.firebaseio.com/v0"
HN_TOP_N = 30  # how many HN stories to consider


# ── Fetchers ─────────────────────────────────────────────────────────────────

def fetch_rss(feeds: dict, max_age_hours: int = 24) -> list[dict]:
    """Fetch recent articles from RSS feeds."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    articles = []

    for source, url in feeds.items():
        feed = feedparser.parse(url)
        for entry in feed.entries:
            # Parse published date
            published = entry.get("published_parsed") or entry.get("updated_parsed")
            if published:
                pub_dt = datetime(*published[:6], tzinfo=timezone.utc)
                if pub_dt < cutoff:
                    continue
            articles.append({
                "source": source,
                "title": entry.get("title", ""),
                "summary": entry.get("summary", "")[:300],
                "url": entry.get("link", ""),
            })

    return articles


def fetch_hacker_news(top_n: int = HN_TOP_N) -> list[dict]:
    """Fetch top stories from Hacker News."""
    ids = requests.get(f"{HN_API}/topstories.json").json()[:top_n]
    stories = []

    for story_id in ids:
        item = requests.get(f"{HN_API}/item/{story_id}.json").json()
        if item.get("type") == "story" and item.get("score", 0) > 100:
            stories.append({
                "source": "Hacker News",
                "title": item.get("title", ""),
                "summary": f"Score: {item.get('score')} | Comments: {item.get('descendants', 0)}",
                "url": item.get("url", f"https://news.ycombinator.com/item?id={story_id}"),
            })

    return stories


# ── LLM Filter ───────────────────────────────────────────────────────────────

def filter_with_claude(articles: list[dict]) -> dict:
    """Use Claude to select the top 2-3 stories for early-stage VCs."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    articles_text = "\n\n".join(
        f"[{i+1}] {a['source']}\nTitle: {a['title']}\nSummary: {a['summary']}\nURL: {a['url']}"
        for i, a in enumerate(articles)
    )

    prompt = f"""You are a signal filter for early-stage venture capitalists.

From the news articles below, select the 2-3 most relevant stories for an early-stage VC. 
Prioritize: new funding rounds, emerging technology shifts, founder moves, market opportunities, and regulatory changes that affect startups.
Ignore: public market noise, crypto speculation, celebrity tech news.

For each selected story, write a 1-sentence "Why it matters" from an early-stage VC perspective.

Return ONLY valid JSON in this format:
{{
  "date": "YYYY-MM-DD",
  "picks": [
    {{
      "rank": 1,
      "title": "...",
      "source": "...",
      "url": "...",
      "why_it_matters": "..."
    }}
  ]
}}

Articles:
{articles_text}
"""

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ── Main ─────────────────────────────────────────────────────────────────────

def run():
    print("Fetching news...")
    rss_articles = fetch_rss(RSS_FEEDS)
    hn_articles  = fetch_hacker_news()
    all_articles = rss_articles + hn_articles
    print(f"  Found {len(all_articles)} articles total")

    print("Filtering with Claude...")
    result = filter_with_claude(all_articles)

    print("\n── Investor Signal ─────────────────────────────")
    print(f"Date: {result['date']}\n")
    for pick in result["picks"]:
        print(f"#{pick['rank']} {pick['title']}")
        print(f"   Source: {pick['source']}")
        print(f"   Why it matters: {pick['why_it_matters']}")
        print(f"   {pick['url']}\n")

    # Save to JSON for the mobile app to consume
    with open("daily_signal.json", "w") as f:
        json.dump(result, f, indent=2)
    print("Saved to daily_signal.json")

    return result


if __name__ == "__main__":
    run()