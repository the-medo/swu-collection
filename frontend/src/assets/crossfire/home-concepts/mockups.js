const artRoot = 'https://images.swubase.com/cards/';
const decks = [
  {
    name: 'Force & focus',
    leader: 'Ahsoka Tano',
    subtitle: 'Trust in the Force',
    card: 'ahsoka-tano--trust-in-the-force-9-ashes-of-the-empire',
    base: 'Dagobah Swamp',
    colors: ['green', 'blue'],
    theme: 'ahsoka',
    note: 'Command / Vigilance',
  },
  {
    name: 'Pressure from above',
    leader: 'Boba Fett',
    subtitle: 'Any Methods Necessary',
    card: 'boba-fett--any-methods-necessary-9-jump-to-lightspeed',
    base: 'Command Center',
    colors: ['red', 'green'],
    theme: 'boba',
    note: 'Aggression / Command',
  },
  {
    name: 'Punch it',
    leader: 'Han Solo',
    subtitle: 'Never Tell Me the Odds',
    card: 'han-solo--never-tell-me-the-odds-17-jump-to-lightspeed',
    base: 'Chopper Base',
    colors: ['yellow', 'green'],
    theme: 'han',
    note: 'Cunning / Command',
  },
];
const publicDecks = [
  { ...decks[1], name: 'No questions asked', author: 'Nova' },
  { ...decks[2], name: 'The odds are optional', author: 'Rin' },
];
const deckSources = [
  ['recent', 'Last played'],
  ['mine', 'Your decks'],
  ['public', 'Public decks'],
];
const icons = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="m9 6-6 6 6 6M3 12h18"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  cards: '<rect x="7" y="5" width="13" height="16" rx="2"/><path d="M15 3H5a2 2 0 0 0-2 2v12"/>',
  history: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6M12 7v5l3 2"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  link: '<path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 12a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1" transform="translate(1 -1) scale(.92)"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  tune: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11z"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  bug: '<rect x="7" y="6" width="10" height="14" rx="5"/><path d="m8 3 2 3m6-3-2 3M3 9h4m10 0h4M3 15h4m10 0h4M12 7v13"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 5V3H3v13h2"/>',
  trophy:
    '<path d="M8 3h8v7a4 4 0 0 1-8 0zM12 14v6m-4 1h8M8 5H3v3a4 4 0 0 0 5 4m8-7h5v3a4 4 0 0 1-5 4"/>',
};
const icon = name =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.cards}</svg>`;
const params = new URLSearchParams(location.search);
const state = {
  concept: ['desk', 'room', 'quick'].includes(params.get('concept'))
    ? params.get('concept')
    : 'desk',
  theme:
    params.get('theme') === 'light'
      ? 'light'
      : params.get('concept') === 'quick' && !params.has('theme')
        ? 'light'
        : 'dark',
  empty: params.get('empty') === '1',
  selected: 0,
  selectedSource: 'mine',
  deckSection: 'recent',
  deckSearch: '',
  imported: false,
  library: 'games',
  step: 0,
  bestOf: '1',
  spectators: true,
  playerHands: false,
  spectatorHands: false,
};
const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
let previousFocus;
let toastTimer;
const hasOwnDecks = () => !state.empty || state.imported;
const hasDecks = () => hasOwnDecks() || state.selectedSource === 'public';
const deck = () => (state.selectedSource === 'public' ? publicDecks : decks)[state.selected];
const image = (d, side = 'back') => `${artRoot}${d.card}-${side}.webp`;
const mark = (extra = '') =>
  `<img class="grogu ${extra}" src="../logo-${state.theme}.svg" alt="" width="188" height="98" />`;
const dots = d =>
  `<span class="aspects" aria-label="${d.note}">${d.colors.map(c => `<i class="aspect-${c}"></i>`).join('')}</span>`;
const button = (label, action, style = 'secondary', extra = '') =>
  `<button class="button ${style}" data-action="${action}" ${extra}>${label}</button>`;
function brand() {
  return `<div class="brand">${mark()}<div><strong>CROSSFIRE</strong><small>BY SWUBASE</small></div></div>`;
}
function sidebar() {
  return `<aside class="sidebar"><a class="site-brand" href="#" data-action="site">SWU<span>BASE</span><small>YOUR GALAXY OF CARDS</small></a>
    <nav aria-label="SWUBASE"><span class="nav-label">EXPLORE</span>
      <button data-action="site">${icon('grid')} Card database</button><button data-action="site">${icon('trophy')} Tournaments</button>
      <span class="nav-label">YOUR SPACE</span><button class="nav-selected" aria-current="page">${mark()} Crossfire</button>
      <button data-action="site">${icon('cards')} Your decks</button><button data-action="site">${icon('grid')} Collections</button>
    </nav><div class="sidebar-foot"><span class="avatar">P</span><div>Player<small>SWUBASE account</small></div></div></aside>`;
}
function header() {
  return `<header class="page-header">${brand()}<span class="beta-label">BETA</span><div class="header-end">${button(`${icon('link')} Join game`, 'join', 'quiet')}<span class="avatar profile" aria-label="Sample player">P</span></div></header>`;
}
function activeGame(compact = false) {
  if (state.empty) return '';
  return `<section class="resume ${compact ? 'resume-compact' : ''}" aria-label="Game in progress"><span class="status-orbit">${icon('play')}</span><div><span class="eyebrow">GAME IN PROGRESS</span><strong>Your game with Nova</strong><small>Round 4 · Pick up where you left off</small></div>${button(`Return to game ${icon('arrow')}`, 'resume', 'quiet')}</section>`;
}
function selectedDeck() {
  if (!hasDecks())
    return `<button class="selected-deck no-deck" data-action="choose-deck">${icon('plus')}<span><strong>Choose a deck</strong><small>Select a SWUBASE deck or paste a link</small></span>${icon('chevron')}</button>`;
  const d = deck();
  return `<button class="selected-deck" data-action="choose-deck"><img class="leader-thumb" src="${image(d, 'front')}" alt="" /><span><strong>${d.name}</strong><small>${d.leader} · ${d.base}</small></span>${dots(d)}${icon('down')}</button>`;
}
function modeControl() {
  return `<fieldset class="mode-control"><legend class="field-label">Match format</legend><div class="segmented">${[
    ['1', 'Single game'],
    ['3', 'Best of three'],
  ]
    .map(
      ([value, label]) =>
        `<label><input type="radio" name="bestOf" data-setting="bestOf" value="${value}" ${state.bestOf === value ? 'checked' : ''}/><span>${label}</span></label>`,
    )
    .join('')}</div></fieldset>`;
}
function privacySummary() {
  return `${state.spectators ? 'Spectators allowed' : 'No spectators'} · ${state.playerHands ? 'Players see both hands' : 'Player hands private'}${state.spectators ? (state.spectatorHands ? ' · Spectators may reveal hands' : ' · Spectator hands hidden') : ''}`;
}
function settings() {
  return `${modeControl()}<fieldset class="visibility"><legend class="field-label">Game visibility</legend>
    <label><span>${icon('eye')}<span>Allow spectators<small>People with the invitation link can watch.</small></span></span><input type="checkbox" data-setting="spectators" ${state.spectators ? 'checked' : ''}/></label>
    <label><span>${icon('cards')}<span>Reveal both hands to players<small>Useful when learning or discussing a position.</small></span></span><input type="checkbox" data-setting="playerHands" ${state.playerHands ? 'checked' : ''}/></label>
    <label><span>${icon('eye')}<span>Let spectators reveal hands<small>Viewers can choose whether to see them.</small></span></span><input type="checkbox" data-setting="spectatorHands" ${state.spectators && state.spectatorHands ? 'checked' : ''} ${!state.spectators ? 'disabled' : ''}/></label>
  </fieldset><p class="consent-note">${icon('lock')} Your opponent accepts these settings before play begins.</p>`;
}
function joinPanel(id = 'join-link') {
  return `<section class="panel join-panel"><span class="panel-icon">${icon('link')}</span><h2>Have an invitation?</h2><p>Join a friend’s game, or watch if spectators are welcome.</p>
    <form data-form="join"><label class="field-label" for="${id}">Game invitation</label><div class="input-action"><input id="${id}" name="link" required placeholder="Paste an invitation link" autocomplete="off" />${button(icon('arrow'), 'submit', 'secondary', 'type="submit" aria-label="Open invitation"')}</div><p class="form-error" role="alert" hidden></p></form>
    <span class="subtle-caption">One link for players and spectators.</span></section>`;
}
const tabs = [
  ['games', 'history', 'Recent games'],
  ['saved', 'bookmark', 'Saved positions'],
  ['invites', 'link', 'Invitations'],
  ['reports', 'bug', 'Reports'],
];
function libraryBody(tab) {
  if (state.empty) {
    const empty = {
      games: [
        'Your first game starts here.',
        'Finished games and replays will appear here automatically.',
      ],
      saved: [
        'Keep a position worth revisiting.',
        'Bookmark a step during a game to find it here later.',
      ],
      invites: [
        'No practice invitations yet.',
        'Invitations to replay a saved position will appear here.',
      ],
      reports: ['Nothing to follow up on.', 'Reports you submit from a game will appear here.'],
    }[tab];
    return `<div class="empty-panel">${icon(tabs.find(t => t[0] === tab)[1])}<strong>${empty[0]}</strong><p>${empty[1]}</p></div>`;
  }
  if (tab === 'games')
    return `<div class="game-rows">${[
      ['N', 'Nova', 'Won', '7', 'Yesterday'],
      ['R', 'Rin', 'Lost', '6', 'Yesterday'],
      ['A', 'Alex', 'Won', '8', '2 days ago'],
    ]
      .map(
        ([initial, name, result, round, date]) =>
          `<article class="game-row"><span class="avatar opponent">${initial}</span><div class="row-title"><strong>vs. ${name}</strong><small>${date} · Round ${round}</small></div><span class="result ${result === 'Won' ? 'win' : 'loss'}">${result}</span>${button(`${icon('play')} Replay`, 'replay', 'quiet')}</article>`,
      )
      .join('')}</div>`;
  if (tab === 'saved')
    return `<div class="saved-grid">${[
      ['Before the final attack', 'Round 6 · vs. Nova'],
      ['A different deployment', 'Round 4 · vs. Alex'],
    ]
      .map(
        ([title, meta]) =>
          `<article class="saved-card"><span class="saved-icon">${icon('bookmark')}</span><h3>${title}</h3><p>${meta}</p><div>${button('Open replay', 'replay', 'quiet')}${button(`Practice ${icon('arrow')}`, 'practice', 'quiet')}</div></article>`,
      )
      .join('')}</div>`;
  if (tab === 'invites')
    return `<article class="invitation-row"><span class="avatar opponent">A</span><div><strong>Alex invited you to practice</strong><p>A different deployment · Round 4</p></div>${button('Review invitation', 'practice', 'secondary')}</article><p class="table-note">Practice starts only after both players agree.</p>`;
  return `<article class="report-row"><span class="panel-icon red">${icon('bug')}</span><div><strong>Target selection after resolving an ability</strong><p>Reported yesterday · Saved game position attached</p></div><span class="result pending">Open</span>${button('View report', 'report', 'quiet')}</article><p class="table-note">Report a problem from the game board to include its exact position.</p>`;
}
function library() {
  return `<section class="panel library" id="library"><div class="library-tabs" role="tablist" aria-label="Your Crossfire activity">${tabs.map(([key, glyph, label]) => `<button id="tab-${key}" role="tab" aria-controls="library-panel" aria-selected="${state.library === key}" tabindex="${state.library === key ? '0' : '-1'}" data-action="library" data-tab="${key}">${icon(glyph)}${label}${key === 'invites' && !state.empty ? '<span class="count">1</span>' : ''}</button>`).join('')}</div><div id="library-panel" role="tabpanel" aria-labelledby="tab-${state.library}" tabindex="0">${libraryBody(state.library)}</div></section>`;
}
function deckArt(d, extra = '') {
  return `<div class="deck-art ${d.theme} ${extra}"><img src="${image(d)}" alt="${d.leader}" /><div class="art-shade"></div></div>`;
}
function desk() {
  return `<div class="app-shell desk">${sidebar()}<main id="main-content" class="main-content">${header()}<div class="content-width">
    <div class="section-heading"><div><span class="eyebrow">THE PLAYGROUND</span><h1>Your next game.</h1></div><p>A familiar deck. A fresh challenge.</p></div>
    ${activeGame()}<div class="desk-grid"><section class="play-panel"><div class="play-content"><span class="eyebrow">PLAY WITH A FRIEND</span><h2>Bring a deck.<br/>Make your move.</h2><p>Choose your deck, create an invitation,<br class="desktop-only"/> and meet your opponent at the table.</p><span class="field-label">YOUR DECK</span>${selectedDeck()}<div class="play-actions">${button(`${hasDecks() ? 'Create invitation' : 'Choose a deck'} ${icon('arrow')}`, hasDecks() ? 'create' : 'choose-deck', 'primary')}${button(icon('tune'), 'settings', 'icon-button', 'aria-label="Game settings"')}</div><span class="setup-summary" data-setup-summary>${state.bestOf === '3' ? 'Best of three' : 'Single game'} · ${privacySummary()}</span></div><div class="hero-art" aria-hidden="true">${deckArt(deck())}<span class="hero-art-label">${deck().leader}<small>${deck().subtitle}</small></span></div></section>${joinPanel()}</div>
    ${library()}<footer class="page-foot"><span>Play. Review. Try another line.</span><span>Star Wars: Unlimited on SWUBASE</span></footer>
  </div></main></div>`;
}
// Keep the original B query key so existing comparison links still work.
function room() {
  return `<div class="app-shell desk refined-desk">${sidebar()}<main id="main-content" class="main-content">${header()}<div class="content-width">
    <div class="section-heading"><div><span class="eyebrow">THE PLAYGROUND</span><h1>Your next game.</h1></div><p>A familiar deck. A fresh challenge.</p></div>
    <div class="desk-grid refined-grid"><section class="play-panel refined-play-panel">${deckAccordion()}<div class="refined-preview">${refinedPreview()}</div></section><aside class="quick-aside refined-aside">${activeGame(true)}${joinPanel()}</aside></div>
    ${library()}<footer class="page-foot"><span>Play. Review. Try another line.</span><span>Star Wars: Unlimited on SWUBASE</span></footer>
  </div></main></div>`;
}
function refinedPreview() {
  return `<div class="refined-copy"><span class="eyebrow">PLAY WITH A FRIEND</span><h2>Make your move.</h2></div><div class="hero-art refined-art" aria-hidden="true">${deckArt(deck())}</div><div class="refined-launch"><div class="refined-selection"><span class="field-label">${hasDecks() ? 'SELECTED DECK' : 'YOUR NEXT GAME'}</span><strong>${hasDecks() ? deck().name : 'Choose a deck to begin.'}</strong><small>${hasDecks() ? `${deck().leader} · ${deck().base}` : 'Your collection, a recent favourite, or a public deck.'}</small></div><span class="setup-summary" data-setup-summary>${state.bestOf === '3' ? 'Best of three' : 'Single game'} · ${privacySummary()}</span>${button(`${icon('tune')} Game settings`, 'settings', 'quiet')}${button(`Create invitation ${icon('arrow')}`, 'create', 'primary', hasDecks() ? '' : 'disabled')}</div>`;
}
function browserDecks(section) {
  if (section === 'public')
    return publicDecks.map((d, index) => ({
      d,
      index,
      source: 'public',
      meta: `Public deck · by ${d.author}`,
    }));
  if (section === 'recent')
    return state.empty
      ? []
      : [0, 2].map((index, i) => ({
          d: decks[index],
          index,
          source: 'mine',
          meta: i === 0 ? 'Last played yesterday · vs. Nova' : 'Last played 2 days ago · vs. Alex',
        }));
  return hasOwnDecks()
    ? decks.map((d, index) => ({
        d,
        index,
        source: 'mine',
        meta: 'Your deck · 50 cards · 10 sideboard',
      }))
    : [];
}
function deckBrowserResults(section) {
  const all = browserDecks(section);
  const search = state.deckSearch.trim().toLowerCase();
  const found = all.filter(({ d }) =>
    [d.name, d.leader, d.base, d.author || ''].join(' ').toLowerCase().includes(search),
  );
  if (!found.length) {
    const title = all.length
      ? 'No matching decks'
      : section === 'recent'
        ? 'Your first game is still ahead.'
        : 'No saved decks yet.';
    const description = all.length
      ? 'Try another deck, leader or base name.'
      : 'Browse public decks or use a shared SWUBASE deck link.';
    return `<div class="empty-panel">${icon(all.length ? 'search' : 'cards')}<strong>${title}</strong><p>${description}</p>${!all.length ? button('Browse public decks', 'deck-source', 'secondary', 'data-source="public"') : ''}</div><p class="deck-result-count" role="status">0 decks</p>`;
  }
  return `<div class="browser-deck-list">${found.map(({ d, index, source, meta }) => `<button class="browser-deck" data-action="select-deck" data-source="${source}" data-deck="${index}" aria-pressed="${state.selected === index && state.selectedSource === source && hasDecks()}">${deckArt(d, 'picker-deck-art')}<span class="browser-deck-copy"><strong>${d.name}</strong><span>${d.leader} · ${d.base}</span><small>${dots(d)}${meta}</small></span><span class="browser-deck-check">${icon(state.selected === index && state.selectedSource === source && hasDecks() ? 'check' : 'arrow')}</span></button>`).join('')}</div><p class="deck-result-count" role="status">${found.length} ${found.length === 1 ? 'deck' : 'decks'} · Sample data</p>`;
}
function deckAccordion() {
  return `<div class="deck-picker"><div class="deck-picker-heading"><h2>Choose your deck</h2><p>A recent favourite, or something new.</p></div><label class="deck-picker-search">${icon('search')}<input id="deck-browser-search" type="search" placeholder="Search decks, leaders or bases…" aria-label="Search all deck sources" autocomplete="off" /></label><div class="deck-groups">${deckSources.map(([key, label]) => `<section class="deck-group" data-section="${key}" data-expanded="${state.deckSection === key}"><h3><button id="deck-source-${key}" data-action="toggle-deck-source" data-source="${key}" aria-expanded="${state.deckSection === key}" aria-controls="deck-panel-${key}">${icon(key === 'recent' ? 'history' : key === 'mine' ? 'cards' : 'grid')}<span>${label}</span>${icon('down')}</button></h3><div id="deck-panel-${key}" class="deck-source-panel" role="region" aria-labelledby="deck-source-${key}" tabindex="0" ${state.deckSection === key ? '' : 'hidden'}>${deckBrowserResults(key)}</div></section>`).join('')}</div><div class="deck-picker-footer">${button(`${icon('link')} Use a deck link`, 'paste', 'quiet full')}</div></div>`;
}
function showDeckSource(source, toggle = false) {
  state.deckSection = toggle && state.deckSection === source ? null : source;
  document.querySelectorAll('.deck-group').forEach(group => {
    const expanded = group.dataset.section === state.deckSection;
    group.dataset.expanded = String(expanded);
    group.querySelector('h3 button').setAttribute('aria-expanded', String(expanded));
    group.querySelector('.deck-source-panel').hidden = !expanded;
  });
  document.querySelector(`#deck-source-${source}`).focus({ preventScroll: true });
}
function updateInlineSelection() {
  app.querySelector('.refined-preview').innerHTML = refinedPreview();
  app.querySelectorAll('.browser-deck').forEach(row => {
    const selected =
      Number(row.dataset.deck) === state.selected && row.dataset.source === state.selectedSource;
    row.setAttribute('aria-pressed', String(selected));
    row.querySelector('.browser-deck-check').innerHTML = icon(selected ? 'check' : 'arrow');
  });
}
function deckChoices() {
  if (!hasOwnDecks())
    return `<div class="empty-decks small">${icon('cards')}<h3>No saved decks yet</h3><p>You can start with a shared SWUBASE deck link.</p>${button('Paste a deck link', 'paste', 'secondary')}</div>`;
  return `<div class="deck-choices" role="group" aria-label="Choose a deck">${decks.map((d, index) => `<button class="deck-choice" aria-pressed="${state.selectedSource === 'mine' && state.selected === index}" data-action="select-deck" data-deck="${index}"><img class="leader-thumb" src="${image(d, 'front')}" alt=""/><span><strong>${d.name}</strong><small>${d.leader} · ${d.base}</small></span><span class="radio-mark">${state.selectedSource === 'mine' && state.selected === index ? icon('check') : ''}</span></button>`).join('')}</div>`;
}
function invitationPreview() {
  return `<div class="invitation-ready"><span class="success-mark">${icon('check')}</span><h3>Your invitation is ready.</h3><p>Send the link to your opponent. They’ll choose a deck and accept your game settings.</p><label class="field-label" for="created-link">Invitation link</label><div class="input-action"><input id="created-link" readonly value="https://swubase.com/crossfire/example-invitation" />${button(icon('copy'), 'copy', 'primary', 'aria-label="Copy example invitation"')}</div><div class="invite-recap"><strong>${deck().name}</strong><span>${state.bestOf === '3' ? 'Best of three' : 'Single game'} · ${privacySummary()}</span></div><p class="prototype-note">Example invitation only. No game has been created.</p></div>`;
}
function quick() {
  const stepTitles = ['Choose a deck', 'Game settings', 'Invite your opponent'];
  return `<div class="app-shell quick">${sidebar()}<main id="main-content" class="main-content">${header()}<div class="quick-content"><div class="section-heading"><div><span class="eyebrow">MAKE ROOM FOR A GAME</span><h1>A few clicks from the table.</h1></div></div>
    <div class="quick-grid"><section class="panel wizard"><div class="wizard-header"><h2>Start a game</h2><span>Step ${state.step + 1} of 3</span></div><ol class="steps">${stepTitles.map((label, i) => `<li ${i === state.step ? 'aria-current="step"' : ''} class="${i <= state.step ? 'reached' : ''}"><span>${i < state.step ? icon('check') : i + 1}</span>${label}</li>`).join('')}</ol>
    <div class="wizard-body">${state.step === 0 ? `<span class="eyebrow">01 / YOUR DECK</span><h3>What will you bring?</h3><p>Pick one of your SWUBASE decks.</p>${deckChoices()}<button class="text-button" data-action="paste">${icon('link')} Use a deck link instead</button>` : state.step === 1 ? `<span class="eyebrow">02 / YOUR GAME</span><h3>Set the table.</h3><p><strong>${deck().name}</strong> · ${deck().leader}</p>${settings()}` : invitationPreview()}</div>
    <div class="wizard-footer">${state.step > 0 ? button(`${icon('back')} Back`, 'previous', 'quiet') : '<span class="muted">Your deck stays in SWUBASE.</span>'}${state.step === 2 ? button('Start another', 'restart', 'primary') : button(`${state.step === 1 ? 'Create invitation' : 'Continue'} ${icon('arrow')}`, 'next', 'primary', !hasDecks() ? 'disabled' : '')}</div></section>
    <aside class="quick-aside">${activeGame(true)}<section class="panel quick-join"><h2>Joining someone?</h2><p>Already have a game link? Go straight to their invitation.</p>${button(`${icon('link')} Open an invitation`, 'join', 'secondary')}</section><section class="quick-links"><span class="eyebrow">YOUR CROSSFIRE</span>${tabs.map(([key, glyph, label]) => `<button data-action="library" data-tab="${key}">${icon(glyph)}<span>${label}</span>${icon('chevron')}</button>`).join('')}</section></aside></div>
    <footer class="page-foot"><span>First game or fiftieth. Welcome to the table.</span><span>Star Wars: Unlimited on SWUBASE</span></footer></div></main></div>`;
}
function render() {
  document.documentElement.dataset.theme = state.theme;
  document.body.dataset.concept = state.concept;
  document
    .querySelectorAll('.concept-switch [data-concept]')
    .forEach(b =>
      b.setAttribute('aria-current', b.dataset.concept === state.concept ? 'page' : 'false'),
    );
  document.querySelector('#empty-toggle').setAttribute('aria-pressed', String(state.empty));
  const toggle = document.querySelector('#theme-toggle');
  toggle.innerHTML = icon(state.theme === 'dark' ? 'sun' : 'moon');
  toggle.setAttribute('aria-label', `Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme`);
  app.innerHTML = { desk, room, quick }[state.concept]();
  if (state.concept === 'room') app.querySelector('#deck-browser-search').value = state.deckSearch;
  const query = new URLSearchParams({ concept: state.concept, theme: state.theme });
  if (state.empty) query.set('empty', '1');
  history.replaceState(null, '', `?${query}`);
}
function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 4500);
}
function openDialog(title, body) {
  if (!modal.open) previousFocus = document.activeElement;
  modal.className = '';
  modal.innerHTML = `<div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button></div><div class="modal-body">${body}</div>`;
  if (!modal.open) modal.showModal();
  else modal.querySelector('button')?.focus();
}
function closeDialog() {
  modal.close();
  if (previousFocus?.isConnected) previousFocus.focus();
}
function focusWizardHeading() {
  const heading = app.querySelector('.wizard h3');
  heading?.setAttribute('tabindex', '-1');
  heading?.focus();
}
function showPaste() {
  openDialog(
    'Use a SWUBASE deck',
    `<p>Paste a deck link from your collection or one shared with you.</p><form data-form="paste"><label class="field-label" for="deck-link">SWUBASE deck link</label><input id="deck-link" name="link" type="url" required placeholder="https://swubase.com/decks/…" /><p class="form-error" role="alert" hidden></p><p class="prototype-note">This preview loads the sample Ahsoka deck for any valid SWUBASE deck link.</p>${button(`Use this deck ${icon('arrow')}`, 'submit', 'primary full', 'type="submit"')}</form>`,
  );
}
function showLibrary(key) {
  state.library = key;
  if (state.concept === 'quick') openDialog(tabs.find(t => t[0] === key)[2], libraryBody(key));
  else {
    const y = scrollY;
    render();
    scrollTo(0, y);
    document.querySelector(`#tab-${key}`).focus({ preventScroll: true });
    document.querySelector('#library').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
function create() {
  if (!hasDecks()) return;
  openDialog('Invite your opponent', invitationPreview());
}
function handleAction(buttonNode) {
  const action = buttonNode.dataset.action;
  if (action === 'close') closeDialog();
  else if (action === 'site') notify('This would open the corresponding SWUBASE page.');
  else if (action === 'choose-deck') {
    if (state.concept === 'room') {
      showDeckSource(state.deckSection || 'recent');
    } else
      openDialog(
        'Choose your deck',
        `${deckChoices()}${button(`${icon('link')} Use a deck link`, 'paste', 'quiet full')}`,
      );
  } else if (action === 'deck-source') showDeckSource(buttonNode.dataset.source);
  else if (action === 'toggle-deck-source') showDeckSource(buttonNode.dataset.source, true);
  else if (action === 'select-deck') {
    state.selected = Number(buttonNode.dataset.deck);
    state.selectedSource = buttonNode.dataset.source === 'public' ? 'public' : 'mine';
    if (state.concept === 'room' && !modal.open) {
      updateInlineSelection();
      return;
    }
    const wasOpen = modal.open;
    closeDialog();
    render();
    if (wasOpen) app.querySelector('[data-action="choose-deck"]')?.focus();
    else app.querySelector(`[data-action="select-deck"][data-deck="${state.selected}"]`)?.focus();
  } else if (action === 'paste') showPaste();
  else if (action === 'settings')
    openDialog('Game settings', `${settings()}${button('Done', 'save-settings', 'primary full')}`);
  else if (action === 'save-settings') {
    closeDialog();
    render();
    app.querySelector('[data-action="settings"]')?.focus();
  } else if (action === 'create') create();
  else if (action === 'next') {
    if (hasDecks()) {
      state.step = Math.min(2, state.step + 1);
      render();
      focusWizardHeading();
    }
  } else if (action === 'previous') {
    state.step = Math.max(0, state.step - 1);
    render();
    focusWizardHeading();
  } else if (action === 'restart') {
    state.step = 0;
    render();
    focusWizardHeading();
  } else if (action === 'join') openDialog('Join a game', joinPanel('modal-join-link'));
  else if (action === 'library') showLibrary(buttonNode.dataset.tab);
  else if (action === 'copy') {
    if (!navigator.clipboard) {
      notify('Select the example link to copy it.');
      return;
    }
    navigator.clipboard
      .writeText('https://swubase.com/crossfire/example-invitation')
      .then(() => notify('Example link copied. It does not open a real game.'))
      .catch(() => notify('Select the example link to copy it.'));
  } else if (action === 'resume')
    openDialog(
      'Return to your game',
      `<div class="preview-position">${mark()}<h3>You vs. Nova</h3><p>Game in progress · Round 4</p></div><p class="prototype-note">In Crossfire this takes you straight back to the existing game. This HTML preview does not connect to a game.</p>`,
    );
  else if (action === 'replay')
    openDialog(
      'Game replay',
      `<div class="preview-position">${icon('history')}<h3>Review the game, one action at a time.</h3><p>This opens the existing Crossfire replay viewer, at the saved step when opening a bookmark.</p></div><p class="prototype-note">Navigation preview only.</p>`,
    );
  else if (action === 'practice')
    openDialog(
      'Practice this position',
      `<span class="eyebrow">SAVED POSITION · ROUND 4</span><h3>A different deployment</h3><p>Invite the original opponent to play again from here. Both players need to accept before the practice game starts.</p>${button('Preview practice invitation', 'practice-preview', 'primary full')}`,
    );
  else if (action === 'practice-preview')
    notify('Practice invitation preview. Nothing has been sent.');
  else if (action === 'report')
    openDialog(
      'Your saved report',
      `<span class="result pending">Open</span><h3>Target selection after resolving an ability</h3><p>A note from the player and the saved game position appear together here.</p>${button('Open reported position', 'replay', 'secondary')}<p class="prototype-note">Example report. No report is submitted by this preview.</p>`,
    );
}
document.addEventListener('click', event => {
  const design = event.target.closest('.concept-switch [data-concept]');
  if (design) {
    closeDialog();
    state.concept = design.dataset.concept;
    if (state.concept !== 'room' && state.selectedSource === 'public') {
      state.selectedSource = 'mine';
      state.selected = 0;
    }
    state.theme = state.concept === 'quick' ? 'light' : 'dark';
    state.step = 0;
    render();
    scrollTo(0, 0);
    return;
  }
  const target = event.target.closest('[data-action]');
  if (target) {
    if (target.dataset.action === 'submit') return;
    event.preventDefault();
    handleAction(target);
  }
});
document.querySelector('#theme-toggle').addEventListener('click', () => {
  closeDialog();
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  render();
});
document.querySelector('#empty-toggle').addEventListener('click', () => {
  closeDialog();
  state.empty = !state.empty;
  state.imported = false;
  state.selectedSource = 'mine';
  state.selected = 0;
  state.step = 0;
  render();
});
modal.addEventListener('close', () => {
  if (modal.open) return;
  modal.innerHTML = '';
  if (previousFocus?.isConnected) previousFocus.focus();
});
modal.addEventListener('click', event => {
  if (event.target === modal) closeDialog();
});
document.addEventListener('change', event => {
  const setting = event.target.dataset.setting;
  if (!setting) return;
  state[setting] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
  if (setting === 'spectators') {
    if (!state.spectators) state.spectatorHands = false;
    const linked = document.querySelector('[data-setting="spectatorHands"]');
    if (linked) {
      linked.disabled = !state.spectators;
      linked.checked = state.spectatorHands;
    }
  }
});
document.addEventListener('change', () => {
  document.querySelectorAll('[data-setup-summary]').forEach(summary => {
    summary.textContent = `${state.bestOf === '3' ? 'Best of three' : 'Single game'} · ${privacySummary()}`;
  });
});
document.addEventListener('input', event => {
  if (event.target.id !== 'deck-browser-search') return;
  state.deckSearch = event.target.value;
  document.querySelectorAll('.deck-group').forEach(group => {
    group.querySelector('.deck-source-panel').innerHTML = deckBrowserResults(group.dataset.section);
  });
});
document.addEventListener('submit', event => {
  const form = event.target;
  if (!form.dataset.form) return;
  event.preventDefault();
  const value = new FormData(form).get('link')?.trim() ?? '';
  let valid = false;
  try {
    const url = new URL(value);
    valid =
      url.hostname === 'swubase.com' &&
      url.protocol === 'https:' &&
      url.pathname.startsWith(form.dataset.form === 'paste' ? '/decks/' : '/crossfire/') &&
      url.pathname.split('/').filter(Boolean).length >= 2;
  } catch {
    valid = form.dataset.form === 'join' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
  }
  const error = form.querySelector('.form-error');
  if (!valid) {
    error.textContent =
      form.dataset.form === 'paste'
        ? 'Enter a SWUBASE deck link.'
        : 'Enter a Crossfire invitation link or ID.';
    error.hidden = false;
    return;
  }
  if (form.dataset.form === 'paste') {
    state.imported = true;
    state.selectedSource = 'mine';
    state.selected = 0;
    closeDialog();
    render();
    notify('Sample Ahsoka deck selected for this preview.');
  } else
    openDialog(
      'Invitation preview',
      `<div class="preview-position">${mark()}<h3>Join your friend at the table.</h3><p>The invitation shows their game settings, then lets you select a deck or spectate when allowed.</p></div><p class="prototype-note">A real invitation is not loaded in this HTML preview.</p>`,
    );
});
document.addEventListener('keydown', event => {
  const accordionHeader = event.target.closest('[data-action="toggle-deck-source"]');
  if (accordionHeader && ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const index = deckSources.findIndex(([key]) => key === accordionHeader.dataset.source);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? deckSources.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + deckSources.length) %
            deckSources.length;
    document.querySelector(`#deck-source-${deckSources[next][0]}`).focus({ preventScroll: true });
    return;
  }
  const tab = event.target.closest('[role="tab"]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const index = tabs.findIndex(t => t[0] === state.library);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  showLibrary(tabs[next][0]);
});
render();
