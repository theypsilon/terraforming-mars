import {CardName} from '../cards/CardName';
import {Color} from '../Color';
import {GlobalEventName} from '../turmoil/globalEvents/GlobalEventName';

/** A run of project cards one player would receive in the next Research phase. */
export type OpenCardsPacketModel = {
  color: Color;
  cards: ReadonlyArray<CardName>;
}

/** A player's starting offers, and the cards they kept once all players submitted. */
export type OpenCardsPlayerModel = {
  color: Color;
  corporations: ReadonlyArray<CardName>;
  preludes: ReadonlyArray<CardName>;
  projects: ReadonlyArray<CardName>;
  /** Absent until all players submit their complete starting selections. */
  selection?: {
    corporation: CardName;
    preludes: ReadonlyArray<CardName>;
    projects: ReadonlyArray<CardName>;
  };
}

/** The card information Open Cards makes public. */
export type OpenCardsModel = {
  /** The starting offers. Absent once players are done choosing their starting cards. */
  players?: ReadonlyArray<OpenCardsPlayerModel>;
  /** The project deck, next card drawn first. */
  projectDeck: ReadonlyArray<CardName>;
  /** The project discard pile, oldest discard first. It becomes the deck when the deck runs out. */
  projectDiscards: ReadonlyArray<CardName>;
  /** The cards each player would receive if the next Research phase happened right now. */
  draftPackets: ReadonlyArray<OpenCardsPacketModel>;
  /** The Prelude deck, next card drawn first. Discards are omitted because they are reshuffled. */
  preludeDeck: ReadonlyArray<CardName>;
  /** Global events after the visible Distant event, next event drawn first. */
  globalEventDeck: ReadonlyArray<GlobalEventName>;
}
