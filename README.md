# Signal Desk

A monthly feed of new UK fund partnerships, GP/carry/co-invest entities, BidCo/MidCo/TopCo deal vehicles, new investment firms and advisory boutiques, built from the free Companies House snapshot. It comes with a GTM playbook for turning those signals into outbound pipeline.

- `public/`: the static site (no build step). `index.html` is the feed, `playbook.html` the GTM playbook, `method.html` the rules and limitations.
- `scripts/rules.js`: every classification rule.
- `scripts/build-data.js`: streams the snapshot CSV and writes `public/data/signals.json`.
- `.github/workflows/refresh.yml`: runs monthly, downloads the latest snapshot, rebuilds the data and commits it.

## Rebuild locally

```bash
curl -O https://download.companieshouse.gov.uk/BasicCompanyDataAsOneFile-2026-10-01.zip
unzip -p BasicCompanyDataAsOneFile-2026-10-01.zip | node scripts/build-data.js - 2026-10-01
node scripts/serve.js   # http://localhost:4173
```

No API keys are used anywhere.

Data: Companies House Free Company Data Product. Contains public sector information licensed under the Open Government Licence v3.0. An independent project, not affiliated with Companies House or any company listed.
