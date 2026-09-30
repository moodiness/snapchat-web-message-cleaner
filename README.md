# Snapchat Web Message Cleaner

A Tampermonkey userscript that deletes **your own messages** from the open conversation on [Snapchat Web](https://www.snapchat.com/web).

It works through the regular Snapchat Web interface, exactly like you would by hand: it hovers each of your messages, clicks the trash icon, and moves on to the next one, from newest to oldest. Received messages are never touched.

> [!WARNING]
> **Deletions are permanent.** Snapchat may show the other person that a message was deleted, and it cannot remove copies or screenshots they already have.
>
> This project is not affiliated with, endorsed by, or supported by Snap Inc. Automating actions on Snapchat may conflict with [Snap's Terms of Service](https://snap.com/terms). Use it at your own risk and only on your own account.

## Features

- Deletes only messages in blocks labelled **Me**; the author label is checked again right before each click.
- **Test: 1 message** deletes only your most recent message, so you can check the result first.
- **Delete all** works from newest to oldest and scrolls up to load older history when needed.
- Shows a confirmation with a preview before starting, and live progress while running.
- Skips messages that have no trash icon and continues with the next one.
- Stops safely on **Stop**, when you move the mouse, click, or press a key outside the panel, when the tab is hidden, when the conversation changes, or after 5 failures in a row.
- Runs entirely in your browser. It sends no network requests of its own and does not read cookies or tokens.

## Requirements

- A desktop browser. Developed with Chrome; other browsers are untested.
- [Tampermonkey](https://www.tampermonkey.net/).
- Snapchat Web with the interface in **English** (the script looks for the `Me` label; see [Configuration](#configuration)).

On Chrome 138 and later, Tampermonkey needs the **Allow User Scripts** toggle: open `chrome://extensions`, click **Details** on Tampermonkey, and enable it. On older versions, enable **Developer mode** instead. See [Tampermonkey FAQ Q209](https://www.tampermonkey.net/faq.php?q=Q209).

## Installation

1. Install Tampermonkey.
2. Open [`snapchat-web-message-cleaner.user.js`](https://raw.githubusercontent.com/moodiness/snapchat-web-message-cleaner/main/snapchat-web-message-cleaner.user.js). Tampermonkey shows an install page.
3. Click **Install**.
4. Reload Snapchat Web.

A **Delete my messages** panel appears in the top-right corner of the page.

Tampermonkey checks this repository for updates through the `@updateURL` in the script header.

## Usage

1. Open the conversation you want to clean up.
2. Click **Test: 1 message**. The confirmation shows which message will be deleted. Accept, then check the result in Snapchat.
3. If the test worked, click **Delete all**. The confirmation shows how many of your messages are currently loaded.
4. **Leave the mouse still over the panel** and keep the tab visible until the run ends.

The status line shows progress:

```text
12 deleted · 1 skipped · 40 left loaded.
```

When there is nothing left to delete in the loaded history, the panel shows `Done: …`. Scroll through the conversation to check the result.

To stop at any time, click **Stop** or move the mouse outside the panel. A deletion that was already sent cannot be undone.

## How it works

1. Finds the message list of the open conversation and its scroll area.
2. Collects your messages: rows in blocks whose header says `Me`, including the following rows of the same block.
3. Takes the newest remaining one, scrolls it to the middle of the conversation, and checks that nothing covers it.
4. Simulates a mouse hover so Snapchat shows its icon bar, then looks for the exact trash icon.
5. Checks again that the message, its content and its author have not changed, then clicks the trash icon.
6. Waits until the message disappears, pauses, and repeats.
7. When no messages of yours are left in the loaded history, scrolls to the top to load older messages. It finishes after 3 attempts that load nothing new.

## Configuration

Settings are at the top of the script, in `CONFIG`:

| Setting | Default | Description |
|---|---|---|
| `myLabel` | `'Me'` | Label Snapchat shows above your messages. Change it if your interface uses another label. |
| `pauseAfterDelete` | `1000` | Pause between two deletions, in milliseconds. |
| `toolbarTimeout` | `3500` | How long to wait for the icon bar after hovering a message. |
| `removalTimeout` | `6000` | How long to wait for a deleted message to disappear. |
| `historyTimeout` | `4000` | How long to wait for older messages after scrolling to the top. |
| `historyAttempts` | `3` | Attempts without new messages before the run is considered finished. |
| `maxConsecutiveFailures` | `5` | Stops after this many skipped or failed messages in a row. |

CSS selectors are grouped in `SEL`. Snapchat Web uses generated class names (such as `KB4Aq` or `gFryU`) that can change when Snapchat updates its site. If the script stops working after an update, these selectors are the first thing to check.

## Troubleshooting

| Panel message | What to do |
|---|---|
| No panel at all | Enable **Allow User Scripts** (see [Requirements](#requirements)), check that the script is enabled in Tampermonkey, and reload the page. |
| `Open a conversation that contains messages.` | Open a conversation first. |
| `Stopped: Mouse moved, click or key press outside the panel.` | Run again and keep the mouse still over the panel. |
| `Stopped: 5 failures in a row.` | Your remaining messages probably have no trash icon, or Snapchat changed its interface. Check the conversation. |
| `None of your deletable messages were found.` | Check that the label above your messages is `Me`, or update `CONFIG.myLabel`. |
| `Stopped: The message is still shown after deletion: result uncertain.` | Refresh the page and check the conversation before running again. |

## Limitations

- Depends on the current structure of Snapchat Web; built against Snapchat Web 13.79 (September 2026).
- Only deletes messages that offer a trash icon on hover. Others are counted as **skipped** and stay in the conversation.
- `Done` means no messages of yours remain in the history loaded in the page. It is not a confirmation from Snapchat that the whole conversation was cleared.
- Large conversations take time: roughly 1.5 to 2 seconds per message.

## Contributing

Bug reports and pull requests are welcome. When reporting a problem, include:

- the script version and your browser;
- the Snapchat Web version (shown in the browser console, for example `Snapchat v13.79.0`);
- the exact text shown in the panel.

**Never share** cookies, `Authorization` headers, copied network requests, or private messages in an issue.

## License

[MIT](LICENSE) © 2026 moodiness
