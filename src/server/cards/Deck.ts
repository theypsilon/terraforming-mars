import {SerializedDeck} from './SerializedDeck';
import {cardsFromJSON, ceosFromJSON, corporationCardsFromJSON, preludesFromJSON} from '../createCard';
import {CardName} from '../../common/cards/CardName';
import {Random} from '../../common/utils/Random';
import {ICorporationCard} from './corporation/ICorporationCard';
import {IProjectCard} from './IProjectCard';
import {inplaceShuffle} from '../utils/shuffle';
import {Logger} from '../logs/Logger';
import {IPreludeCard} from './prelude/IPreludeCard';
import {ICeoCard} from './ceos/ICeoCard';
import {copyAndClear, toName} from '../../common/utils/utils';
import {Named} from '@/common/Types';

/**
 * What a deck does with its discard pile when the discards come back into play.
 *
 * 'shuffle' is the standard behavior. 'fifo' is the Open Cards behavior, where the deck
 * order is never randomized after set-up, so the oldest discard is drawn first.
 */
export type DeckRecycleMode = 'shuffle' | 'fifo';

/**
 * A deck of cards to draw from, and also its discard pile.
 */
export class Deck<T extends Named<CardName>> {
  private readonly type: string;
  public drawPile: Array<T>;
  public discardPile: Array<T>;
  private readonly random: Random;
  private readonly recycleMode: DeckRecycleMode;

  // Exposing shuffle so it can be replaced in tests.
  public static shuffle(array: Array<any>, random: Random) {
    inplaceShuffle(array, random);
  }

  protected constructor(type: string, drawPile: Array<T>, discards: Array<T>, random: Random, recycleMode: DeckRecycleMode = 'shuffle') {
    this.type = type;
    this.drawPile = drawPile;
    this.discardPile = discards;
    this.random = random;
    this.recycleMode = recycleMode;
  }

  public shuffle(cardsOnTop: ReadonlyArray<CardName> = []) {
    const copy = [...this.drawPile, ...this.discardPile];
    this.drawPile.splice(0, this.drawPile.length);
    this.discardPile.splice(0, this.discardPile.length);

    if (cardsOnTop.length === 0) {
      Deck.shuffle(copy, this.random);
      this.drawPile.push(...copy);
    } else {
      const set = new Set(cardsOnTop);
      const top: Array<T> = [];
      const rest: Array<T> = [];
      copy.forEach((card) => {
        if (set.has(card.name)) {
          top.push(card);
        } else {
          rest.push(card);
        }
      });
      inplaceShuffle(top, this.random);
      inplaceShuffle(rest, this.random);
      this.drawPile.push(...rest, ...top);
    }
  }

  /**
   * Moves the discard pile into the draw pile, to be drawn after the cards already there.
   *
   * The whole deck is shuffled, unless this deck recycles FIFO, where the discards keep
   * the order they were discarded in, oldest first.
   */
  public recycle(): void {
    if (this.recycleMode === 'shuffle') {
      this.shuffle();
      return;
    }
    const discards = copyAndClear(this.discardPile);
    // The draw pile is drawn from its end, so the oldest discard goes closest to it.
    discards.reverse();
    this.drawPile.unshift(...discards);
  }

  /** The draw pile, in the order the cards will be drawn. */
  public inDrawOrder(): Array<T> {
    return [...this.drawPile].reverse();
  }

  public draw(logger: Logger, source: 'top' | 'bottom' = 'top'): T | undefined {
    this.shuffleIfNecessary(logger);
    const card = source === 'top' ? this.drawPile.pop() : this.drawPile.shift();
    this.shuffleIfNecessary(logger);
    return card;
  }

  public drawN(logger: Logger, count: number, source: 'top' | 'bottom' = 'top'): Array<T> {
    const cards: Array<T> = [];
    for (let idx = 0; idx < count; idx++) {
      const card = this.draw(logger, source);
      if (card === undefined) {
        break;
      }
      cards.push(card);
    }
    return cards;
  }

  drawNOrThrow(logger: Logger, count: number): Array<T> {
    const cards: Array<T> = [];
    for (let idx = 0; idx < count; idx++) {
      cards.push(this.drawOrThrow(logger));
    }
    return cards;
  }

  public size(): number {
    return this.drawPile.length + this.discardPile.length;
  }

  public canDraw(count: number): boolean {
    return this.size() >= count;
  }

  private shuffleIfNecessary(logger: Logger) {
    if (this.drawPile.length === 0 && this.discardPile.length !== 0) {
      if (this.recycleMode === 'fifo') {
        logger.log(`The ${this.type} discard pile has become the new deck.`);
      } else {
        logger.log(`The ${this.type} discard pile has been shuffled to form a new deck.`);
      }
      this.recycle();
    }
  }

  public drawOrThrow(logger: Logger, source: 'top' | 'bottom' = 'top'): T {
    const card = this.draw(logger, source);
    if (card === undefined) {
      throw new Error(`Unexpected empty ${this.type} deck`);
    }
    return card;
  }

  /**
   * @deprecated use drawByConditionOrThrow, or create a safer version of drawByCondition
   */
  public drawByConditionLegacy(logger: Logger, total: number, include: (card: T) => boolean) {
    return this.drawByConditionOrThrow(logger, total, include);
  }

  public drawByConditionOrThrow(logger: Logger, total: number, include: (card: T) => boolean) {
    const result: Array<T> = [];
    const discardedCards = new Array<CardName>();

    while (result.length < total) {
      if (discardedCards.length >= this.drawPile.length + this.discardPile.length) {
        logger.log(`discarded every ${this.type} card without a match`);
        break;
      }
      const projectCard = this.drawOrThrow(logger);
      if (include(projectCard)) {
        result.push(projectCard);
      } else {
        discardedCards.push(projectCard.name);
        this.discard(projectCard);
      }
    }
    if (discardedCards.length > 0) {
      logger.log('Discarded ${0} cards ${1}', (b) => b.number(discardedCards.length).cardNames(discardedCards, {ellipsis: true}));
    }

    return result;
  }

  public discard(...cards: Array<T>): void {
    this.discardPile.push(...cards);
  }

  // For Junk Ventures
  public shuffleDiscardPile(): void {
    if (this.recycleMode === 'fifo') {
      return;
    }
    Deck.shuffle(this.discardPile, this.random);
  }

  public serialize(): SerializedDeck {
    return {
      drawPile: this.drawPile.map(toName),
      discardPile: this.discardPile.map(toName),
    };
  }
}

export class CorporationDeck extends Deck<ICorporationCard> {
  public constructor(deck: Array<ICorporationCard>, discarded: Array<ICorporationCard>, random: Random) {
    super('corporation', deck, discarded, random);
  }

  public static deserialize(d: SerializedDeck, random: Random): Deck<ICorporationCard> {
    const deck = corporationCardsFromJSON(d.drawPile);
    const discarded = corporationCardsFromJSON(d.discardPile);
    return new CorporationDeck(deck, discarded, random);
  }
}

export class ProjectDeck extends Deck<IProjectCard> {
  public constructor(deck: Array<IProjectCard>, discarded: Array<IProjectCard>, random: Random, recycleMode: DeckRecycleMode = 'shuffle') {
    super('project', deck, discarded, random, recycleMode);
  }

  public static deserialize(d: SerializedDeck, random: Random, recycleMode: DeckRecycleMode = 'shuffle'): Deck<IProjectCard> {
    const deck = cardsFromJSON(d.drawPile);
    const discarded = cardsFromJSON(d.discardPile);
    return new ProjectDeck(deck, discarded, random, recycleMode);
  }
}

const INCOMPATIBLE_PRELUDES = [CardName.BY_ELECTION, CardName.THE_NEW_SPACE_RACE] as const;
export class PreludeDeck extends Deck<IPreludeCard> {
  public constructor(deck: Array<IPreludeCard>, discarded: Array<IPreludeCard>, random: Random) {
    const copy = [...deck];
    const indexes = INCOMPATIBLE_PRELUDES.map((name) => deck.findIndex((c) => c.name === name));
    if (indexes[0] >= 0 && indexes[1] >= 0) {
      // Remove one from the game, randomly
      const target = random.nextInt(2);
      const indexToRemove = indexes[target];
      copy.splice(indexToRemove, 1);
    }

    super('prelude', copy, discarded, random);
  }

  public static deserialize(d: SerializedDeck, random: Random): Deck<IPreludeCard> {
    const deck = preludesFromJSON(d.drawPile);
    const discarded = preludesFromJSON(d.discardPile);
    return new PreludeDeck(deck, discarded, random);
  }
}

export class CeoDeck extends Deck<ICeoCard> {
  public constructor(deck: Array<ICeoCard>, discarded: Array<ICeoCard>, random: Random) {
    super('ceo', deck, discarded, random);
  }

  public static deserialize(d: SerializedDeck, random: Random): Deck<ICeoCard> {
    const deck = ceosFromJSON(d.drawPile);
    const discarded = ceosFromJSON(d.discardPile);
    return new CeoDeck(deck, discarded, random);
  }
}
