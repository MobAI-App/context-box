# Privacy Policy

**ContextBox** is a Chrome extension that captures UI context from webpages for use with AI coding tools. This policy explains how the extension handles your data.

## Data Collection

ContextBox does **not** collect, store, or transmit any personal data. The extension:

- Does not collect personally identifiable information
- Does not collect health, financial, or authentication information
- Does not track browsing history or user activity
- Does not use analytics or telemetry
- Does not contain ads

## How It Works

When you use ContextBox:

1. **Element selection data** (HTML snippets, CSS properties, accessibility attributes) is extracted only from elements you explicitly select
2. **Screenshots** are captured only when you click Send or Copy, and saved locally to your Downloads folder
3. **All processing happens locally** in your browser

## Data Transmission

ContextBox only sends data to:

- **AiBridge** (localhost only) — A local server you run on your own machine to forward context to AI tools. No data is sent to external servers.

If AiBridge is not running, you can copy the context to your clipboard manually.

## Permissions

The extension requires these permissions:

- **activeTab**: To access the current page when you enable selection mode
- **scripting**: To inject the selection interface into pages
- **storage**: To save your preferences locally
- **downloads**: To save screenshots to your Downloads folder
- **host_permissions (127.0.0.1)**: To communicate with AiBridge on your local machine

## Data Security

- Sensitive attributes (passwords, tokens, auth cookies) are automatically redacted from captured HTML
- Input field values are not captured
- No data leaves your machine unless you explicitly send it via AiBridge

## Changes

If this policy changes, updates will be posted to this page.

## Contact

For questions about this privacy policy, contact: contact@mobai.run

---

*Last updated: February 2025*
