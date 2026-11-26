# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-11-26

### Added

- Redesigned panel, isolated from Snapchat's styles: light and dark themes, movable by its header, can be minimized; its position is remembered.
- Confirmation inside the panel with a preview of the first message to delete, instead of the browser dialog.
- **Stop after … messages** to delete only your most recent messages.
- Live progress: deleted, skipped and remaining loaded messages, progress bar, elapsed time, speed and estimated time left.
- Pause and **Resume**: moving the mouse or pressing a key outside the panel, pressing Escape, hiding the tab, an open Snapchat menu or an icon bar that stays open now pause the run instead of ending it.
- List of the names shown in the conversation, to select yours when it is not `Me`.
- Settings in the panel, kept across updates: name above your messages, pause between deletions, failure limit, language.
- French interface, chosen from the browser language, with `Moi` as the default name.
- **Activity** log of deletions, skips and pauses; **Show** scrolls to a skipped message.
- Script icon in Tampermonkey.

### Changed

- The name check ignores case: `me`, `Me` and `ME` match.
- Messages already well inside the conversation are no longer scrolled before being hovered, which saves time on each message.
- A deletion already sent is waited for before the run pauses or stops, so the counts stay exact.
- The author check during a deletion reads only the block of the message instead of the whole conversation.
- The icon bar opened by the script is closed when the run pauses or stops.

### Fixed

- Moving the mouse back to the panel after accepting the browser confirmation no longer stops the run right away.

## [1.0.0] - 2026-09-30

### Added

- Panel with **Test: 1 message**, **Delete all** and **Stop**.
- Detection of your messages through the `Me` label of each message block.
- Deletion from newest to oldest through the hover icon bar and its trash icon.
- Automatic loading of older history when no messages of yours are left in the page.
- Confirmation with a preview before each run, and live progress.
- Skipping of messages without a trash icon.
- Safety stops: Stop button, real mouse or keyboard activity outside the panel, hidden tab, conversation change, changed message content or author, and 5 failures in a row.

[2.0.0]: https://github.com/moodiness/snapchat-web-message-cleaner/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/moodiness/snapchat-web-message-cleaner/releases/tag/v1.0.0
