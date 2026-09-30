// ==UserScript==
// @name         Snapchat Web Message Cleaner
// @namespace    https://github.com/moodiness/snapchat-web-message-cleaner
// @version      1.0.0
// @description  Deletes your own messages in the open Snapchat Web conversation.
// @author       moodiness
// @license      MIT
// @homepageURL  https://github.com/moodiness/snapchat-web-message-cleaner
// @supportURL   https://github.com/moodiness/snapchat-web-message-cleaner/issues
// @downloadURL  https://raw.githubusercontent.com/moodiness/snapchat-web-message-cleaner/main/snapchat-web-message-cleaner.user.js
// @updateURL    https://raw.githubusercontent.com/moodiness/snapchat-web-message-cleaner/main/snapchat-web-message-cleaner.user.js
// @match        https://www.snapchat.com/web
// @match        https://www.snapchat.com/web/*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  if (document.getElementById('sc-delete-mine')) return;

  // Adjustable settings.
  const CONFIG = {
    myLabel: 'Me',               // label Snapchat shows above your messages
    pauseAfterDelete: 1000,      // pause between two deletions (ms)
    toolbarTimeout: 3500,        // wait for the icon bar (ms)
    removalTimeout: 6000,        // wait for the message to disappear (ms)
    historyTimeout: 4000,        // wait for older messages to load (ms)
    historyAttempts: 3,          // attempts without new content before finishing
    maxConsecutiveFailures: 5    // stop after this many failures in a row
  };

  // Snapchat Web structure observed in the conversation.
  const SEL = {
    group: 'li.T1yt2',
    rows: ':scope > div > ul.ujRzj',
    author: ':scope > header.R1ne3 > div.GUB_w',
    message: ':scope > div.KB4Aq',
    anyMessage: 'div.KB4Aq',
    content: ':scope > .p8r1z',
    hoverOnly: '.Bhzh6, .gFryU',
    toolbar: 'div.gFryU',
    toolbarButton: 'button.NcaQH',
    contextMenu: 'div.IxaB_'
  };

  // SVG path of the trash icon.
  const TRASH_PATH = (
    'M9.75 4.624a.626.626 0 0 0 0 1.252h4.5a.626.626 0 1 0 0-1.252h-4.5Z' +
    'M6 6.874a.626.626 0 1 0 0 1.252h.874v7.624a2.876 2.876 0 0 0 2.876 2.876' +
    'h4.5a2.876 2.876 0 0 0 2.876-2.876V8.126h.499a.626.626 0 1 0 0-1.252H6Z' +
    'm9.873 1.252H8.127v7.624c0 .897.727 1.624 1.624 1.624h4.5' +
    'c.897 0 1.623-.727 1.623-1.624V8.126Z' +
    'm-5.373.998c.346 0 .626.28.626.626v6a.626.626 0 1 1-1.252 0v-6' +
    'c0-.346.28-.626.626-.626Z' +
    'm3 0c.346 0 .626.28.626.626v6a.626.626 0 1 1-1.252 0v-6' +
    'c0-.346.28-.626.626-.626Z'
  ).replace(/\s/g, '');

  // ---------- Panel ----------

  const panel = document.createElement('section');
  panel.id = 'sc-delete-mine';
  panel.style.cssText =
    'position:fixed;right:16px;top:16px;z-index:2147483647;' +
    'background:#202124;color:white;padding:14px;width:300px;' +
    'border:1px solid #888;border-radius:10px;font:14px sans-serif;';

  panel.innerHTML = `
    <strong>Delete my messages</strong>
    <p style="margin:8px 0">
      Keep the mouse over this panel while it runs.
    </p>
    <button id="sc-one" type="button">Test: 1 message</button>
    <button id="sc-all" type="button">Delete all</button>
    <button id="sc-stop" type="button" disabled>Stop</button>
    <div id="sc-status" role="status"
         style="margin-top:10px;min-height:54px">Ready.</div>
  `;

  document.body.append(panel);

  const one = panel.querySelector('#sc-one');
  const all = panel.querySelector('#sc-all');
  const stop = panel.querySelector('#sc-stop');
  const status = panel.querySelector('#sc-status');

  const say = message => {
    status.textContent = message;
  };

  // ---------- State ----------

  let active = false;
  let cancelReason = '';
  let root = null;
  let scroller = null;
  let url = '';
  let skipped = new WeakSet();
  const stats = { deleted: 0, skipped: 0 };

  // ---------- Helpers ----------

  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

  const text = el => el.textContent.trim();

  const visible = el =>
    el.isConnected &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility === 'visible';

  const bars = () =>
    [...document.querySelectorAll(SEL.toolbar)].filter(visible);

  const menus = () =>
    [...document.querySelectorAll(SEL.contextMenu)].filter(visible);

  function guard() {
    if (cancelReason) throw new Error(cancelReason);
    if (document.hidden) throw new Error('Tab hidden.');
    if (location.href !== url || !root.isConnected || !scroller.isConnected) {
      throw new Error('Conversation changed or closed.');
    }
  }

  // Waits for a condition; returns null when the timeout expires.
  async function waitFor(predicate, timeout) {
    const end = Date.now() + timeout;
    while (true) {
      guard();
      const value = predicate();
      if (value) return value;
      if (Date.now() >= end) return null;
      await pause(100);
    }
  }

  // ---------- Conversation ----------

  function locate() {
    const groups = [...document.querySelectorAll(SEL.group)].filter(visible);
    if (!groups.length) {
      throw new Error('Open a conversation that contains messages.');
    }

    root = groups[0].parentElement;
    if (groups.some(group => group.parentElement !== root)) {
      throw new Error('Several message lists are visible.');
    }

    scroller = root;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) {
      scroller = scroller.parentElement;
    }
    if (!scroller || scroller === document.body || scroller === document.documentElement) {
      throw new Error('Could not find the conversation scroll area.');
    }
  }

  // Your messages, in page order (oldest to newest).
  function ownMessages() {
    const result = [];

    for (const group of root.querySelectorAll(`:scope > ${SEL.group}`)) {
      const rows = group.querySelector(SEL.rows);
      if (!rows) continue;

      // The author resets for each block; rows without a label
      // inherit the author of the previous row in the same block.
      let mine = false;

      for (const row of rows.children) {
        if (row.tagName !== 'LI') continue;

        const labels = row.querySelectorAll(SEL.author);
        if (labels.length) {
          mine = [...labels].every(label => {
            const name = label.querySelector('span.nonIntl');
            return !!name && text(name) === CONFIG.myLabel;
          });
        }
        if (!mine) continue;

        const message = row.querySelector(SEL.message);
        if (message) result.push(message);
      }
    }

    return result;
  }

  const pending = () => ownMessages().filter(message => !skipped.has(message));

  // Message content, without the time and icons shown on hover.
  function readContent(message) {
    const content = message.querySelector(SEL.content) || message;
    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            return node.matches(SEL.hoverOnly)
              ? NodeFilter.FILTER_REJECT
              : NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let value = '';
    while (walker.nextNode()) value += walker.currentNode.nodeValue;
    return value;
  }

  // ---------- On-screen position ----------

  // Part of the message visible inside the conversation area.
  function visibleArea(message) {
    const rect = message.getBoundingClientRect();
    const frame = scroller.getBoundingClientRect();

    const left = Math.max(rect.left, frame.left + scroller.clientLeft, 0);
    const top = Math.max(rect.top, frame.top + scroller.clientTop, 0);
    const right = Math.min(
      rect.right,
      frame.left + scroller.clientLeft + scroller.clientWidth,
      innerWidth
    );
    const bottom = Math.min(
      rect.bottom,
      frame.top + scroller.clientTop + scroller.clientHeight,
      innerHeight
    );

    if (!visible(message) || right - left < 2 || bottom - top < 2) return null;
    return { left, top, width: right - left, height: bottom - top };
  }

  // A point on the message that no other element covers.
  function accessiblePoint(message) {
    const area = visibleArea(message);
    if (!area) return null;

    for (const fy of [0.5, 0.2, 0.8]) {
      for (const fx of [0.5, 0.15, 0.85, 0.03, 0.97]) {
        const x = area.left + area.width * fx;
        const y = area.top + area.height * fy;
        const hit = document.elementFromPoint(x, y);
        if (hit && message.contains(hit) && !hit.closest(SEL.hoverOnly)) {
          return { x, y, hit };
        }
      }
    }
    return null;
  }

  // Centers the message inside the conversation area only.
  function scrollToMessage(message) {
    const rect = message.getBoundingClientRect();
    const frame = scroller.getBoundingClientRect();
    const middle = frame.top + scroller.clientTop + scroller.clientHeight / 2;
    scroller.scrollTo({
      top: scroller.scrollTop + rect.top + rect.height / 2 - middle,
      behavior: 'instant'
    });
  }

  // ---------- Simulated hover ----------

  function hover({ x, y, hit }) {
    const base = {
      bubbles: true, cancelable: true, composed: true, view: window,
      clientX: x, clientY: y, buttons: 0, relatedTarget: null
    };
    const pointer = { ...base, pointerType: 'mouse', pointerId: 1, isPrimary: true };

    hit.dispatchEvent(new PointerEvent('pointerover', pointer));
    hit.dispatchEvent(new MouseEvent('mouseover', base));
    hit.dispatchEvent(new PointerEvent('pointermove', pointer));
    hit.dispatchEvent(new MouseEvent('mousemove', base));
  }

  // End of hover: closes the icon bar of a skipped message.
  function leave(hit, message) {
    if (!hit.isConnected) return;

    const base = {
      bubbles: true, cancelable: true, composed: true, view: window,
      buttons: 0, relatedTarget: panel
    };
    const pointer = { ...base, pointerType: 'mouse', pointerId: 1, isPrimary: true };

    hit.dispatchEvent(new PointerEvent('pointerout', pointer));
    hit.dispatchEvent(new MouseEvent('mouseout', base));

    for (let el = hit; el; el = el.parentElement) {
      el.dispatchEvent(new PointerEvent('pointerleave', { ...pointer, bubbles: false }));
      el.dispatchEvent(new MouseEvent('mouseleave', { ...base, bubbles: false }));
      if (el === message.parentElement) break;
    }
  }

  // ---------- Deletion ----------

  function isTrashButton(button) {
    return visible(button) && !button.disabled &&
      [...button.querySelectorAll('svg path')].some(path =>
        (path.getAttribute('d') || '').replace(/\s/g, '') === TRASH_PATH
      );
  }

  function findTrash(row) {
    const open = bars();
    if (open.length > 1) throw new Error('Several icon bars are open.');
    if (!open.length) return null;

    const bar = open[0];
    if (root.contains(bar) && !row.contains(bar)) {
      throw new Error('The open icon bar belongs to another message.');
    }

    const buttons = [...bar.querySelectorAll(SEL.toolbarButton)].filter(isTrashButton);
    if (buttons.length > 1) throw new Error('Several trash icons were found.');
    return buttons[0] || null;
  }

  // Result: 'deleted', 'skipped' (no trash icon or not reachable)
  // or 'retry' (Snapchat re-rendered the message in the meantime).
  async function deleteOne(message) {
    const row = message.parentElement;
    const original = readContent(message);

    // Checks the target is still the same message, and that it is yours.
    const sameTarget = () => {
      guard();
      if (!message.isConnected || message.parentElement !== row) return false;
      if (readContent(message) !== original) {
        throw new Error('The message content changed.');
      }
      if (!ownMessages().includes(message)) {
        throw new Error(`Author "${CONFIG.myLabel}" could not be confirmed.`);
      }
      return true;
    };

    if (menus().length) {
      throw new Error('A Snapchat menu is open: close it and try again.');
    }
    if (!await waitFor(() => bars().length === 0, 2000)) {
      throw new Error('An icon bar stays open. Move the mouse away from the messages.');
    }

    // Snapchat may scroll the conversation back down: reposition if needed.
    let point = null;
    for (let attempt = 0; attempt < 5 && !point; attempt++) {
      if (!sameTarget()) return 'retry';
      scrollToMessage(message);
      await pause(300);
      if (!sameTarget()) return 'retry';
      point = accessiblePoint(message);
    }
    if (!point) {
      skipped.add(message);
      return 'skipped';
    }

    hover(point);

    let gone = false;
    const button = await waitFor(() => {
      if (!sameTarget()) {
        gone = true;
        return true;
      }
      return findTrash(row);
    }, CONFIG.toolbarTimeout);

    if (gone) return 'retry';

    if (!button) {
      // No trash icon: skip the message and close its icon bar.
      leave(point.hit, message);
      if (!await waitFor(() => bars().length === 0, 2000)) {
        throw new Error('The icon bar does not close.');
      }
      skipped.add(message);
      return 'skipped';
    }

    if (!sameTarget()) return 'retry';
    button.click();

    if (!await waitFor(() => !message.isConnected, CONFIG.removalTimeout)) {
      throw new Error(
        'The message is still shown after deletion: result uncertain. ' +
        'Check before running again.'
      );
    }

    await pause(CONFIG.pauseAfterDelete);
    return 'deleted';
  }

  // Scrolls to the top so Snapchat loads older messages.
  async function loadOlder() {
    const before = root.querySelectorAll(SEL.anyMessage).length;

    scroller.scrollTo({ top: Math.min(300, scroller.scrollHeight), behavior: 'instant' });
    await pause(150);
    guard();
    scroller.scrollTo({ top: 0, behavior: 'instant' });

    return !!await waitFor(
      () => root.querySelectorAll(SEL.anyMessage).length > before,
      CONFIG.historyTimeout
    );
  }

  function progress(extra = '') {
    say(
      `${stats.deleted} deleted · ${stats.skipped} skipped · ` +
      `${pending().length} left loaded.` + (extra ? ` ${extra}` : '')
    );
  }

  // ---------- Run ----------

  async function run(single) {
    if (active) return;

    cancelReason = '';
    url = location.href;
    skipped = new WeakSet();
    stats.deleted = 0;
    stats.skipped = 0;

    try {
      locate();
    } catch (error) {
      say(error.message);
      return;
    }

    const loaded = pending();
    const newest = loaded[loaded.length - 1];
    const preview = newest
      ? readContent(newest).trim().slice(0, 80) || '(message without text)'
      : '';

    const question = single
      ? (newest
        ? `Delete your most recent message?\n\n"${preview}"\n\nThis cannot be undone.`
        : 'None of your messages are loaded. Load older history and ' +
          'delete the first one found?')
      : `${loaded.length} of your messages are loaded in this conversation.\n\n` +
        'The script deletes them from newest to oldest, then loads ' +
        'older history.\n\nThis cannot be undone. Continue?';

    if (!confirm(question)) return;

    active = true;
    one.disabled = all.disabled = true;
    stop.disabled = false;

    let failures = 0;
    let historyMisses = 0;

    try {
      while (true) {
        guard();

        const list = pending();
        const target = list[list.length - 1];

        if (target) {
          historyMisses = 0;
          const result = await deleteOne(target);

          if (result === 'deleted') {
            stats.deleted++;
            failures = 0;
            if (single) {
              say('Test passed: 1 message deleted. Check it in Snapchat.');
              break;
            }
          } else {
            if (result === 'skipped') stats.skipped++;
            if (++failures >= CONFIG.maxConsecutiveFailures) {
              throw new Error(
                `${failures} failures in a row. Check the conversation ` +
                'before running again.'
              );
            }
          }

          progress();
          continue;
        }

        if (historyMisses >= CONFIG.historyAttempts) {
          say(single
            ? 'None of your deletable messages were found.'
            : `Done: ${stats.deleted} deleted, ${stats.skipped} skipped. ` +
              'None of your messages remain in the loaded history. ' +
              'Check the conversation.');
          break;
        }

        progress('Loading older messages…');
        historyMisses = await loadOlder() ? 0 : historyMisses + 1;
      }
    } catch (error) {
      say(
        `Stopped: ${error.message} ` +
        `(${stats.deleted} deleted, ${stats.skipped} skipped)`
      );
    } finally {
      active = false;
      one.disabled = all.disabled = false;
      stop.disabled = true;
    }
  }

  one.addEventListener('click', () => run(true));
  all.addEventListener('click', () => run(false));
  stop.addEventListener('click', () => {
    if (active) cancelReason = 'Stop button used.';
  });

  // Any real action outside the panel stops the run.
  for (const type of ['pointerdown', 'pointermove', 'keydown', 'wheel']) {
    document.addEventListener(type, event => {
      if (active && event.isTrusted && !panel.contains(event.target)) {
        cancelReason = 'Mouse moved, click or key press outside the panel.';
      }
    }, true);
  }

  document.addEventListener('visibilitychange', () => {
    if (active && document.hidden) cancelReason = 'Tab hidden.';
  });
})();
