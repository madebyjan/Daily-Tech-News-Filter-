# Daily VC News

> Cuts through the noise. 2–3 stories that matter today — filtered for early-stage VCs.

[![Download on the App Store](https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg)](https://apps.apple.com/de/app/daily-vc-news/id6762083865)

Every morning, this tool automatically pulls hundreds of headlines from TechCrunch, Axios, and Hacker News, and uses Claude AI to select only the most relevant stories for early-stage venture capitalists — with a one-sentence "Why it matters" for each.

---

## Features

- **Personalized Onboarding** – Select your investment focus areas on first launch (AI, Climate Tech, Fintech, Biotech and more)
- **AI-Powered Curation** – Claude AI analyzes hundreds of headlines daily and picks the top 3 for VCs
- **In-App Browser** – Read full articles without leaving the app
- **Saved Stories** – Bookmark stories and access them anytime in the Saved tab
- **Daily Digest** – A curated summary of the day's top stories
- **Push Notifications** – Get notified every morning at 7 AM when new stories are ready

---

## How it works

1. **Aggregates** news from RSS feeds and Hacker News API
2. **Filters** with Claude AI — tuned for early-stage VC relevance
3. **Outputs** a clean `daily_signal.json` — powering the mobile app

---

## Setup

```bash
git clone https://github.com/madebyjan/Daily-Tech-News-Filter-.git
cd Daily-Tech-News-Filter-
pip install anthropic feedparser requests
export ANTHROPIC_API_KEY=your_key_here
python3 investor_signal.py
```

---

## Stack

- **Python** — news aggregation and scheduling
- **Claude API (Anthropic)** — LLM-powered relevance filtering
- **GitHub Actions** — runs automatically every morning
- **React Native** — mobile app for iOS

---

## Roadmap

- [x] News aggregation (TechCrunch, Axios, Hacker News)
- [x] Claude-powered filtering
- [x] Daily automation via GitHub Actions
- [x] Mobile app (React Native)
- [x] Personalized onboarding
- [x] In-App Browser
- [x] Saved Stories
- [x] Push Notifications
- [ ] X/Twitter integration
- [ ] Personalized filters by investment thesis

---

## Why this exists

VCs read dozens of newsletters and check multiple feeds every morning. Most of it is noise. This tool uses AI to do the filtering — so you start your day with signal, not scroll.

---

Built by [@madebyjan](https://github.com/madebyjan)