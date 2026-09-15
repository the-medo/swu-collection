import type { Page } from 'playwright';
import {
  applyViewDelta,
  serverMessageSchema,
  type GameView,
  type VisibleDecision,
} from '../view/types.ts';

type Option = VisibleDecision['options'][number];
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
/** Observe only the same public socket messages the browser receives. Commands
 * are always submitted with real rendered card, target and confirmation clicks. */
export class BoardDriver {
  view: GameView | null = null;
  sentCommands = 0;
  constructor(readonly page: Page) {
    page.on('websocket', socket => {
      if (!socket.url().includes('/crossfire/')) return;
      socket.on('framereceived', frame => {
        try {
          const message = serverMessageSchema.parse(JSON.parse(frame.payload.toString()));
          if (message.type === 'snapshot') this.view = message.view;
          if (message.type === 'delta' && this.view)
            this.view = applyViewDelta(this.view, message.delta);
        } catch {
          /* Other application websocket messages are outside this driver. */
        }
      });
      socket.on('framesent', frame => {
        try {
          if (JSON.parse(frame.payload.toString()).type === 'command') this.sentCommands++;
        } catch {
          /* ignore handshake */
        }
      });
    });
  }
  async ready() {
    for (let i = 0; i < 150; i++) {
      const view = this.view;
      if (
        view &&
        (await this.page.locator(`.cf-match[data-view-revision="${view.revision}"]`).count())
      )
        return view;
      await delay(100);
    }
    throw new Error('Board did not receive and render its view');
  }
  async refresh() {
    this.view = null;
    await this.page.reload();
    const view = await this.ready();
    const dismiss = this.page.getByRole('button', { name: 'Dismiss', exact: true });
    if (await dismiss.count()) await dismiss.click();
    return view;
  }
  card(id: string) {
    return this.page
      .locator(
        `.cf-choice-cards [data-card-handle="${id}"]:visible, [data-card-handle="${id}"]:visible`,
      )
      .last();
  }
  async press(id: string) {
    // Bring an overlapped hand card forward using the same keyboard affordance
    // available to a player, then click its full face. Never force covered clicks.
    const group = this.page.locator(`[data-token-handles~="${id}"]`);
    if (!(await this.card(id).count()) && (await group.count())) await group.click();
    let card = this.card(id);
    if (await card.evaluate(element => !!element.closest('.cf-upgrade-underlay'))) {
      // Upgrade art is physically covered except for its bottom modifier strip.
      const box = (await card.boundingBox())!;
      await card.click({ position: { x: box.width / 2, y: box.height - 5 } });
      return;
    }
    await card.focus();
    const coveredByChoice = await card.evaluate(element => {
      if (element.closest('.cf-choice-dialog')) return false;
      const box = element.getBoundingClientRect();
      return !!document
        .elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
        ?.closest('.cf-choice-dialog');
    });
    if (coveredByChoice)
      await this.page.getByRole('button', { name: 'Hide choice to see the board' }).click();
    const inResourceRow = await card.evaluate(element => !!element.closest('.cf-resource-row'));
    await card.click();
    if (inResourceRow && (await this.page.locator('.cf-pile-dialog').count())) {
      card = this.card(id);
      await card.click();
    }
    if (coveredByChoice) {
      const restore = this.page.getByRole('button', { name: 'Show choice', exact: true });
      if (await restore.count()) await restore.click();
    }
  }
  async select(ids: string[]) {
    for (const id of ids) await this.press(id);
  }
  async choose(option: Option, selections: string[] = [], namedCard?: string) {
    const view = await this.ready(),
      decision = view.decision;
    if (!decision?.options.some(o => o.id === option.id))
      throw new Error('Driver chose an obsolete option');
    const plotNotice = this.page.locator('.cf-plot-reveal-dialog');
    if (await plotNotice.count())
      await plotNotice.getByRole('button', { name: 'Got it', exact: true }).click();
    if (namedCard) {
      await this.page.getByRole('combobox', { name: 'Name a card', exact: true }).click();
      await this.page
        .getByRole('combobox', { name: 'Search card titles', exact: true })
        .fill(namedCard);
      await this.page.getByRole('option', { name: namedCard, exact: true }).click();
    }
    if (decision.selection?.allocation) {
      const first = decision.selection.cards.find(
        id =>
          (decision.selection!.allocation!.limits[id] ?? 0) >=
          (decision.selection!.allocation!.quantum ?? 1),
      );
      if (first) {
        await this.press(first);
        if ((await this.card(first).getAttribute('aria-pressed')) !== 'true')
          throw new Error('Clicking a card did not allocate to it');
      }
      if (first)
        await this.page
          .locator(`[data-assignment-card="${first}"] .cf-assignment-controls button`)
          .first()
          .click();
      const quantum = decision.selection.allocation.quantum ?? 1;
      for (const id of decision.selection.cards) {
        const amount = selections.filter(c => c === id).length;
        for (let n = 0; n < amount; n += quantum)
          await this.page
            .locator(`[data-assignment-card="${id}"] .cf-assignment-controls button`)
            .last()
            .click();
      }
    } else await this.select(selections);
    const source = ['play', 'attack', 'use-ability'].includes(option.kind)
      ? option.cards[0]
      : option.kind === 'trigger'
        ? option.ability?.source.currentCardId
        : option.kind === 'delayed'
          ? option.delayed?.source.currentCardId
          : undefined;
    const target = ['play', 'attack', 'use-ability'].includes(option.kind)
      ? option.cards[1]
      : undefined;
    const direct = ['target', 'keep-unique'].includes(option.kind) ? option.cards[0] : undefined;
    if (decision.effect === 'plot-play') {
      const prompt = this.page.locator('.cf-plot-prompt');
      if (option.kind === 'play') {
        const payment = prompt.getByRole('switch', { name: 'Pay with other resources' });
        if (
          (await payment.count()) &&
          (await payment.getAttribute('aria-checked')) !== String(!!option.plot?.useOtherResources)
        )
          await payment.click();
        await prompt
          .getByRole('button', { name: option.piloting ? 'Play as a pilot' : 'Play', exact: true })
          .click();
        if (target)
          await this.page
            .locator(`[data-card-handle="${target}"][data-target="true"]`)
            .first()
            .click();
      } else await prompt.getByRole('button', { name: 'Skip', exact: true }).click();
    } else if (source && (await this.card(source).count())) {
      await this.press(source);
      // A sole untargeted action executes immediately. A choice opens a card
      // popover; target variants deliberately occupy one menu item.
      if (await this.page.locator('.cf-card-menu').count()) {
        const equivalent =
          decision.options.find(
            o =>
              o.cards[0] === source &&
              o.kind === option.kind &&
              o.action?.id === option.action?.id &&
              o.piloting === option.piloting &&
              JSON.stringify(o.smuggle) === JSON.stringify(option.smuggle) &&
              o.plot?.useOtherResources === option.plot?.useOtherResources &&
              o.mode === option.mode,
          ) ?? option;
        await this.page.locator(`.cf-card-menu [data-option-id="${equivalent.id}"]`).click();
      }
      if (target) {
        await this.page
          .locator(`[data-card-handle="${target}"][data-target="true"]`)
          .first()
          .click();
        if (await this.page.locator(`.cf-card-menu [data-option-id="${option.id}"]`).count())
          await this.page.locator(`.cf-card-menu [data-option-id="${option.id}"]`).click();
      }
    } else if (direct && (await this.card(direct).count())) await this.press(direct);
    else await this.page.locator(`[data-option-id="${option.id}"]`).click();
    await this.page.waitForFunction(
      old => document.querySelector('.cf-match')?.getAttribute('data-decision-id') !== old,
      decision.id,
    );
    return this.ready();
  }
}
