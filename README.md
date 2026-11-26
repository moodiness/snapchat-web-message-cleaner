# Snapchat Web Message Cleaner

A Tampermonkey userscript that deletes **your own messages** from the open conversation on [Snapchat Web](https://www.snapchat.com/web).

It works through the regular Snapchat Web interface, exactly like you would by hand: it hovers each of your messages, clicks the trash icon, and moves on to the next one, from newest to oldest. Received messages are never touched.

> [!WARNING]
> **Deletions are permanent.** Snapchat may show the other person that a message was deleted, and it cannot remove copies or screenshots they already have.
>
> This project is not affiliated with, endorsed by, or supported by Snap Inc. Automating actions on Snapchat may conflict with [Snap's Terms of Service](https://snap.com/terms). Use it at your own risk and only on your own account.

## Features

- Deletes only messages in blocks labelled with your name (`Me` in English); the author is checked again right before each click.
- Lists the names shown in the conversation, so you can select yours in one click when it is not `Me` (for example `Moi` in French).
- **Test on 1 message** deletes only your most recent message, so you can check the result first.
- **Delete all** works from newest to oldest and scrolls up to load older history when needed. **Stop after … messages** limits a run to your most recent messages.
- Confirmation inside the panel, with a preview of the first message to be deleted.
- Live progress: deleted, skipped and remaining loaded messages, elapsed time, speed and estimated time left.
- Pauses when you move the mouse, click, scroll or press a key outside the panel, press Escape, hide the tab, or when a Snapchat menu is open. **Resume** continues where the run stopped.
- Stops on **Stop**, when the conversation changes, when a message changes during its deletion, or after 5 failures in a row.
- **Activity** log of each deletion, skip and pause; **Show** scrolls to a skipped message.
- Panel in English or French, light or dark like your system, that you can move and minimize. Settings and position are kept between visits and updates.
- Runs entirely in your browser. It sends no network requests of its own and does not read cookies or tokens.

## Requirements

- A desktop browser. Developed with Chrome; other browsers are untested.
- [Tampermonkey](https://www.tampermonkey.net/).
- Snapchat Web in any language. The script recognizes your messages by the name Snapchat shows above them: `Me` by default, `Moi` when the browser is in French. If yours is different, select it in the panel (see [Usage](#usage)).

On Chrome 138 and later, Tampermonkey needs the **Allow User Scripts** toggle: open `chrome://extensions`, click **Details** on Tampermonkey, and enable it. On older versions, enable **Developer mode** instead. See [Tampermonkey FAQ Q209](https://www.tampermonkey.net/faq.php?q=Q209).

## Installation

1. Install Tampermonkey.
2. Open [`snapchat-web-message-cleaner.user.js`](https://raw.githubusercontent.com/moodiness/snapchat-web-message-cleaner/main/snapchat-web-message-cleaner.user.js). Tampermonkey shows an install page.
3. Click **Install**.
4. Reload Snapchat Web.

A **Message Cleaner** panel appears in the top-right corner of the page.

Tampermonkey checks this repository for updates through the `@updateURL` in the script header.

## Usage

1. Open the conversation you want to clean up. The panel shows how many of your messages are loaded, for example `19 of your messages are loaded`.

   If it shows `None of your messages are loaded`, check the name: when Snapchat shows another name above your messages, click it in the list of names shown in the panel.
2. Click **Test on 1 message**. The panel shows the message that will be deleted. Click **Delete**, then check the result in Snapchat.
3. If the test worked, click **Delete all**. To delete only your most recent messages, first enter a number in **Stop after … messages**.
4. Click **Delete** to confirm, and **keep the mouse on the panel** until the run ends.

While it runs, the panel shows the deleted, skipped and remaining loaded messages, the message being deleted, and an estimate of the time left.

If you move the mouse away from the panel, press a key outside it, press Escape, or hide the tab, the run pauses. Put the mouse back on the panel and click **Resume**, or click **Stop**. A deletion that was already sent completes first; it cannot be undone.

When there is nothing left to delete in the loaded history, the panel shows `Done: …`. Scroll through the conversation to check the result. Open **Activity** to see each deleted and skipped message; **Show** scrolls to a skipped message.

Drag the panel by its header to move it. The `–` button minimizes it to a yellow button; click that button to open the panel again.

## How it works

1. Finds the message list of the open conversation and its scroll area.
2. Collects your messages: rows in blocks whose header shows your name, including the following rows of the same block.
3. Takes the newest remaining one, scrolls it to the middle of the conversation if it is close to an edge, and checks that nothing covers it.
4. Simulates a mouse hover so Snapchat shows its icon bar, then looks for the exact trash icon.
5. Checks again that the message, its content and its author have not changed, then clicks the trash icon.
6. Waits until the message disappears, pauses, and repeats.
7. When no messages of yours are left in the loaded history, scrolls to the top to load older messages. It finishes after 3 attempts that load nothing new.

## Settings

Click the settings button in the panel header. Changes apply to the next run.

| Setting | Default | Description |
|---|---|---|
| Name above your messages | `Me`, or `Moi` when the browser is in French | Name Snapchat shows above your messages. The settings list the names found in the open conversation; click yours. |
| Pause between deletions | `1` s | From 0.3 to 10 seconds. Shorter is faster but fails more often. |
| Stop after this many failures in a row | `5` | Skipped or failed messages in a row before the run stops. |
| Language | Automatic | Panel language. Automatic uses French when the browser prefers it, English otherwise. |

Settings and the panel position are stored in the `localStorage` of snapchat.com under the key `snapchat-web-message-cleaner`. **Reset settings** restores the defaults.

### Advanced

Timings are at the top of the script, in `CONFIG`. Tampermonkey replaces the script when it updates, so edits there are lost; panel settings are kept.

| Setting | Default | Description |
|---|---|---|
| `toolbarTimeout` | `3500` | How long to wait for the icon bar after hovering a message (ms). |
| `removalTimeout` | `6000` | How long to wait for a deleted message to disappear (ms). |
| `historyTimeout` | `4000` | How long to wait for older messages after scrolling to the top (ms). |
| `historyAttempts` | `3` | Attempts without new messages before the run is considered finished. |
| `scrollSettle` | `300` | Wait after scrolling a message into place (ms). |
| `edgeMargin` | `64` | Messages closer than this to an edge of the conversation are scrolled to the middle first (px). |
| `refreshInterval` | `1000` | How often the panel refreshes (ms). |
| `logSize` | `200` | Entries kept in the Activity log. |

CSS selectors are grouped in `SEL`. Snapchat Web uses generated class names (such as `KB4Aq` or `gFryU`) that can change when Snapchat updates its site. If the script stops working after an update, these selectors are the first thing to check.

## Troubleshooting

| Panel message | What to do |
|---|---|
| No panel at all | Enable **Allow User Scripts** (see [Requirements](#requirements)), check that the script is enabled in Tampermonkey, and reload the page. If a yellow button shows instead, the panel is minimized: click the button. |
| `Open a conversation that contains messages.` | Open a conversation first. |
| `None of your messages are loaded` | Click the name Snapchat shows above your messages, or set it in the settings. If the name is right, your messages are further up: **Test on 1 message** and **Delete all** load older history. |
| `Paused: the mouse or keyboard was used outside the panel.` | Put the mouse back on the panel and click **Resume**. |
| `Paused: a Snapchat menu is open. …` | Close the menu, then click **Resume**. |
| `Paused: an icon bar stays open. …` | Move the mouse away from the messages, put it on the panel, and click **Resume**. |
| `Stopped: 5 failures in a row. …` | Your remaining messages probably have no trash icon, the selected name is not yours, or Snapchat changed its interface. Check the conversation and the **Activity** log. |
| `None of your deletable messages were found.` | Check the name above your messages (see above). |
| `Stopped: The message is still shown after deletion: result uncertain. …` | Refresh the page and check the conversation before running again. |
| `Stopped: Conversation changed or closed. …` | Stay on the conversation until the run ends, then run again. |

## Limitations

- Depends on the current structure of Snapchat Web; built against Snapchat Web 13.79 (September 2026).
- Only deletes messages that offer a trash icon on hover. Others are counted as **skipped**, stay in the conversation, and are listed in the Activity log.
- `Done` means no deletable messages of yours remain in the history loaded in the page. It is not a confirmation from Snapchat that the whole conversation was cleared.
- Large conversations take time: roughly 1.5 to 2 seconds per message with the default pause.

## Contributing

Bug reports and pull requests are welcome. When reporting a problem, include:

- the script version (shown in Tampermonkey and in the panel settings) and your browser;
- the Snapchat Web version (shown in the browser console, for example `Snapchat v13.79.0`);
- the exact text shown in the panel, and the relevant lines of the **Activity** log with message text replaced by `REDACTED`.

**Never share** cookies, `Authorization` headers, copied network requests, or private messages in an issue.

## License

[MIT](LICENSE) © 2026 moodiness
