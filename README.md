# Daily Tech News Filter

> Cuts through the noise. 2–3 stories that matter today — filtered for early-stage VCs.

Every morning, this tool automatically pulls hundreds of headlines from TechCrunch, Axios, and Hacker News, and uses Claude AI to select only the most relevant stories for early-stage venture capitalists — with a one-sentence "Why it matters" for each.

---

## How it works

1. **Aggregates** news from RSS feeds and Hacker News API
2. **Filters** with Claude — an LLM prompt tuned for early-stage VC relevance
3. **Outputs** a clean `daily_signal.json` — ready to power a mobile app

---

## Today's signal

Updated daily at 7:00 AM CET via GitHub Actions. See [`daily_signal.json`](./daily_signal.json) for today's picks.

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
- **React Native** *(coming soon)* — mobile app for iOS and Android

---

## Roadmap

- [x] News aggregation (TechCrunch, Axios, Hacker News)
- [x] Claude-powered filtering
- [x] Daily automation via GitHub Actions
- [ ] Mobile app (React Native)
- [ ] Personalized filters by investment thesis
- [ ] X/Twitter integration

---

## Why this exists

VCs read dozens of newsletters and check multiple feeds every morning. Most of it is noise. This tool uses AI to do the filtering — so you start your day with signal, not scroll.

---

Built by [@madebyjan](https://github.com/madebyjan)