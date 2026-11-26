// ==UserScript==
// @name           Snapchat Web Message Cleaner
// @namespace      https://github.com/moodiness/snapchat-web-message-cleaner
// @version        2.0.0
// @description    Deletes your own messages in the open Snapchat Web conversation.
// @description:fr Supprime vos propres messages dans la conversation Snapchat Web ouverte.
// @author         moodiness
// @license        MIT
// @icon           data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNiIgZmlsbD0iI0ZGRkMwMCIvPjxwYXRoIGZpbGw9IiMxMjEzMTYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTIuNCAtMS45Mikgc2NhbGUoMS4yKSIgZD0iTTkuNzUgNC42MjRhLjYyNi42MjYgMCAwIDAgMCAxLjI1Mmg0LjVhLjYyNi42MjYgMCAxIDAgMC0xLjI1MmgtNC41Wk02IDYuODc0YS42MjYuNjI2IDAgMSAwIDAgMS4yNTJoLjg3NHY3LjYyNGEyLjg3NiAyLjg3NiAwIDAgMCAyLjg3NiAyLjg3Nmg0LjVhMi44NzYgMi44NzYgMCAwIDAgMi44NzYtMi44NzZWOC4xMjZoLjQ5OWEuNjI2LjYyNiAwIDEgMCAwLTEuMjUySDZabTkuODczIDEuMjUySDguMTI3djcuNjI0YzAgLjg5Ny43MjcgMS42MjQgMS42MjQgMS42MjRoNC41Yy44OTcgMCAxLjYyMy0uNzI3IDEuNjIzLTEuNjI0VjguMTI2Wm0tNS4zNzMuOTk4Yy4zNDYgMCAuNjI2LjI4LjYyNi42MjZ2NmEuNjI2LjYyNiAwIDEgMS0xLjI1MiAwdi02YzAtLjM0Ni4yOC0uNjI2LjYyNi0uNjI2Wm0zIDBjLjM0NiAwIC42MjYuMjguNjI2LjYyNnY2YS42MjYuNjI2IDAgMSAxLTEuMjUyIDB2LTZjMC0uMzQ2LjI4LS42MjYuNjI2LS42MjZaIi8+PC9zdmc+
// @homepageURL    https://github.com/moodiness/snapchat-web-message-cleaner
// @supportURL     https://github.com/moodiness/snapchat-web-message-cleaner/issues
// @downloadURL    https://raw.githubusercontent.com/moodiness/snapchat-web-message-cleaner/main/snapchat-web-message-cleaner.user.js
// @updateURL      https://raw.githubusercontent.com/moodiness/snapchat-web-message-cleaner/main/snapchat-web-message-cleaner.user.js
// @match          https://www.snapchat.com/web
// @match          https://www.snapchat.com/web/*
// @run-at         document-idle
// @grant          none
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const HOST_ID = 'snapchat-web-message-cleaner';
  if (document.getElementById(HOST_ID)) return;

  // Tampermonkey provides GM_info even with @grant none.
  const VERSION = typeof GM_info === 'object' ? GM_info.script.version : '';
  const STORAGE_KEY = 'snapchat-web-message-cleaner';

  // ---------- Configuration ----------

  // Timings of each step. The pause between deletions and the failure
  // limit are set in the panel.
  const CONFIG = {
    toolbarTimeout: 3500,   // wait for the icon bar after hovering a message (ms)
    removalTimeout: 6000,   // wait for a deleted message to disappear (ms)
    historyTimeout: 4000,   // wait for older messages after scrolling to the top (ms)
    historyAttempts: 3,     // attempts without new messages before the run ends
    scrollSettle: 300,      // wait after scrolling a message into place (ms)
    edgeMargin: 64,         // messages closer than this to an edge are centered first (px)
    refreshInterval: 1000,  // panel refresh (ms)
    logSize: 200            // entries kept in the activity log
  };

  // Panel settings: default value and allowed range.
  const DEFAULTS = { delay: 1000, maxFailures: 5 };
  const RANGES = { delay: [300, 10000], maxFailures: [1, 50] };

  // Name Snapchat shows above your messages, by browser language.
  const OWN_NAMES = { en: 'Me', fr: 'Moi' };

  // Snapchat Web structure observed in the conversation.
  const SEL = {
    group: 'li.T1yt2',
    rows: ':scope > div > ul.ujRzj',
    author: ':scope > header.R1ne3 > div.GUB_w',
    authorName: 'span.nonIntl',
    message: ':scope > div.KB4Aq',
    anyMessage: 'div.KB4Aq',
    content: ':scope > .p8r1z',
    hoverOnly: '.Bhzh6, .gFryU',
    toolbar: 'div.gFryU',
    toolbarButton: 'button.NcaQH',
    contextMenu: 'div.IxaB_'
  };

  // SVG path of the trash icon, as Snapchat draws it.
  const TRASH_ICON =
    'M9.75 4.624a.626.626 0 0 0 0 1.252h4.5a.626.626 0 1 0 0-1.252h-4.5Z' +
    'M6 6.874a.626.626 0 1 0 0 1.252h.874v7.624a2.876 2.876 0 0 0 2.876 2.876' +
    'h4.5a2.876 2.876 0 0 0 2.876-2.876V8.126h.499a.626.626 0 1 0 0-1.252H6Z' +
    'm9.873 1.252H8.127v7.624c0 .897.727 1.624 1.624 1.624h4.5' +
    'c.897 0 1.623-.727 1.623-1.624V8.126Z' +
    'm-5.373.998c.346 0 .626.28.626.626v6a.626.626 0 1 1-1.252 0v-6' +
    'c0-.346.28-.626.626-.626Z' +
    'm3 0c.346 0 .626.28.626.626v6a.626.626 0 1 1-1.252 0v-6' +
    'c0-.346.28-.626.626-.626Z';

  // Same path without spaces, to compare it with the page.
  const TRASH_PATH = TRASH_ICON.replace(/\s/g, '');

  // ---------- Text ----------

  const plEn = (n, one, many) => (n === 1 ? one : many);
  const plFr = (n, one, many) => (n < 2 ? one : many);
  const qFr = value => `«\u00a0${value}\u00a0»`;

  const STRINGS = {
    en: {
      title: 'Message Cleaner',
      state_idle: 'Ready',
      state_confirm: 'Waiting for confirmation',
      state_running: 'Deleting',
      state_paused: 'Paused',
      settings: 'Settings',
      minimize: 'Minimize',
      open: 'Open Message Cleaner',
      back: 'Back',
      version: version => `Version ${version}`,

      noConversation: 'Open a conversation that contains messages.',
      severalLists: 'Several message lists are visible.',
      noScroller: 'Could not find the conversation scroll area.',
      ownLoaded: n => plEn(n, 'of your messages is loaded', 'of your messages are loaded'),
      ownNone: 'None of your messages are loaded',
      nameUsed: name => `Recognized by the name “${name}”.`,
      nameMissing: name => `No message appears under the name “${name}”. ` +
        'If Snapchat shows another name above your messages, select it:',
      change: 'Change',

      limitBefore: 'Stop after',
      limitAfter: 'messages',
      limitAll: 'all',
      test: 'Test on 1 message',
      deleteAll: 'Delete all',
      deleteSome: n => `Delete ${num(n)}`,
      mouseHint: 'Keep the mouse on this panel while it runs. Moving it away pauses the run.',

      confirmTest: 'Delete your most recent message?',
      confirmAll: 'Delete all your messages in this conversation?',
      confirmSome: n => `Delete your ${num(n)} most recent messages?`,
      confirmLoaded: n => `${num(n)} ${plEn(n, 'of your messages is', 'of your messages are')} loaded.`,
      confirmOlder: 'Older history is loaded as the run goes, from newest to oldest.',
      confirmNone: 'None of your messages are loaded. Older history will be searched.',
      newest: 'Most recent',
      noText: '(message without text)',
      permanent: 'Deletion is permanent. Snapchat may show the other person that a message was deleted.',
      cancel: 'Cancel',
      confirm: 'Delete',

      capDeleted: () => 'deleted',
      capSkipped: () => 'skipped',
      capLeft: () => 'left loaded',
      stepDeleting: preview => `Deleting “${preview}”`,
      stepNext: 'Pause before the next message',
      stepLoading: (attempt, max) => `Loading older messages (${attempt}/${max})`,
      stepStopping: 'Stopping…',
      rate: n => `${num(n)}/min`,
      eta: time => `${time} left`,
      etaLoaded: time => `${time} for the loaded messages`,
      pause: 'Pause',
      resume: 'Resume',
      stop: 'Stop',
      resumeHint: 'Put the mouse back on this panel, then click Resume.',

      pausedButton: 'Paused.',
      pausedActivity: 'Paused: the mouse or keyboard was used outside the panel.',
      pausedHidden: 'Paused: the tab was hidden.',
      pausedMenu: 'Paused: a Snapchat menu is open. Close it, then resume.',
      pausedBarOpen: 'Paused: an icon bar stays open. Move the mouse away from the messages, then resume.',
      pausedBars: 'Paused: several icon bars are open.',
      pausedOtherBar: 'Paused: the open icon bar belongs to another message.',
      pausedBarStuck: 'Paused: the icon bar does not close.',

      summary: (deleted, skipped) => `${num(deleted)} deleted, ${num(skipped)} skipped`,
      testPassed: 'Test passed: 1 message deleted. Check it in Snapchat.',
      doneAll: summary => `Done: ${summary}. Nothing else to delete in the loaded history. ` +
        'Check the conversation.',
      doneLimit: summary => `Done: ${summary}.`,
      noneFound: 'None of your deletable messages were found.',
      stopped: summary => `Stopped: ${summary}.`,
      failed: (reason, summary) => `Stopped: ${reason} (${summary})`,

      conversationChanged: 'Conversation changed or closed.',
      contentChanged: 'The message content changed.',
      authorUnconfirmed: name => `Author “${name}” could not be confirmed.`,
      severalTrash: 'Several trash icons were found.',
      stillShown: 'The message is still shown after deletion: result uncertain. Check before running again.',
      failures: n => `${num(n)} failures in a row. Check the conversation before running again.`,

      activity: 'Activity',
      clear: 'Clear',
      show: 'Show',
      logEmpty: 'No activity yet.',
      logStartTest: 'Started: test on 1 message.',
      logStartAll: 'Started: delete all.',
      logStartSome: n => `Started: delete ${num(n)} messages.`,
      logDeleted: preview => `Deleted “${preview}”`,
      logNoTrash: preview => `Skipped “${preview}”: no trash icon`,
      logUnreachable: preview => `Skipped “${preview}”: not reachable on screen`,
      logLoaded: n => `Loaded ${num(n)} older ${plEn(n, 'message', 'messages')}`,
      logResumed: 'Resumed.',

      nameField: 'Name above your messages',
      nameHelp: name => `Snapchat shows it above each block of your messages. Default: “${name}”.`,
      namesFound: 'Names in this conversation:',
      delayField: 'Pause between deletions',
      delayHelp: 'Shorter is faster but fails more often. Default: 1 s.',
      failuresField: 'Stop after this many failures in a row',
      languageField: 'Language',
      automatic: 'Automatic',
      reset: 'Reset settings'
    },

    fr: {
      title: 'Message Cleaner',
      state_idle: 'Prêt',
      state_confirm: 'En attente de confirmation',
      state_running: 'Suppression en cours',
      state_paused: 'En pause',
      settings: 'Réglages',
      minimize: 'Réduire',
      open: 'Ouvrir Message Cleaner',
      back: 'Retour',
      version: version => `Version ${version}`,

      noConversation: 'Ouvrez une conversation qui contient des messages.',
      severalLists: 'Plusieurs listes de messages sont visibles.',
      noScroller: 'Zone de défilement de la conversation introuvable.',
      ownLoaded: n => plFr(n, 'de vos messages est chargé', 'de vos messages sont chargés'),
      ownNone: 'Aucun de vos messages n’est chargé',
      nameUsed: name => `Reconnus grâce au nom ${qFr(name)}.`,
      nameMissing: name => `Aucun message n’apparaît sous le nom ${qFr(name)}. ` +
        'Si Snapchat affiche un autre nom au-dessus de vos messages, sélectionnez-le\u00a0:',
      change: 'Modifier',

      limitBefore: 'S’arrêter après',
      limitAfter: 'messages',
      limitAll: 'tous',
      test: 'Tester sur 1 message',
      deleteAll: 'Tout supprimer',
      deleteSome: n => `Supprimer ${num(n)}`,
      mouseHint: 'Gardez la souris sur ce panneau pendant la suppression. La déplacer met en pause.',

      confirmTest: 'Supprimer votre message le plus récent\u00a0?',
      confirmAll: 'Supprimer tous vos messages de cette conversation\u00a0?',
      confirmSome: n => `Supprimer vos ${num(n)} messages les plus récents\u00a0?`,
      confirmLoaded: n => `${num(n)} ${plFr(n, 'de vos messages est chargé', 'de vos messages sont chargés')}.`,
      confirmOlder: 'L’historique plus ancien est chargé au fur et à mesure, du plus récent au plus ancien.',
      confirmNone: 'Aucun de vos messages n’est chargé. L’historique plus ancien sera parcouru.',
      newest: 'Le plus récent',
      noText: '(message sans texte)',
      permanent: 'La suppression est définitive. Snapchat peut indiquer à l’autre personne ' +
        'qu’un message a été supprimé.',
      cancel: 'Annuler',
      confirm: 'Supprimer',

      capDeleted: n => plFr(n, 'supprimé', 'supprimés'),
      capSkipped: n => plFr(n, 'ignoré', 'ignorés'),
      capLeft: n => plFr(n, 'restant chargé', 'restants chargés'),
      stepDeleting: preview => `Suppression de ${qFr(preview)}`,
      stepNext: 'Pause avant le message suivant',
      stepLoading: (attempt, max) => `Chargement des messages plus anciens (${attempt}/${max})`,
      stepStopping: 'Arrêt en cours…',
      rate: n => `${num(n)}/min`,
      eta: time => `encore ${time}`,
      etaLoaded: time => `${time} pour les messages chargés`,
      pause: 'Pause',
      resume: 'Reprendre',
      stop: 'Arrêter',
      resumeHint: 'Replacez la souris sur ce panneau, puis cliquez sur Reprendre.',

      pausedButton: 'En pause.',
      pausedActivity: 'En pause\u00a0: la souris ou le clavier a été utilisé hors du panneau.',
      pausedHidden: 'En pause\u00a0: l’onglet a été masqué.',
      pausedMenu: 'En pause\u00a0: un menu Snapchat est ouvert. Fermez-le, puis reprenez.',
      pausedBarOpen: 'En pause\u00a0: une barre d’icônes reste ouverte. ' +
        'Éloignez la souris des messages, puis reprenez.',
      pausedBars: 'En pause\u00a0: plusieurs barres d’icônes sont ouvertes.',
      pausedOtherBar: 'En pause\u00a0: la barre d’icônes ouverte appartient à un autre message.',
      pausedBarStuck: 'En pause\u00a0: la barre d’icônes ne se ferme pas.',

      summary: (deleted, skipped) => `${num(deleted)} ${plFr(deleted, 'supprimé', 'supprimés')}, ` +
        `${num(skipped)} ${plFr(skipped, 'ignoré', 'ignorés')}`,
      testPassed: 'Test réussi\u00a0: 1 message supprimé. Vérifiez-le dans Snapchat.',
      doneAll: summary => `Terminé\u00a0: ${summary}. Plus rien à supprimer dans l’historique chargé. ` +
        'Vérifiez la conversation.',
      doneLimit: summary => `Terminé\u00a0: ${summary}.`,
      noneFound: 'Aucun de vos messages supprimables n’a été trouvé.',
      stopped: summary => `Arrêté\u00a0: ${summary}.`,
      failed: (reason, summary) => `Arrêté\u00a0: ${reason} (${summary})`,

      conversationChanged: 'La conversation a changé ou a été fermée.',
      contentChanged: 'Le contenu du message a changé.',
      authorUnconfirmed: name => `L’auteur ${qFr(name)} n’a pas pu être confirmé.`,
      severalTrash: 'Plusieurs icônes de corbeille ont été trouvées.',
      stillShown: 'Le message est toujours affiché après la suppression\u00a0: résultat incertain. ' +
        'Vérifiez avant de relancer.',
      failures: n => `${num(n)} échecs d’affilée. Vérifiez la conversation avant de relancer.`,

      activity: 'Activité',
      clear: 'Effacer',
      show: 'Afficher',
      logEmpty: 'Aucune activité pour l’instant.',
      logStartTest: 'Démarré\u00a0: test sur 1 message.',
      logStartAll: 'Démarré\u00a0: tout supprimer.',
      logStartSome: n => `Démarré\u00a0: supprimer ${num(n)} messages.`,
      logDeleted: preview => `Supprimé\u00a0: ${qFr(preview)}`,
      logNoTrash: preview => `Ignoré\u00a0: ${qFr(preview)} (pas d’icône de corbeille)`,
      logUnreachable: preview => `Ignoré\u00a0: ${qFr(preview)} (inaccessible à l’écran)`,
      logLoaded: n => `${num(n)} ${plFr(n, 'message plus ancien chargé', 'messages plus anciens chargés')}`,
      logResumed: 'Reprise.',

      nameField: 'Nom au-dessus de vos messages',
      nameHelp: name => 'Snapchat l’affiche au-dessus de chaque bloc de vos messages. ' +
        `Par défaut\u00a0: ${qFr(name)}.`,
      namesFound: 'Noms dans cette conversation\u00a0:',
      delayField: 'Pause entre deux suppressions',
      delayHelp: 'Plus court est plus rapide, mais échoue plus souvent. Par défaut\u00a0: 1\u00a0s.',
      failuresField: 'Arrêter après ce nombre d’échecs d’affilée',
      languageField: 'Langue',
      automatic: 'Automatique',
      reset: 'Réinitialiser les réglages'
    }
  };

  const browserLanguage = (() => {
    const tags = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    for (const tag of tags) {
      const code = String(tag || '').slice(0, 2).toLowerCase();
      if (code in STRINGS) return code;
    }
    return 'en';
  })();

  let lang = browserLanguage;

  const num = n => n.toLocaleString(lang);

  function t(key, ...args) {
    const entry = key in STRINGS[lang] ? STRINGS[lang][key] : STRINGS.en[key];
    return typeof entry === 'function' ? entry(...args) : entry;
  }

  // ---------- Settings ----------

  const store = readStore();

  function readStore() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  }

  // Saves changes; an undefined value restores the default.
  function save(changes) {
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) delete store[key];
      else store[key] = value;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Storage unavailable: changes last until the page is reloaded.
    }
  }

  const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value));

  const settings = {
    get name() {
      return store.name || OWN_NAMES[browserLanguage];
    },
    get delay() {
      return clamp(Number(store.delay) || DEFAULTS.delay, RANGES.delay);
    },
    get maxFailures() {
      return clamp(Math.round(Number(store.maxFailures)) || DEFAULTS.maxFailures, RANGES.maxFailures);
    },
    get language() {
      return store.language in STRINGS ? store.language : 'auto';
    }
  };

  // ---------- Helpers ----------

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const text = el => el.textContent.trim();

  const collator = new Intl.Collator(undefined, { sensitivity: 'accent' });
  const sameName = (a, b) => collator.compare(a, b) === 0;

  const visible = el =>
    el.isConnected &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility === 'visible';

  const bars = () =>
    [...document.querySelectorAll(SEL.toolbar)].filter(visible);

  const menus = () =>
    [...document.querySelectorAll(SEL.contextMenu)].filter(visible);

  // Interruption of a run: 'pause' waits for the user, 'stop' ends the run
  // with an error, 'cancel' ends it at the user's request.
  class Halt extends Error {
    constructor(kind, key, ...args) {
      super(key);
      this.kind = kind;
      this.key = key;
      this.args = args;
    }
  }

  const pauseFor = (key, ...args) => new Halt('pause', key, ...args);
  const stopFor = (key, ...args) => new Halt('stop', key, ...args);

  const describe = error =>
    error instanceof Halt ? t(error.key, ...error.args) : String(error && error.message || error);

  // ---------- Conversation ----------

  // Message list of the open conversation and its scroll area.
  function locate() {
    const groups = [...document.querySelectorAll(SEL.group)].filter(visible);
    if (!groups.length) throw stopFor('noConversation');

    const root = groups[0].parentElement;
    if (groups.some(group => group.parentElement !== root)) throw stopFor('severalLists');

    let scroller = root;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) {
      scroller = scroller.parentElement;
    }
    if (!scroller || scroller === document.body || scroller === document.documentElement) {
      throw stopFor('noScroller');
    }
    return { root, scroller };
  }

  const groupsOf = root => root.querySelectorAll(`:scope > ${SEL.group}`);

  // Messages of a block with their authors. The author resets for each
  // block; rows without a label inherit the author of the previous row.
  function* entriesOf(group) {
    const rows = group.querySelector(SEL.rows);
    if (!rows) return;

    let authors = [];
    for (const row of rows.children) {
      if (row.tagName !== 'LI') continue;

      const labels = row.querySelectorAll(SEL.author);
      if (labels.length) {
        authors = [...labels].map(label => {
          const name = label.querySelector(SEL.authorName);
          return name ? text(name) : null;
        });
      }

      const message = row.querySelector(SEL.message);
      if (message) yield { message, authors };
    }
  }

  const isMine = (authors, name) =>
    authors.length > 0 && authors.every(author => author !== null && sameName(author, name));

  // Your messages, in page order (oldest to newest).
  function ownMessages(root, name) {
    const result = [];
    for (const group of groupsOf(root)) {
      for (const { message, authors } of entriesOf(group)) {
        if (isMine(authors, name)) result.push(message);
      }
    }
    return result;
  }

  // Same check as ownMessages(), limited to the block of the message.
  function isOwn(message, root, name) {
    const group = message.closest(SEL.group);
    if (!group || group.parentElement !== root) return false;
    for (const entry of entriesOf(group)) {
      if (entry.message === message) return isMine(entry.authors, name);
    }
    return false;
  }

  // State of the open conversation, shown while idle.
  function scan(name) {
    let found;
    try {
      found = locate();
    } catch (error) {
      return { error };
    }

    const own = [];
    const names = new Map();
    for (const group of groupsOf(found.root)) {
      for (const { message, authors } of entriesOf(group)) {
        if (isMine(authors, name)) own.push(message);
        for (const author of new Set(authors)) {
          if (author) names.set(author, (names.get(author) || 0) + 1);
        }
      }
    }
    return { ...found, own, names: [...names].sort((a, b) => b[1] - a[1]) };
  }

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

  function preview(message, max = 60) {
    const chars = [...readContent(message).replace(/\s+/g, ' ').trim()];
    if (!chars.length) return t('noText');
    return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : chars.join('');
  }

  // ---------- On-screen position ----------

  // Inner area of the scroll container, in viewport coordinates.
  function frameOf(scroller) {
    const rect = scroller.getBoundingClientRect();
    const left = rect.left + scroller.clientLeft;
    const top = rect.top + scroller.clientTop;
    return { left, top, right: left + scroller.clientWidth, bottom: top + scroller.clientHeight };
  }

  // Part of the message visible inside the conversation area.
  function visibleArea(message, scroller) {
    const rect = message.getBoundingClientRect();
    const frame = frameOf(scroller);

    const left = Math.max(rect.left, frame.left, 0);
    const top = Math.max(rect.top, frame.top, 0);
    const right = Math.min(rect.right, frame.right, innerWidth);
    const bottom = Math.min(rect.bottom, frame.bottom, innerHeight);

    if (!visible(message) || right - left < 2 || bottom - top < 2) return null;
    return { left, top, width: right - left, height: bottom - top };
  }

  // A point on the message that no other element covers.
  function accessiblePoint(message, scroller) {
    const area = visibleArea(message, scroller);
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

  // Whether the message is fully inside the conversation area, away from its edges.
  function wellPlaced(message, scroller) {
    const rect = message.getBoundingClientRect();
    const frame = frameOf(scroller);
    return rect.height > 0 &&
      rect.top >= frame.top + CONFIG.edgeMargin &&
      rect.bottom <= frame.bottom - CONFIG.edgeMargin;
  }

  // Centers the message inside the conversation area only.
  function scrollToMessage(message, scroller) {
    const rect = message.getBoundingClientRect();
    const frame = frameOf(scroller);
    scroller.scrollTo({
      top: scroller.scrollTop + rect.top + rect.height / 2 - (frame.top + frame.bottom) / 2,
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

  // End of hover: closes the icon bar of the message.
  function leave(hit, message) {
    if (!hit.isConnected) return;

    const base = {
      bubbles: true, cancelable: true, composed: true, view: window,
      buttons: 0, relatedTarget: host
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

  // ---------- Run ----------

  let run = null;

  function guard(r, { interruptible = true } = {}) {
    if (interruptible) {
      if (r.stopRequested) throw new Halt('cancel');
      if (r.pauseReason) throw pauseFor(r.pauseReason);
      if (document.hidden) throw pauseFor('pausedHidden');
    }
    if (location.href !== r.url || !r.root.isConnected || !r.scroller.isConnected) {
      throw stopFor('conversationChanged');
    }
  }

  // Waits for a condition; returns null when the timeout expires.
  async function waitFor(r, predicate, timeout, options) {
    const end = Date.now() + timeout;
    while (true) {
      guard(r, options);
      const value = predicate();
      if (value) return value;
      if (Date.now() >= end) return null;
      await sleep(100);
    }
  }

  const pending = r => ownMessages(r.root, r.name).filter(message => !r.skippedSet.has(message));

  function unhover(r) {
    const hovered = r.hovered;
    r.hovered = null;
    if (hovered) leave(hovered.hit, hovered.message);
  }

  function isTrashButton(button) {
    return visible(button) && !button.disabled &&
      [...button.querySelectorAll('svg path')].some(path =>
        (path.getAttribute('d') || '').replace(/\s/g, '') === TRASH_PATH
      );
  }

  function findTrash(r, row) {
    const open = bars();
    if (open.length > 1) throw pauseFor('pausedBars');
    if (!open.length) return null;

    const bar = open[0];
    if (r.root.contains(bar) && !row.contains(bar)) throw pauseFor('pausedOtherBar');

    const buttons = [...bar.querySelectorAll(SEL.toolbarButton)].filter(isTrashButton);
    if (buttons.length > 1) throw stopFor('severalTrash');
    return buttons[0] || null;
  }

  // Result: 'deleted', 'no-trash' or 'unreachable' (skipped), or 'retry'
  // when Snapchat re-rendered the message in the meantime.
  async function deleteOne(r, message) {
    const row = message.parentElement;
    const original = readContent(message);

    // Checks the target is still the same message, and that it is yours.
    const sameTarget = () => {
      guard(r);
      if (!message.isConnected || message.parentElement !== row) return false;
      if (readContent(message) !== original) throw stopFor('contentChanged');
      if (!isOwn(message, r.root, r.name)) throw stopFor('authorUnconfirmed', r.name);
      return true;
    };

    if (menus().length) throw pauseFor('pausedMenu');
    if (!await waitFor(r, () => bars().length === 0, 2000)) throw pauseFor('pausedBarOpen');

    // Scrolls only when needed; Snapchat may also scroll the conversation
    // back down, so the position is checked again.
    let point = null;
    for (let attempt = 0; attempt < 5 && !point; attempt++) {
      if (!sameTarget()) return 'retry';
      if (attempt > 0 || !wellPlaced(message, r.scroller)) {
        scrollToMessage(message, r.scroller);
        await sleep(CONFIG.scrollSettle);
        if (!sameTarget()) return 'retry';
      }
      point = accessiblePoint(message, r.scroller);
    }
    if (!point) {
      r.skippedSet.add(message);
      return 'unreachable';
    }

    r.hovered = { hit: point.hit, message };
    hover(point);

    let gone = false;
    const button = await waitFor(r, () => {
      if (!sameTarget()) {
        gone = true;
        return true;
      }
      return findTrash(r, row);
    }, CONFIG.toolbarTimeout);

    if (gone) {
      unhover(r);
      return 'retry';
    }

    if (!button) {
      // No trash icon: skip the message and close its icon bar.
      unhover(r);
      if (!await waitFor(r, () => bars().length === 0, 2000)) throw pauseFor('pausedBarStuck');
      r.skippedSet.add(message);
      return 'no-trash';
    }

    if (!sameTarget()) {
      unhover(r);
      return 'retry';
    }
    button.click();

    // The deletion is sent: wait for its result even if the mouse moves.
    const removed = await waitFor(r, () => !message.isConnected, CONFIG.removalTimeout, {
      interruptible: false
    });
    if (!removed) throw stopFor('stillShown');

    r.hovered = null;
    return 'deleted';
  }

  // Scrolls to the top so Snapchat loads older messages.
  // Returns the number of messages added.
  async function loadOlder(r) {
    const count = () => r.root.querySelectorAll(SEL.anyMessage).length;
    const before = count();

    r.scroller.scrollTo({ top: Math.min(300, r.scroller.scrollHeight), behavior: 'instant' });
    await sleep(150);
    guard(r);
    r.scroller.scrollTo({ top: 0, behavior: 'instant' });

    const grew = await waitFor(r, () => count() > before, CONFIG.historyTimeout);
    return grew ? count() - before : 0;
  }

  function setStep(r, step, loading = false) {
    if (r.stopRequested) return;
    r.step = step;
    r.loading = loading;
    renderRun();
  }

  async function execute(r) {
    let outcome = '';
    let error = null;
    let misses = 0; // history loads in a row that brought nothing new

    while (!outcome) {
      try {
        if (r.deleted >= r.limit) {
          outcome = 'limit';
          continue;
        }
        guard(r);

        const list = pending(r);
        const target = list[list.length - 1];
        r.left = list.length;

        if (!target) {
          if (misses >= CONFIG.historyAttempts) {
            outcome = 'exhausted';
            continue;
          }
          setStep(r, t('stepLoading', misses + 1, CONFIG.historyAttempts), true);
          const added = await loadOlder(r);
          misses = added ? 0 : misses + 1;
          if (added) log('info', t('logLoaded', added));
          continue;
        }

        misses = 0;
        const label = preview(target);
        setStep(r, t('stepDeleting', label));
        const result = await deleteOne(r, target);

        if (result === 'deleted') {
          r.deleted++;
          r.left--;
          r.failures = 0;
          log('deleted', t('logDeleted', label));
          if (r.deleted < r.limit) {
            setStep(r, t('stepNext'));
            await waitFor(r, () => false, r.delay);
          }
          continue;
        }

        if (result !== 'retry') {
          r.skipped++;
          r.left--;
          log('skipped', t(result === 'no-trash' ? 'logNoTrash' : 'logUnreachable', label), target);
        }
        if (++r.failures >= r.maxFailures) throw stopFor('failures', r.failures);
        renderRun();
      } catch (caught) {
        unhover(r);
        if (!(caught instanceof Halt) || caught.kind === 'stop') {
          outcome = 'error';
          error = caught;
        } else if (caught.kind === 'cancel' || await pauseRun(r, caught) === 'stop') {
          outcome = 'stopped';
        }
      }
    }

    finish(r, outcome, error);
  }

  function start(limit, found) {
    freezeHeight();
    run = {
      limit,
      url: location.href,
      root: found.root,
      scroller: found.scroller,
      name: settings.name,
      delay: settings.delay,
      maxFailures: settings.maxFailures,
      deleted: 0,
      skipped: 0,
      left: 0,
      failures: 0,
      skippedSet: new WeakSet(),
      hovered: null,
      pauseReason: '',
      pauseText: '',
      stopRequested: false,
      decide: null,
      step: '',
      loading: false,
      activeMs: 0,
      activeSince: Date.now()
    };
    state = 'running';
    log('info', limit === 1 ? t('logStartTest')
      : limit === Infinity ? t('logStartAll')
        : t('logStartSome', limit));
    render();
    ui.stopButton.focus({ preventScroll: true });
    execute(run).catch(error => console.error('[Message Cleaner]', error));
  }

  // Waits until the user resumes or stops: 'resume' or 'stop'.
  function pauseRun(r, halt) {
    r.activeMs += Date.now() - r.activeSince;
    r.activeSince = 0;
    r.pauseText = describe(halt);
    state = 'paused';
    log('warn', r.pauseText);
    render();
    return new Promise(resolve => {
      r.decide = resolve;
    });
  }

  function requestPause(reason) {
    if (run && state === 'running' && !run.pauseReason) run.pauseReason = reason;
  }

  function resume() {
    const r = run;
    if (!r || state !== 'paused') return;
    freezeHeight();
    r.pauseReason = '';
    r.activeSince = Date.now();
    state = 'running';
    log('info', t('logResumed'));
    render();
    ui.stopButton.focus({ preventScroll: true });
    decide(r, 'resume');
  }

  function stop() {
    const r = run;
    if (!r) return;
    if (state === 'paused') {
      decide(r, 'stop');
    } else if (state === 'running' && !r.stopRequested) {
      setStep(r, t('stepStopping'));
      r.stopRequested = true;
    }
  }

  function decide(r, choice) {
    const resolve = r.decide;
    r.decide = null;
    if (resolve) resolve(choice);
  }

  function finish(r, outcome, error) {
    unhover(r);
    if (r.activeSince) r.activeMs += Date.now() - r.activeSince;
    r.activeSince = 0;

    const { deleted, skipped, limit } = r;
    const summary = () => t('summary', deleted, skipped);
    if (outcome === 'limit') {
      result = { tone: 'ok', text: () => (limit === 1 ? t('testPassed') : t('doneLimit', summary())) };
    } else if (outcome === 'exhausted') {
      result = limit === 1
        ? { tone: 'warn', text: () => t('noneFound') }
        : { tone: 'ok', text: () => t('doneAll', summary()) };
    } else if (outcome === 'stopped') {
      result = { tone: 'info', text: () => t('stopped', summary()) };
    } else {
      if (!(error instanceof Halt)) console.error('[Message Cleaner]', error);
      result = { tone: 'error', text: () => t('failed', describe(error), summary()) };
    }
    result.url = location.href;
    log(result.tone === 'error' ? 'error' : result.tone === 'ok' ? 'done' : 'warn', result.text());

    run = null;
    state = 'idle';
    unfreezeHeight();
    refresh();
  }

  // ---------- Panel ----------

  const svg = (body, { filled = false, box = '0 0 24 24' } = {}) =>
    `<svg viewBox="${box}" aria-hidden="true" ` + (filled
      ? 'fill="currentColor" fill-rule="evenodd">'
      : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">') +
    body + '</svg>';

  const ICON = {
    trash: svg(`<path d="${TRASH_ICON}"/>`, { filled: true, box: '4 3.6 16 16' }),
    sliders: svg('<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>'),
    minus: svg('<path d="M6.5 12h11"/>'),
    back: svg('<path d="M14.5 6 8.5 12l6 6"/>'),
    pause: svg('<path d="M9 6.5v11M15 6.5v11"/>'),
    play: svg('<path d="M8 6.2v11.6a.6.6 0 0 0 .9.5l9.3-5.8a.6.6 0 0 0 0-1L8.9 5.7a.6.6 0 0 0-.9.5Z"/>', { filled: true }),
    stop: svg('<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>', { filled: true }),
    flask: svg('<path d="M9.5 3.5h5M10.5 3.5v5.2L5.6 17a2 2 0 0 0 1.7 3h9.4a2 2 0 0 0 1.7-3l-4.9-8.3V3.5M7.6 14.5h8.8"/>'),
    mouse: svg('<rect x="7" y="3.5" width="10" height="17" rx="5"/><path d="M12 7.5v3"/>'),
    check: svg('<path d="m6 12.5 3.8 3.8L18 8"/><circle cx="12" cy="12" r="9"/>'),
    alert: svg('<path d="M12 8v5M12 16.2v.1"/><circle cx="12" cy="12" r="9"/>'),
    chevron: svg('<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>')
  };

  const CSS = `
    :host { all: initial !important; }

    .root {
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      --bg: #121316;
      --surface: #1b1c20;
      --raised: #26282d;
      --raised-hover: #303238;
      --line: rgba(255, 255, 255, 0.07);
      --line-strong: rgba(255, 255, 255, 0.12);
      --text: #f4f4f5;
      --muted: #a2a5ad;
      --faint: #6e717a;
      --accent: #fffc00;
      --accent-hover: #fffd66;
      --accent-ink: #121316;
      --accent-wash: rgba(255, 252, 0, 0.09);
      --accent-line: rgba(255, 252, 0, 0.45);
      --fill: #fffc00;
      --danger: #f23c57;
      --danger-hover: #ff5470;
      --danger-wash: rgba(242, 60, 87, 0.14);
      --ok: #3ccf8e;
      --ok-wash: rgba(60, 207, 142, 0.12);
      --warn: #f6b73c;
      --warn-wash: rgba(246, 183, 60, 0.13);
      --info-wash: rgba(255, 255, 255, 0.06);
      --ring: #fffc00;
      --shadow: 0 24px 48px -16px rgba(0, 0, 0, 0.7), 0 8px 16px -8px rgba(0, 0, 0, 0.5);
      color-scheme: dark;
    }

    @media (prefers-color-scheme: light) {
      .root {
        --bg: #ffffff;
        --surface: #f4f4f6;
        --raised: #ebebef;
        --raised-hover: #e0e0e6;
        --line: rgba(18, 19, 22, 0.07);
        --line-strong: rgba(18, 19, 22, 0.12);
        --text: #16171a;
        --muted: #5e616a;
        --faint: #8d9098;
        --accent-wash: rgba(255, 230, 0, 0.2);
        --accent-line: #e8cf00;
        --fill: #16171a;
        --danger: #e0294a;
        --danger-hover: #c81f3f;
        --danger-wash: rgba(224, 41, 74, 0.09);
        --ok: #12a26a;
        --ok-wash: rgba(18, 162, 106, 0.1);
        --warn: #b26b00;
        --warn-wash: rgba(246, 183, 60, 0.18);
        --info-wash: rgba(18, 19, 22, 0.05);
        --ring: #16171a;
        --shadow: 0 22px 44px -18px rgba(18, 19, 22, 0.32), 0 6px 14px -6px rgba(18, 19, 22, 0.14);
        color-scheme: light;
      }
    }

    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }
    p, h1, h2, figure, blockquote, ol { margin: 0; padding: 0; }
    svg { display: block; flex: none; width: 16px; height: 16px; }
    button, input, select { margin: 0; font: inherit; color: inherit; }
    button { cursor: pointer; }
    button:disabled { cursor: not-allowed; }
    :focus { outline: none; }
    :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }

    .panel {
      position: fixed;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      width: 328px;
      max-width: calc(100vw - 16px);
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--line-strong);
      border-radius: 18px;
      box-shadow: var(--shadow);
      font: 13px/1.45 var(--font);
      letter-spacing: -0.003em;
      -webkit-font-smoothing: antialiased;
      text-align: left;
      animation: rise 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
      transition: border-color 0.2s;
    }
    .panel[data-state="running"] { border-color: var(--accent-line); }

    .head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 10px 12px 14px;
      cursor: grab;
      user-select: none;
      touch-action: none;
    }
    .panel.dragging .head { cursor: grabbing; }
    .mark {
      position: relative;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: var(--accent);
      color: #121316;
      flex: none;
    }
    .mark svg { width: 19px; height: 19px; }
    .panel[data-state="running"] .mark::after {
      content: "";
      position: absolute;
      inset: -4px;
      border: 2px solid var(--accent);
      border-radius: 13px;
      opacity: 0;
      animation: ring 1.6s ease-out infinite;
    }
    .heading { flex: 1; min-width: 0; }
    .title { font-size: 14px; font-weight: 650; line-height: 1.25; letter-spacing: -0.012em; }
    .status-line {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 1px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.3;
      white-space: nowrap;
    }
    .pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--ok); flex: none; }
    .panel[data-state="confirm"] .pulse { background: var(--danger); }
    .panel[data-state="running"] .pulse { background: var(--accent-line); animation: blink 1.2s ease-in-out infinite; }
    .panel[data-state="paused"] .pulse { background: var(--warn); }
    .panel[data-view="settings"] .pulse { display: none; }

    .icon-button {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: var(--muted);
      transition: background-color 0.15s, color 0.15s, opacity 0.15s;
    }
    .icon-button:hover:not(:disabled) { background: var(--raised); color: var(--text); }
    .icon-button:disabled { opacity: 0.3; }
    .icon-button svg { width: 18px; height: 18px; }
    .back { margin-left: -6px; }
    .panel[data-view="main"] .back,
    .panel[data-view="settings"] .mark,
    .panel[data-view="settings"] .head [data-action="settings"] { display: none; }

    .body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
      padding: 2px 14px 14px;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    .panel[data-view="main"] .view-settings,
    .panel[data-view="settings"] .view-main,
    .panel[data-view="settings"] .foot { display: none; }

    .foot { padding: 12px 14px 14px; border-top: 1px solid var(--line); }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .actions.stack { grid-template-columns: 1fr; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-width: 0;
      height: 40px;
      padding: 0 12px;
      border: 0;
      border-radius: 11px;
      font-weight: 600;
      white-space: nowrap;
      transition: background-color 0.15s, transform 0.12s, opacity 0.15s;
    }
    .btn span { overflow: hidden; text-overflow: ellipsis; }
    .btn:active:not(:disabled) { transform: translateY(1px) scale(0.985); }
    .btn:disabled { opacity: 0.4; }
    .btn.secondary { background: var(--raised); color: var(--text); }
    .btn.secondary:hover:not(:disabled) { background: var(--raised-hover); }
    .btn.danger { background: var(--danger); color: #ffffff; }
    .btn.danger:hover:not(:disabled) { background: var(--danger-hover); }
    .btn.primary { background: var(--accent); color: var(--accent-ink); }
    .btn.primary:hover:not(:disabled) { background: var(--accent-hover); }

    .link {
      padding: 0;
      border: 0;
      background: none;
      color: var(--text);
      font-weight: 600;
      text-decoration: underline;
      text-decoration-color: var(--line-strong);
      text-underline-offset: 2px;
    }
    .link:hover:not(:disabled) { text-decoration-color: currentColor; }
    .link:disabled { color: var(--faint); text-decoration: none; }

    .scan { display: flex; gap: 10px; padding: 11px 12px; border-radius: 12px; background: var(--surface); }
    .dot { width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--faint); flex: none; }
    .scan[data-tone="ok"] .dot { background: var(--ok); box-shadow: 0 0 0 3px var(--ok-wash); }
    .scan[data-tone="warn"] .dot { background: var(--warn); box-shadow: 0 0 0 3px var(--warn-wash); }
    .scan-body { flex: 1; min-width: 0; }
    .scan-title { font-weight: 500; text-wrap: pretty; }
    .scan-count { font-weight: 700; font-variant-numeric: tabular-nums; }
    .scan-detail { margin-top: 2px; color: var(--muted); font-size: 12px; text-wrap: pretty; overflow-wrap: anywhere; }

    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 100%;
      height: 28px;
      padding: 0 10px;
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      background: var(--bg);
      font-size: 12.5px;
      font-weight: 500;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      transition: background-color 0.15s, border-color 0.15s;
    }
    .chip:hover { border-color: var(--faint); }
    .chip[aria-pressed="true"] { border-color: transparent; background: var(--accent); color: var(--accent-ink); }
    .chip .n { color: var(--muted); font-size: 11.5px; font-variant-numeric: tabular-nums; }
    .chip[aria-pressed="true"] .n { color: inherit; opacity: 0.65; }

    .banner { display: flex; gap: 9px; padding: 10px 12px; border-radius: 12px; background: var(--info-wash); font-size: 12.5px; }
    .banner svg { margin-top: 1px; color: var(--muted); }
    .banner-text { text-wrap: pretty; overflow-wrap: anywhere; }
    .banner[data-tone="ok"] { background: var(--ok-wash); }
    .banner[data-tone="ok"] svg { color: var(--ok); }
    .banner[data-tone="warn"] { background: var(--warn-wash); }
    .banner[data-tone="warn"] svg { color: var(--warn); }
    .banner[data-tone="error"] { background: var(--danger-wash); }
    .banner[data-tone="error"] svg { color: var(--danger); }

    .limit { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12.5px; }
    .input {
      height: 34px;
      padding: 0 10px;
      border: 1px solid var(--line-strong);
      border-radius: 9px;
      background: var(--surface);
      color: var(--text);
      transition: border-color 0.15s;
    }
    .input:hover { border-color: var(--faint); }
    .input:focus-visible { outline-offset: 0; }
    .input::placeholder { color: var(--faint); }
    .input[type="number"] { -moz-appearance: textfield; }
    .input::-webkit-inner-spin-button, .input::-webkit-outer-spin-button { margin: 0; -webkit-appearance: none; }
    .limit .input { width: 72px; height: 30px; text-align: center; font-variant-numeric: tabular-nums; }

    .confirm-title { font-size: 15.5px; font-weight: 650; line-height: 1.3; letter-spacing: -0.015em; text-wrap: balance; }
    .confirm-text { margin-top: 6px; color: var(--muted); font-size: 12.5px; text-wrap: pretty; }
    .preview { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: var(--surface); }
    .preview figcaption { color: var(--muted); font-size: 11.5px; font-weight: 600; }
    .preview-text {
      display: -webkit-box;
      margin-top: 3px;
      overflow: hidden;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
    }
    .warning { display: flex; gap: 8px; margin-top: 12px; color: var(--danger); font-size: 12.5px; font-weight: 500; }
    .warning svg { margin-top: 1px; }

    .stats { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 6px; }
    .stat { display: flex; flex-direction: column; min-width: 0; padding: 10px 11px 9px; border-radius: 12px; background: var(--surface); }
    .stat.main { background: var(--accent-wash); }
    .num { font-size: 21px; font-weight: 650; line-height: 1.2; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
    .stat.main .num { font-size: 26px; line-height: 1.1; }
    .cap { color: var(--muted); font-size: 11.5px; line-height: 1.3; overflow-wrap: anywhere; }

    .track { position: relative; height: 6px; margin-top: 12px; overflow: hidden; border-radius: 999px; background: var(--raised); }
    .fill {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--fill);
      transform: scaleX(0);
      transform-origin: left center;
      transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .track[data-busy] .fill { right: auto; width: 35%; animation: sweep 1.15s ease-in-out infinite; }
    .step { margin-top: 10px; overflow: hidden; font-size: 12.5px; font-weight: 500; white-space: nowrap; text-overflow: ellipsis; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 2px 10px;
      margin-top: 2px;
      color: var(--muted);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
    .pause-note { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: var(--warn-wash); font-size: 12.5px; }
    .pause-text { font-weight: 600; text-wrap: pretty; }
    .pause-hint { margin-top: 2px; color: var(--muted); }

    .hint { display: flex; gap: 8px; color: var(--muted); font-size: 12px; text-wrap: pretty; }
    .hint svg { margin-top: 1px; }
    .panel[data-state="running"] .hint { padding: 9px 11px; border-radius: 11px; background: var(--accent-wash); color: var(--text); }

    .log { position: relative; padding-top: 10px; border-top: 1px solid var(--line); }
    .log summary {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
      list-style: none;
      cursor: pointer;
      user-select: none;
    }
    .log summary::-webkit-details-marker { display: none; }
    .log summary:hover { color: var(--text); }
    .log summary svg { width: 14px; height: 14px; transition: transform 0.15s; }
    .log[open] summary svg { transform: rotate(90deg); }
    .log-count {
      min-width: 20px;
      padding: 0 6px;
      border-radius: 6px;
      background: var(--raised);
      color: var(--muted);
      font-size: 11px;
      line-height: 18px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .log-count:empty { display: none; }
    .log .clear { position: absolute; top: 10px; right: 0; font-size: 12px; line-height: 18px; }
    .log-list {
      display: flex;
      flex-direction: column;
      gap: 1px;
      max-height: 172px;
      margin-top: 8px;
      overflow-y: auto;
      list-style: none;
      overscroll-behavior: contain;
    }
    .log-list li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: baseline;
      gap: 8px;
      padding: 4px 6px;
      border-radius: 7px;
      font-size: 12px;
    }
    .log-list li:hover { background: var(--surface); }
    .log-list time { color: var(--faint); font-size: 11px; font-variant-numeric: tabular-nums; }
    .entry { min-width: 0; overflow-wrap: anywhere; }
    .log-list [data-kind="skipped"] .entry,
    .log-list [data-kind="warn"] .entry { color: var(--warn); }
    .log-list [data-kind="error"] .entry { color: var(--danger); }
    .log-list [data-kind="done"] .entry { color: var(--ok); }
    .log-list .link { font-size: 11.5px; }
    .log-empty { margin-top: 8px; color: var(--faint); font-size: 12px; }

    .field { display: flex; flex-direction: column; gap: 6px; }
    .field > label { font-size: 12.5px; font-weight: 600; }
    .help { color: var(--muted); font-size: 11.5px; text-wrap: pretty; }
    .names .chips { margin-top: 6px; }
    .with-unit { display: flex; align-items: center; gap: 8px; color: var(--muted); }
    .with-unit .input { width: 92px; font-variant-numeric: tabular-nums; }
    .field select.input { cursor: pointer; }
    .settings-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      font-size: 12px;
    }

    .launcher {
      position: fixed;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      padding: 0;
      border: 0;
      border-radius: 15px;
      background: var(--accent);
      color: #121316;
      box-shadow: var(--shadow);
      animation: rise 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
      transition: transform 0.15s;
    }
    .launcher:hover { transform: translateY(-1px) scale(1.03); }
    .launcher svg { width: 24px; height: 24px; }

    @keyframes rise { from { opacity: 0; transform: translateY(-6px) scale(0.98); } }
    @keyframes ring { 0% { opacity: 0.7; transform: scale(0.92); } 100% { opacity: 0; transform: scale(1.2); } }
    @keyframes blink { 50% { opacity: 0.3; } }
    @keyframes sweep { from { transform: translateX(-100%); } to { transform: translateX(290%); } }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; }
    }
  `;

  const MARKUP = `
    <div class="root">
      <section class="panel" data-state="idle" data-view="main" aria-labelledby="title">
        <header class="head">
          <button class="icon-button back" type="button" data-action="back" data-t-label="back">${ICON.back}</button>
          <span class="mark" aria-hidden="true">${ICON.trash}</span>
          <div class="heading">
            <h1 class="title" id="title"></h1>
            <p class="status-line"><span class="pulse"></span><span class="state-text"></span></p>
          </div>
          <button class="icon-button" type="button" data-action="settings" data-t-label="settings">${ICON.sliders}</button>
          <button class="icon-button" type="button" data-action="collapse" data-t-label="minimize">${ICON.minus}</button>
        </header>

        <div class="body view-main">
          <div class="scan" data-show="idle">
            <span class="dot" aria-hidden="true"></span>
            <div class="scan-body">
              <p class="scan-title"><strong class="scan-count"></strong> <span class="scan-text"></span></p>
              <p class="scan-detail"><span class="scan-name"></span>
                <button class="link scan-change" type="button" data-action="settings" data-t="change"></button></p>
              <div class="chips picker"></div>
            </div>
          </div>

          <div class="banner" role="status">
            <span class="banner-icon"></span>
            <p class="banner-text"></p>
          </div>

          <label class="limit" data-show="idle">
            <span data-t="limitBefore"></span>
            <input class="input limit-input" type="number" min="1" step="1" inputmode="numeric" data-t-placeholder="limitAll">
            <span data-t="limitAfter"></span>
          </label>

          <div class="confirm" data-show="confirm">
            <h2 class="confirm-title"></h2>
            <p class="confirm-text"></p>
            <figure class="preview">
              <figcaption data-t="newest"></figcaption>
              <blockquote class="preview-text"></blockquote>
            </figure>
            <p class="warning">${ICON.alert}<span data-t="permanent"></span></p>
          </div>

          <div class="run" data-show="running paused">
            <div class="stats">
              <div class="stat main"><span class="num" data-stat="deleted">0</span><span class="cap" data-cap="deleted"></span></div>
              <div class="stat"><span class="num" data-stat="skipped">0</span><span class="cap" data-cap="skipped"></span></div>
              <div class="stat"><span class="num" data-stat="left">0</span><span class="cap" data-cap="left"></span></div>
            </div>
            <div class="track"><div class="fill"></div></div>
            <p class="step" aria-live="polite"></p>
            <p class="meta"><span class="clock"></span><span class="eta"></span></p>
            <div class="pause-note" data-show="paused" role="alert">
              <p class="pause-text"></p>
              <p class="pause-hint" data-t="resumeHint"></p>
            </div>
          </div>

          <p class="hint" data-show="idle confirm running">${ICON.mouse}<span data-t="mouseHint"></span></p>

          <details class="log" data-show="idle running paused">
            <summary>${ICON.chevron}<span data-t="activity"></span><span class="log-count"></span></summary>
            <button class="link clear" type="button" data-action="clear-log" data-t="clear"></button>
            <ol class="log-list"></ol>
            <p class="log-empty" data-t="logEmpty"></p>
          </details>
        </div>

        <div class="body view-settings">
          <div class="field">
            <label for="name" data-t="nameField"></label>
            <input class="input" id="name" type="text" autocomplete="off" spellcheck="false" maxlength="80">
            <p class="help name-help"></p>
            <div class="names">
              <p class="help" data-t="namesFound"></p>
              <div class="chips names-chips"></div>
            </div>
          </div>
          <div class="field">
            <label for="delay" data-t="delayField"></label>
            <span class="with-unit">
              <input class="input" id="delay" type="number" min="0.3" max="10" step="0.1" inputmode="decimal">s
            </span>
            <p class="help" data-t="delayHelp"></p>
          </div>
          <div class="field">
            <label for="failures" data-t="failuresField"></label>
            <span class="with-unit">
              <input class="input" id="failures" type="number" min="1" max="50" step="1" inputmode="numeric">
            </span>
          </div>
          <div class="field">
            <label for="language" data-t="languageField"></label>
            <select class="input" id="language">
              <option value="auto" data-t="automatic"></option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <div class="settings-foot">
            <button class="link" type="button" data-action="reset" data-t="reset"></button>
          </div>
        </div>

        <footer class="foot">
          <div class="actions stack" data-show="idle">
            <button class="btn secondary" type="button" data-action="test">${ICON.flask}<span data-t="test"></span></button>
            <button class="btn danger" type="button" data-action="delete">${ICON.trash}<span class="delete-text"></span></button>
          </div>
          <div class="actions" data-show="confirm">
            <button class="btn secondary" type="button" data-action="cancel"><span data-t="cancel"></span></button>
            <button class="btn danger" type="button" data-action="confirm">${ICON.trash}<span data-t="confirm"></span></button>
          </div>
          <div class="actions" data-show="running">
            <button class="btn secondary" type="button" data-action="pause">${ICON.pause}<span data-t="pause"></span></button>
            <button class="btn secondary stop-button" type="button" data-action="stop">${ICON.stop}<span data-t="stop"></span></button>
          </div>
          <div class="actions" data-show="paused">
            <button class="btn primary" type="button" data-action="resume">${ICON.play}<span data-t="resume"></span></button>
            <button class="btn secondary" type="button" data-action="stop">${ICON.stop}<span data-t="stop"></span></button>
          </div>
        </footer>
      </section>

      <button class="launcher" type="button" data-action="expand" data-t-label="open">${ICON.trash}</button>
    </div>
  `;

  const host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${CSS}</style>${MARKUP}`;
  document.body.append(host);

  const $ = selector => shadow.querySelector(selector);

  const ui = {
    panel: $('.panel'),
    head: $('.head'),
    title: $('.title'),
    stateText: $('.state-text'),
    settingsButton: $('.head [data-action="settings"]'),
    collapseButton: $('[data-action="collapse"]'),
    launcher: $('.launcher'),
    scan: $('.scan'),
    scanCount: $('.scan-count'),
    scanText: $('.scan-text'),
    scanDetail: $('.scan-detail'),
    scanName: $('.scan-name'),
    scanChange: $('.scan-change'),
    picker: $('.picker'),
    banner: $('.banner'),
    bannerIcon: $('.banner-icon'),
    bannerText: $('.banner-text'),
    limitInput: $('.limit-input'),
    confirmTitle: $('.confirm-title'),
    confirmText: $('.confirm-text'),
    preview: $('.preview'),
    previewText: $('.preview-text'),
    track: $('.track'),
    fill: $('.fill'),
    step: $('.step'),
    clock: $('.clock'),
    eta: $('.eta'),
    pauseText: $('.pause-text'),
    logList: $('.log-list'),
    logCount: $('.log-count'),
    logEmpty: $('.log-empty'),
    nameInput: $('#name'),
    nameHelp: $('.name-help'),
    names: $('.names'),
    namesChips: $('.names-chips'),
    delayInput: $('#delay'),
    failuresInput: $('#failures'),
    languageSelect: $('#language'),
    testButton: $('[data-action="test"]'),
    deleteButton: $('[data-action="delete"]'),
    deleteText: $('.delete-text'),
    cancelButton: $('[data-action="cancel"]'),
    stopButton: $('.stop-button'),
    showables: shadow.querySelectorAll('[data-show]'),
    stats: {},
    caps: {}
  };
  for (const key of ['deleted', 'skipped', 'left']) {
    ui.stats[key] = $(`[data-stat="${key}"]`);
    ui.caps[key] = $(`[data-cap="${key}"]`);
  }

  // ---------- Panel state ----------

  let state = 'idle';     // idle, confirm, running or paused
  let view = 'main';      // main or settings
  let plan = null;        // run waiting for confirmation
  let result = null;      // outcome of the last run
  let lastScan = null;
  let position = { right: 16, top: 16 };

  const logTargets = new WeakMap();

  function refresh() {
    lastScan = store.collapsed ? null : scan(settings.name);
    render();
  }

  function render() {
    const { panel } = ui;
    panel.dataset.state = state;
    panel.dataset.view = view;
    panel.hidden = !!store.collapsed;
    ui.launcher.hidden = !store.collapsed;

    for (const el of ui.showables) {
      el.hidden = !el.dataset.show.split(' ').includes(state);
    }

    const idle = state === 'idle';
    ui.settingsButton.disabled = !idle;
    ui.collapseButton.disabled = !idle;
    ui.title.textContent = view === 'settings' ? t('settings') : t('title');
    ui.stateText.textContent = view === 'settings'
      ? (VERSION ? t('version', VERSION) : '')
      : t(`state_${state}`);

    renderScan();
    renderBanner();
    renderControls();
    renderConfirm();
    renderRun();
    renderLog();
    if (view === 'settings') ui.nameHelp.textContent = t('nameHelp', OWN_NAMES[browserLanguage]);
  }

  function renderScan() {
    const s = lastScan;
    const name = settings.name;
    const ready = !!s && !s.error;
    let tone = 'muted';
    let count = '';
    let title = '';
    let detail = '';
    let picker = [];

    if (!s) {
      title = '…';
    } else if (s.error) {
      title = describe(s.error);
    } else if (s.own.length) {
      tone = 'ok';
      count = num(s.own.length);
      title = t('ownLoaded', s.own.length);
      detail = t('nameUsed', name);
    } else {
      tone = 'warn';
      title = t('ownNone');
      detail = t('nameMissing', name);
      picker = s.names;
    }

    ui.scan.dataset.tone = tone;
    ui.scanCount.textContent = count;
    ui.scanText.textContent = title;
    ui.scanDetail.hidden = !detail;
    ui.scanName.textContent = detail;
    ui.scanChange.hidden = picker.length > 0;
    ui.picker.hidden = !picker.length;
    renderChips(ui.picker, picker);

    const names = ready ? s.names : [];
    ui.names.hidden = !names.length;
    renderChips(ui.namesChips, names);

    ui.testButton.disabled = !ready;
    ui.deleteButton.disabled = !ready;
  }

  // Rebuilt only when names change, so a chip under the mouse stays put.
  function renderChips(container, names) {
    const name = settings.name;
    const signature = JSON.stringify([lang, name, names]);
    if (container.dataset.signature === signature) return;
    container.dataset.signature = signature;

    container.replaceChildren(...names.map(([author, count]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.action = 'pick';
      chip.dataset.name = author;
      chip.setAttribute('aria-pressed', String(sameName(author, name)));
      const badge = document.createElement('span');
      badge.className = 'n';
      badge.textContent = num(count);
      chip.append(author, badge);
      return chip;
    }));
  }

  function renderBanner() {
    ui.banner.hidden = state !== 'idle' || !result;
    if (ui.banner.hidden) return;
    ui.banner.dataset.tone = result.tone;
    if (ui.bannerIcon.dataset.tone !== result.tone) {
      ui.bannerIcon.dataset.tone = result.tone;
      ui.bannerIcon.innerHTML = result.tone === 'ok' ? ICON.check : ICON.alert;
    }
    ui.bannerText.textContent = result.text();
  }

  function readLimit() {
    const value = Number.parseInt(ui.limitInput.value, 10);
    return Number.isFinite(value) && value >= 1 ? value : Infinity;
  }

  function renderControls() {
    const limit = readLimit();
    ui.deleteText.textContent = limit === Infinity ? t('deleteAll') : t('deleteSome', limit);
  }

  function renderConfirm() {
    if (state !== 'confirm' || !plan) return;
    const { limit, count } = plan;
    ui.confirmTitle.textContent = limit === 1 ? t('confirmTest')
      : limit === Infinity ? t('confirmAll')
        : t('confirmSome', limit);
    ui.confirmText.textContent = !count ? t('confirmNone')
      : limit === 1 ? ''
        : limit > count ? `${t('confirmLoaded', count)} ${t('confirmOlder')}`
          : t('confirmLoaded', count);
    ui.confirmText.hidden = !ui.confirmText.textContent;
    ui.preview.hidden = !plan.preview;
    ui.previewText.textContent = plan.preview;
  }

  function renderRun() {
    const r = run;
    if (!r) return;

    for (const key of ['deleted', 'skipped', 'left']) {
      ui.stats[key].textContent = num(r[key]);
      ui.caps[key].textContent = t(`cap${key[0].toUpperCase()}${key.slice(1)}`, r[key]);
    }

    const done = r.deleted + r.skipped;
    const ratio = r.limit !== Infinity ? r.deleted / r.limit : done / Math.max(1, done + r.left);
    ui.fill.style.transform = `scaleX(${Math.min(1, ratio)})`;
    ui.track.toggleAttribute('data-busy', r.loading && state === 'running');
    ui.step.textContent = r.step;
    ui.step.hidden = state === 'paused';
    ui.pauseText.textContent = r.pauseText;
    renderClock();
  }

  function renderClock() {
    const r = run;
    if (!r) return;
    const elapsed = r.activeMs + (r.activeSince ? Date.now() - r.activeSince : 0);
    let clock = formatClock(elapsed);
    let eta = '';

    if (r.deleted > 0 && elapsed >= 10000) {
      const perMinute = r.deleted / (elapsed / 60000);
      clock += ` · ${t('rate', Math.round(perMinute))}`;
      const todo = r.limit === Infinity ? r.left : Math.min(r.left, r.limit - r.deleted);
      if (todo > 0) {
        const duration = formatDuration(todo / perMinute * 60000);
        eta = r.limit === Infinity ? t('etaLoaded', duration) : t('eta', duration);
      }
    }
    ui.clock.textContent = clock;
    ui.eta.textContent = eta;
  }

  function formatClock(ms) {
    const total = Math.floor(ms / 1000);
    const seconds = String(total % 60).padStart(2, '0');
    const minutes = Math.floor(total / 60) % 60;
    const hours = Math.floor(total / 3600);
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
  }

  function formatDuration(ms) {
    const minutes = Math.round(ms / 60000);
    if (minutes < 1) return '<\u00a01\u00a0min';
    if (minutes < 60) return `≈\u00a0${minutes}\u00a0min`;
    return `≈\u00a0${Math.floor(minutes / 60)}\u00a0h\u00a0${minutes % 60}\u00a0min`;
  }

  function renderLog() {
    const count = ui.logList.childElementCount;
    ui.logCount.textContent = count ? num(count) : '';
    ui.logEmpty.hidden = count > 0;
    for (const button of ui.logList.querySelectorAll('[data-action="show-message"]')) {
      const target = logTargets.get(button);
      button.disabled = state !== 'idle' || !target || !target.isConnected;
    }
  }

  // kind: info, deleted, skipped, warn, error or done.
  function log(kind, message, target = null) {
    const item = document.createElement('li');
    item.dataset.kind = kind;

    const time = document.createElement('time');
    time.textContent = new Date().toLocaleTimeString(lang, {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const entry = document.createElement('span');
    entry.className = 'entry';
    entry.textContent = message;
    item.append(time, entry);

    if (target) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'link';
      button.dataset.action = 'show-message';
      button.textContent = t('show');
      logTargets.set(button, target);
      item.append(button);
    }

    ui.logList.prepend(item);
    while (ui.logList.childElementCount > CONFIG.logSize) ui.logList.lastElementChild.remove();
    renderLog();
  }

  // Scrolls to a skipped message and highlights it briefly.
  function showMessage(message) {
    if (state !== 'idle' || !message || !message.isConnected) return;
    let found;
    try {
      found = locate();
    } catch {
      return;
    }
    if (!found.root.contains(message)) return;

    scrollToMessage(message, found.scroller);
    message.animate([
      { outline: '2px solid #f6b73c', outlineOffset: '3px' },
      { outline: '2px solid rgba(246, 183, 60, 0)', outlineOffset: '3px' }
    ], { duration: 1800, easing: 'ease-in' });
  }

  // ---------- Actions ----------

  function prepare(limit) {
    if (state !== 'idle') return;
    refresh();
    const s = lastScan;
    if (!s || s.error) return;

    const newest = s.own[s.own.length - 1];
    plan = {
      limit,
      url: location.href,
      root: s.root,
      count: s.own.length,
      preview: newest ? preview(newest, 140) : ''
    };
    result = null;
    state = 'confirm';
    render();
    ui.cancelButton.focus({ preventScroll: true });
  }

  function cancel() {
    if (state !== 'confirm') return;
    plan = null;
    state = 'idle';
    refresh();
  }

  function confirmPlan() {
    if (state !== 'confirm') return;
    const p = plan;
    plan = null;

    let found = null;
    try {
      found = locate();
    } catch {
      // Handled below.
    }
    if (!found || found.root !== p.root || location.href !== p.url) {
      state = 'idle';
      result = { tone: 'error', text: () => t('conversationChanged'), url: location.href };
      refresh();
      return;
    }
    start(p.limit, found);
  }

  // Keeps the panel at least as tall as it is now, so it does not shrink
  // away from a mouse resting on its lower part when the run starts.
  function freezeHeight() {
    ui.panel.style.minHeight = `${ui.panel.getBoundingClientRect().height}px`;
  }

  function unfreezeHeight() {
    ui.panel.style.minHeight = '';
  }

  function openSettings() {
    if (state !== 'idle') return;
    view = 'settings';
    ui.nameInput.value = store.name || '';
    ui.nameInput.placeholder = OWN_NAMES[browserLanguage];
    ui.delayInput.value = String(settings.delay / 1000);
    ui.failuresInput.value = String(settings.maxFailures);
    ui.languageSelect.value = settings.language;
    render();
    ui.nameInput.focus({ preventScroll: true });
  }

  function closeSettings() {
    view = 'main';
    refresh();
  }

  function pickName(name) {
    save({ name });
    if (view === 'settings') ui.nameInput.value = name;
    refresh();
  }

  function applyLanguage() {
    lang = settings.language === 'auto' ? browserLanguage : settings.language;
    ui.panel.lang = lang;
    ui.launcher.lang = lang;
    for (const el of shadow.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
    for (const el of shadow.querySelectorAll('[data-t-label]')) {
      const label = t(el.dataset.tLabel);
      el.title = label;
      el.setAttribute('aria-label', label);
    }
    for (const el of shadow.querySelectorAll('[data-t-placeholder]')) {
      el.placeholder = t(el.dataset.tPlaceholder);
    }
    render();
  }

  function resetSettings() {
    save({ name: undefined, delay: undefined, maxFailures: undefined, language: undefined });
    applyLanguage();
    openSettings();
    refresh();
  }

  function setCollapsed(collapsed) {
    if (collapsed && state !== 'idle') return;
    save({ collapsed: collapsed || undefined });
    view = 'main';
    refresh();
    (collapsed ? ui.launcher : ui.settingsButton).focus({ preventScroll: true });
  }

  function clearLog() {
    ui.logList.replaceChildren();
    renderLog();
  }

  // ---------- Position ----------

  function moveTo(next) {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const panelWidth = Math.min(328, width - 16);
    position = {
      right: Math.round(clamp(next.right, [8, Math.max(8, width - panelWidth - 8)])),
      top: Math.round(clamp(next.top, [8, Math.max(8, height - 64)]))
    };
    for (const el of [ui.panel, ui.launcher]) {
      el.style.right = `${position.right}px`;
      el.style.top = `${position.top}px`;
    }
    ui.panel.style.maxHeight = `${height - position.top - 8}px`;
  }

  ui.head.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    event.preventDefault();

    const origin = { x: event.clientX, y: event.clientY, ...position };
    const drag = new AbortController();
    ui.head.setPointerCapture(event.pointerId);
    ui.panel.classList.add('dragging');

    ui.head.addEventListener('pointermove', move => {
      moveTo({ right: origin.right - (move.clientX - origin.x), top: origin.top + (move.clientY - origin.y) });
    }, { signal: drag.signal });

    const end = () => {
      drag.abort();
      ui.panel.classList.remove('dragging');
      save({ position });
    };
    ui.head.addEventListener('pointerup', end, { signal: drag.signal });
    ui.head.addEventListener('pointercancel', end, { signal: drag.signal });
  });

  addEventListener('resize', () => moveTo(position));

  // ---------- Events ----------

  shadow.addEventListener('click', event => {
    const control = event.target.closest('[data-action]');
    if (!control || control.disabled) return;

    switch (control.dataset.action) {
      case 'test': return prepare(1);
      case 'delete': return prepare(readLimit());
      case 'cancel': return cancel();
      case 'confirm': return confirmPlan();
      case 'pause': return requestPause('pausedButton');
      case 'resume': return resume();
      case 'stop': return stop();
      case 'settings': return openSettings();
      case 'back': return closeSettings();
      case 'collapse': return setCollapsed(true);
      case 'expand': return setCollapsed(false);
      case 'pick': return pickName(control.dataset.name);
      case 'show-message': return showMessage(logTargets.get(control));
      case 'reset': return resetSettings();
      case 'clear-log': return clearLog();
    }
  });

  ui.limitInput.addEventListener('input', renderControls);

  ui.nameInput.addEventListener('change', () => {
    save({ name: ui.nameInput.value.trim() || undefined });
    refresh();
  });

  ui.delayInput.addEventListener('change', () => {
    const value = Number.parseFloat(ui.delayInput.value);
    save({ delay: Number.isFinite(value) ? Math.round(clamp(value * 1000, RANGES.delay)) : undefined });
    ui.delayInput.value = String(settings.delay / 1000);
  });

  ui.failuresInput.addEventListener('change', () => {
    const value = Number.parseInt(ui.failuresInput.value, 10);
    save({ maxFailures: Number.isFinite(value) ? clamp(value, RANGES.maxFailures) : undefined });
    ui.failuresInput.value = String(settings.maxFailures);
  });

  ui.languageSelect.addEventListener('change', () => {
    const value = ui.languageSelect.value;
    save({ language: value === 'auto' ? undefined : value });
    applyLanguage();
  });

  shadow.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (view === 'settings') closeSettings();
    else if (state === 'confirm') cancel();
  });

  // Snapchat may react to keys typed in the panel.
  for (const type of ['keydown', 'keyup', 'keypress']) {
    host.addEventListener(type, event => event.stopPropagation());
  }

  // Any real action outside the panel pauses the run; Escape pauses it anywhere.
  for (const type of ['pointerdown', 'pointermove', 'keydown', 'wheel']) {
    document.addEventListener(type, event => {
      if (state !== 'running' || !event.isTrusted) return;
      if (event.key === 'Escape') requestPause('pausedButton');
      else if (!host.contains(event.target)) requestPause('pausedActivity');
    }, true);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) requestPause('pausedHidden');
    else tick();
  });

  function tick() {
    if (document.hidden) return;
    if (run) {
      renderClock();
      return;
    }
    if (state === 'confirm') {
      if (plan && location.href !== plan.url) {
        plan = null;
        state = 'idle';
        refresh();
      }
      return;
    }
    if (result && result.url !== location.href) result = null;
    refresh();
  }

  // ---------- Start ----------

  const saved = store.position;
  moveTo(saved && Number.isFinite(saved.right) && Number.isFinite(saved.top) ? saved : position);
  applyLanguage();
  refresh();
  setInterval(tick, CONFIG.refreshInterval);
})();
