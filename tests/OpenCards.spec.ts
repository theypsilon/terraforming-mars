import {expect} from 'chai';
import {CardName} from '../src/common/cards/CardName';
import {Phase} from '../src/common/Phase';
import {OpenCardsModel} from '../src/common/models/OpenCardsModel';
import {PublicPlayerModel} from '../src/common/models/PlayerModel';
import {cast, toName} from '../src/common/utils/utils';
import {Game} from '../src/server/Game';
import {IGame} from '../src/server/IGame';
import {IPlayer} from '../src/server/IPlayer';
import {LunaProjectOffice} from '../src/server/cards/moon/LunaProjectOffice';
import {MarsMaths} from '../src/server/cards/pathfinders/MarsMaths';
import {SelectCard} from '../src/server/inputs/SelectCard';
import {SelectInitialCards} from '../src/server/inputs/SelectInitialCards';
import {Server} from '../src/server/models/ServerModel';
import {SerializedGame} from '../src/server/SerializedGame';
import {TestGameOptions, testGame} from './TestGame';
import {finishGeneration} from './TestingUtils';

/** An Open Cards game with the starting selection still open. */
function openCardsGame(options: Partial<TestGameOptions> = {}): [IGame, IPlayer, IPlayer] {
  const [game, player, player2] = testGame(2, {openCardsVariant: true, skipInitialCardSelection: false, ...options});
  return [game, player, player2];
}

/** Submits a player's whole starting selection the way an inbound request does. */
function submitInitialCards(player: IPlayer, projects: ReadonlyArray<CardName> = []) {
  const input = cast(player.getWaitingFor(), SelectInitialCards);
  const preludes = cast(input.inputs.prelude, SelectCard).cards.slice(0, 2).map(toName);
  player.process({
    type: 'initialCards',
    responses: [
      {type: 'card', cards: [player.dealtCorporationCards[0].name]},
      {type: 'card', cards: preludes},
      {type: 'card', cards: [...projects]},
    ],
  });
}

function deckNames(game: IGame): Array<CardName> {
  return game.projectDeck.inDrawOrder().map(toName);
}

function openCardsModel(game: IGame): OpenCardsModel {
  const model = Server.getGameModel(game).openCards;
  if (model === undefined) {
    throw new Error('Not an Open Cards game');
  }
  return model;
}

function asSeenBy(player: IPlayer): OpenCardsModel | undefined {
  return Server.getPlayerModel(player).game.openCards;
}

/** The public player models `viewer` receives, in seat order. */
function publicPlayers(viewer: IPlayer): ReadonlyArray<PublicPlayerModel> {
  const players = Server.getPlayerModel(viewer).players;
  return viewer.game.players.map((player) => {
    const model = players.find((p) => p.color === player.color);
    if (model === undefined) {
      throw new Error(`No model for ${player.color}`);
    }
    return model;
  });
}

/** Marks starting selection complete for tests that exercise only later deck behavior. */
function markStartingSelectionComplete(game: IGame): void {
  for (const player of game.players) {
    const corporation = player.dealtCorporationCards[0];
    if (corporation === undefined) {
      throw new Error(`No corporation dealt to ${player.color}`);
    }
    player.pickedCorporationCard = corporation;
  }
}

describe('Open Cards', () => {
  it('supports one to five players and rejects six', () => {
    for (const count of [1, 2, 3, 4, 5]) {
      const [game, ...players] = testGame(count, {openCardsVariant: true});
      const model = openCardsModel(game);

      expect(game.players).has.length(count);
      expect(model.draftPackets).has.length(count);
      expect(model.draftPackets.map((packet) => packet.color)).deep.eq(players.map((player) => player.color));
      expect(model.draftPackets.flatMap((packet) => packet.cards)).deep.eq(model.projectDeck.slice(0, 4 * count));
    }

    expect(() => testGame(6, {openCardsVariant: true})).to.throw('Open Cards supports one to five players.');
  });

  it('deals the standard offers', () => {
    const [/* game */, player, player2] = openCardsGame();

    for (const p of [player, player2]) {
      expect(p.dealtCorporationCards).has.length(2);
      expect(p.dealtPreludeCards).has.length(4);
      expect(p.dealtProjectCards).has.length(10);
      expect(p.dealtCeoCards).is.empty;
    }
  });

  it('turns off setup variants that would offer something else', () => {
    const [game] = openCardsGame({
      ceoExtension: true,
      initialDraftVariant: true,
      preludeDraftVariant: true,
      ceosDraftVariant: true,
      twoCorpsVariant: true,
      startingCorporations: 4,
      startingPreludes: 6,
    });

    const options = game.gameOptions;
    expect(options.preludeExtension).is.true;
    expect(options.ceoExtension).is.false;
    expect(options.initialDraftVariant).is.false;
    expect(options.preludeDraftVariant).is.false;
    expect(options.ceosDraftVariant).is.false;
    expect(options.twoCorpsVariant).is.false;
    expect(options.startingCorporations).eq(2);
    expect(options.startingPreludes).eq(4);
    expect(options.bannedCards).not.includes(CardName.LUNA_PROJECT_OFFICE);
    expect(options.bannedCards).not.includes(CardName.MARS_MATHS);
  });

  it('allows Luna Project Office to be explicitly included', () => {
    const [game, player, player2] = openCardsGame({
      includedCards: [CardName.LUNA_PROJECT_OFFICE],
    });
    const cards = [
      ...game.projectDeck.drawPile,
      ...game.projectDeck.discardPile,
      ...player.dealtProjectCards,
      ...player2.dealtProjectCards,
    ];

    expect(game.gameOptions.includedCards).includes(CardName.LUNA_PROJECT_OFFICE);
    expect(cards.map(toName)).includes(CardName.LUNA_PROJECT_OFFICE);
  });

  it('allows Mars Maths as a custom corporation', () => {
    const [game, player, player2] = openCardsGame({
      customCorporationsList: [CardName.MARS_MATHS],
    });
    const cards = [
      ...game.corporationDeck.drawPile,
      ...game.corporationDeck.discardPile,
      ...player.dealtCorporationCards,
      ...player2.dealtCorporationCards,
    ];

    expect(game.gameOptions.customCorporationsList).includes(CardName.MARS_MATHS);
    expect(cards.map(toName)).includes(CardName.MARS_MATHS);
  });

  it('reports only the two selected Preludes when Delta Project is enabled', () => {
    const [game, player, player2] = openCardsGame({deltaProjectExpansion: true});

    expect(game.gameOptions.deltaProjectExpansion).is.false;
    expect(game.gameOptions.expansions.deltaProject).is.false;
    expect(player.preludeCardsInHand.map(toName)).not.includes(CardName.DELTA_PROJECT);

    submitInitialCards(player);
    expect(asSeenBy(player2)?.players?.[0].selection).is.undefined;
    submitInitialCards(player2);

    expect(publicPlayers(player2)[0].preludeCardsInHand).has.length(2);
  });

  it('is off by default', () => {
    const [game] = testGame(2);

    expect(game.gameOptions.openCardsVariant).is.false;
    expect(Server.getGameModel(game).openCards).is.undefined;
  });

  it('both players see both sets of starting offers', () => {
    const [/* game */, player, player2] = openCardsGame();

    for (const viewer of [player, player2]) {
      const offers = asSeenBy(viewer)?.players;
      expect(offers).has.length(2);
      expect(offers?.[0].color).eq(player.color);
      expect(offers?.[0].corporations).deep.eq(player.dealtCorporationCards.map(toName));
      expect(offers?.[0].preludes).deep.eq(player.dealtPreludeCards.map(toName));
      expect(offers?.[0].projects).deep.eq(player.dealtProjectCards.map(toName));
      expect(offers?.[1].color).eq(player2.color);
      expect(offers?.[1].corporations).deep.eq(player2.dealtCorporationCards.map(toName));
      expect(offers?.[1].preludes).deep.eq(player2.dealtPreludeCards.map(toName));
      expect(offers?.[1].projects).deep.eq(player2.dealtProjectCards.map(toName));
    }
  });

  it('a tentative selection is never public', () => {
    const [/* game */, player, player2] = openCardsGame();
    const input = cast(player.getWaitingFor(), SelectInitialCards);

    const expectPrivate = () => {
      const views = [Server.getPlayerModel(player2), Server.getSpectatorModel(player.game)];
      for (const view of views) {
        const playerModel = view.players.find((p) => p.color === player.color);
        expect(view.game.openCards?.players?.[0].selection).is.undefined;
        expect(playerModel?.cardsInHandNbr).eq(0);
        expect(playerModel?.cardsInHand).is.undefined;
        expect(playerModel?.preludeCardsInHand).is.undefined;
        expect(JSON.stringify(view.game.openCards)).does.not.include('"selection"');
      }
    };

    // The player picks, changes their mind, and picks again, all without submitting.
    cast(input.inputs.corp, SelectCard).process({type: 'card', cards: [player.dealtCorporationCards[0].name]});
    expectPrivate();
    cast(input.inputs.project, SelectCard).process({type: 'card', cards: [player.dealtProjectCards[0].name]});
    expectPrivate();
    cast(input.inputs.project, SelectCard).process({
      type: 'card',
      cards: [player.dealtProjectCards[1].name, player.dealtProjectCards[2].name],
    });
    expectPrivate();
    cast(input.inputs.corp, SelectCard).process({type: 'card', cards: [player.dealtCorporationCards[1].name]});
    expectPrivate();
  });

  it('publishes both starting selections only after both players submit', () => {
    const [game, player, player2] = openCardsGame();
    const projects = player.dealtProjectCards.slice(0, 2).map(toName);
    const projects2 = player2.dealtProjectCards.slice(0, 1).map(toName);

    expect(asSeenBy(player2)?.players?.[0].selection).is.undefined;

    submitInitialCards(player, projects);

    expect(asSeenBy(player2)?.players?.[0].selection).is.undefined;
    expect(asSeenBy(player)?.players?.[1].selection).is.undefined;
    expect(publicPlayers(player2)[0].cardsInHand).is.undefined;
    expect(publicPlayers(player2)[0].cardsInHandNbr).eq(0);
    expect(Server.getSpectatorModel(game).players[0].cardsInHand).is.undefined;
    expect(openCardsModel(game).projectDiscards).is.empty;
    expect(Server.getGameModel(game).discardPileSize).eq(0);
    expect(game.projectDeck.discardPile).is.not.empty;

    submitInitialCards(player2, projects2);

    expect(publicPlayers(player2)[0].cardsInHand?.map(toName)).deep.eq(projects);
    expect(publicPlayers(player)[1].cardsInHand?.map(toName)).deep.eq(projects2);
    expect(Server.getSpectatorModel(game).players[0].preludeCardsInHand).has.length(2);
    expect(openCardsModel(game).projectDiscards).deep.eq(game.projectDeck.discardPile.map(toName));
    expect(Server.getGameModel(game).discardPileSize).eq(game.projectDeck.discardPile.length);
  });

  it('waits for every starting selection in a game with more than two players', () => {
    const [game, ...players] = testGame(3, {openCardsVariant: true, skipInitialCardSelection: false});

    submitInitialCards(players[0]);
    submitInitialCards(players[1]);

    const privateModel = openCardsModel(game);
    expect(privateModel.players?.every((player) => player.selection === undefined)).is.true;
    expect(Server.getSpectatorModel(game).players.every((player) => player.cardsInHand === undefined)).is.true;

    submitInitialCards(players[2]);

    expect(Server.getSpectatorModel(game).players.every((player) => player.cardsInHand !== undefined)).is.true;
  });

  it('a committed starting selection stays private after save and load', () => {
    const [game, player] = openCardsGame();
    const projects = player.dealtProjectCards.slice(0, 2).map(toName);
    submitInitialCards(player, projects);

    const reloaded = Game.deserialize(game.serialize());
    const offers = openCardsModel(reloaded).players;

    expect(reloaded.players[0].pickedCorporationCard?.name).eq(player.dealtCorporationCards[0].name);
    expect(offers?.[0].selection).is.undefined;
    expect(offers?.[1].selection).is.undefined;
    expect(openCardsModel(reloaded).projectDiscards).is.empty;

    const spectator = Server.getSpectatorModel(reloaded);
    expect(spectator.game.openCards?.players?.[0].selection).is.undefined;
    expect(spectator.players[0].cardsInHand).is.undefined;
    expect(spectator.players[0].cardsInHandNbr).eq(0);
  });

  it('persists a commit while the other player is still choosing', () => {
    const [game, player] = openCardsGame();
    let saved: SerializedGame | undefined;
    game.save = () => {
      saved = game.serialize();
    };

    submitInitialCards(player, player.dealtProjectCards.slice(0, 2).map(toName));

    expect(saved).is.not.undefined;
    if (saved === undefined) {
      return;
    }
    const reloaded = Game.deserialize(saved);
    expect(reloaded.players[0].pickedCorporationCard).is.not.undefined;
    expect(openCardsModel(reloaded).players?.[0].selection).is.undefined;
    expect(Server.getSpectatorModel(reloaded).players[0].cardsInHand).is.undefined;
  });

  it('the offers give way to the deck once play begins', () => {
    const [game, player, player2] = openCardsGame();
    submitInitialCards(player);
    submitInitialCards(player2);

    expect(game.phase).eq(Phase.PRELUDES);
    expect(openCardsModel(game).players).is.undefined;
    expect(openCardsModel(game).projectDeck).is.not.empty;
  });

  it('both starting hands become public together', () => {
    const [game, player, player2] = openCardsGame();
    const projects = player.dealtProjectCards.slice(0, 2).map(toName);

    expect(publicPlayers(player2)[0].cardsInHand).is.undefined;
    expect(publicPlayers(player2)[1].cardsInHand).is.undefined;

    submitInitialCards(player, projects);

    expect(publicPlayers(player2)[0].cardsInHand).is.undefined;
    expect(publicPlayers(player2)[0].cardsInHandNbr).eq(0);
    expect(publicPlayers(player)[1].cardsInHand).is.undefined;
    expect(Server.getSpectatorModel(game).players[0].cardsInHandNbr).eq(0);

    submitInitialCards(player2);
    expect(publicPlayers(player2)[0].cardsInHand?.map(toName)).deep.eq(projects);
    expect(publicPlayers(player2)[0].cardsInHandNbr).eq(projects.length);
    expect(publicPlayers(player2)[0].preludeCardsInHand?.map(toName)).deep.eq(player.preludeCardsInHand.map(toName));
    expect(Server.getSpectatorModel(game).players[1].cardsInHand).is.not.undefined;
  });

  it('a hand stays public for the rest of the game', () => {
    const [game, player, player2] = openCardsGame();
    submitInitialCards(player);
    submitInitialCards(player2);

    const drawn = game.projectDeck.drawOrThrow(game);
    player.cardsInHand.push(drawn);

    expect(publicPlayers(player2)[0].cardsInHand?.map(toName)).includes(drawn.name);
    expect(Server.getSpectatorModel(game).players[0].cardsInHand?.map(toName)).includes(drawn.name);
  });

  it('a player is not sent their own hand a second time', () => {
    const [/* game */, player, player2] = openCardsGame();
    submitInitialCards(player, player.dealtProjectCards.slice(0, 2).map(toName));
    submitInitialCards(player2);

    const view = Server.getPlayerModel(player);
    expect(view.cardsInHand).has.length(2);
    expect(view.thisPlayer.cardsInHand).is.undefined;
    expect(view.thisPlayer.preludeCardsInHand).is.undefined;
    // Only the opponent's hand is added.
    expect(publicPlayers(player)[1].cardsInHand).is.not.undefined;
  });

  it('ordinary games keep hands private', () => {
    const [game, /* player */, player2] = testGame(2);

    expect(publicPlayers(player2)[0].cardsInHand).is.undefined;
    expect(Server.getSpectatorModel(game).players[0].cardsInHand).is.undefined;
  });

  it('the first card shown is the next card drawn', () => {
    const [game] = openCardsGame();
    const deck = openCardsModel(game).projectDeck;

    expect(game.projectDeck.drawOrThrow(game).name).eq(deck[0]);
    expect(openCardsModel(game).projectDeck[0]).eq(deck[1]);

    game.projectDeck.drawN(game, 3);
    expect(openCardsModel(game).projectDeck).deep.eq(deck.slice(4));
  });

  it('the deck survives save and load in the same order', () => {
    const [game] = openCardsGame();
    game.projectDeck.drawN(game, 7);

    const reloaded = Game.deserialize(game.serialize());

    expect(openCardsModel(reloaded).projectDeck).deep.eq(openCardsModel(game).projectDeck);
  });

  it('the draft packets are the top of the deck, four each', () => {
    const [/* game */, player, player2] = openCardsGame();
    const model = openCardsModel(player.game);

    expect(model.draftPackets).has.length(2);
    expect(model.draftPackets[0].color).eq(player.color);
    expect(model.draftPackets[0].cards).deep.eq(model.projectDeck.slice(0, 4));
    expect(model.draftPackets[1].color).eq(player2.color);
    expect(model.draftPackets[1].cards).deep.eq(model.projectDeck.slice(4, 8));
  });

  it('ordinary draws shift the projected packets', () => {
    const [game] = openCardsGame();
    const deck = openCardsModel(game).projectDeck;

    game.projectDeck.drawN(game, 2);

    const packets = openCardsModel(game).draftPackets;
    expect(packets[0].cards).deep.eq(deck.slice(2, 6));
    expect(packets[1].cards).deep.eq(deck.slice(6, 10));
  });

  it('keeps the UI at four-card groups while Luna Project Office modifies the draft', () => {
    const [game, player, player2] = testGame(2, {openCardsVariant: true, draftVariant: true});
    const card = new LunaProjectOffice();
    player.playedCards.push(card);
    game.generation = 8;
    card.data.lastEffectiveGeneration = game.generation + 2;
    const deck = openCardsModel(game).projectDeck;
    const projected = openCardsModel(game).draftPackets;

    expect(projected[0].cards).has.length(4);
    expect(projected[1].cards).has.length(4);

    finishGeneration(game);

    expect(player.draftHand.map(toName)).deep.eq(deck.slice(0, 5));
    expect(player2.draftHand.map(toName)).deep.eq(deck.slice(5, 9));
    expect(cast(player.getWaitingFor(), SelectCard).config.min).eq(2);
    expect(cast(player.getWaitingFor(), SelectCard).config.max).eq(2);
  });

  it('keeps the UI at four-card groups while Mars Maths modifies the draft', () => {
    const [game, player, player2] = testGame(2, {openCardsVariant: true, draftVariant: true});
    player.playedCards.push(new MarsMaths());
    const deck = openCardsModel(game).projectDeck;
    const projected = openCardsModel(game).draftPackets;

    expect(projected[0].cards).deep.eq(deck.slice(0, 4));
    expect(projected[1].cards).deep.eq(deck.slice(4, 8));

    finishGeneration(game);

    expect(player.draftHand.map(toName)).deep.eq(deck.slice(0, 5));
    expect(player2.draftHand.map(toName)).deep.eq(deck.slice(5, 9));
    expect(cast(player.getWaitingFor(), SelectCard).config.min).eq(2);
    expect(cast(player.getWaitingFor(), SelectCard).config.max).eq(2);
  });

  it('the draft consumes exactly the projected packets', () => {
    const [game, player, player2] = testGame(2, {openCardsVariant: true, draftVariant: true});
    const projected = openCardsModel(game).draftPackets;

    game.generation = 1;
    finishGeneration(game);

    expect(game.phase).eq(Phase.DRAFTING);
    expect(player.draftHand.map(toName)).deep.eq(projected[0].cards);
    expect(player2.draftHand.map(toName)).deep.eq(projected[1].cards);
  });

  it('the draft consumes one projected packet for each of five players', () => {
    const [game, ...players] = testGame(5, {openCardsVariant: true, draftVariant: true});
    const projected = openCardsModel(game).draftPackets;

    game.generation = 1;
    finishGeneration(game);

    expect(game.phase).eq(Phase.DRAFTING);
    expect(projected).has.length(5);
    for (const [idx, player] of players.entries()) {
      expect(player.draftHand.map(toName)).deep.eq(projected[idx].cards);
    }
  });

  it('a draw before Research moves the draft along by one card', () => {
    const [game, player, player2] = testGame(2, {openCardsVariant: true, draftVariant: true});
    const deck = openCardsModel(game).projectDeck;

    game.projectDeck.drawOrThrow(game);
    game.generation = 1;
    finishGeneration(game);

    expect(player.draftHand.map(toName)).deep.eq(deck.slice(1, 5));
    expect(player2.draftHand.map(toName)).deep.eq(deck.slice(5, 9));
  });

  it('a draft that exhausts the deck consumes the projected packets', () => {
    const [game, player, player2] = testGame(2, {openCardsVariant: true, draftVariant: true});
    markStartingSelectionComplete(game);
    const discarded = game.projectDeck.drawN(game, 6);
    game.projectDeck.discard(...discarded);
    game.projectDeck.drawPile.length = 3;
    const projected = openCardsModel(game).draftPackets;

    game.generation = 1;
    finishGeneration(game);

    expect(player.draftHand.map(toName)).deep.eq(projected[0].cards);
    expect(player2.draftHand.map(toName)).deep.eq(projected[1].cards);
  });

  it('without the draft variant, Research still hands out the projected packets', () => {
    const [game, player, player2] = testGame(2, {openCardsVariant: true});
    const projected = openCardsModel(game).draftPackets;

    game.generation = 1;
    finishGeneration(game);

    expect(game.phase).eq(Phase.RESEARCH);
    expect(cast(player.popWaitingFor(), SelectCard).cards.map(toName)).deep.eq(projected[0].cards);
    expect(cast(player2.popWaitingFor(), SelectCard).cards.map(toName)).deep.eq(projected[1].cards);
  });

  it('publishes Research project-card results only after every player finishes', () => {
    const [game, player, player2, player3] = testGame(3, {openCardsVariant: true});
    markStartingSelectionComplete(game);
    game.phase = Phase.ACTION;
    player.megaCredits = 100;
    player2.megaCredits = 100;
    player3.megaCredits = 100;
    const existingCard = game.projectDeck.drawOrThrow(game);
    player.cardsInHand.push(existingCard);

    finishGeneration(game);

    const playerOffer = cast(player.getWaitingFor(), SelectCard).cards;
    const player2Offer = cast(player2.getWaitingFor(), SelectCard).cards;
    const player3Offer = cast(player3.getWaitingFor(), SelectCard).cards;
    const selected = playerOffer[0];
    const before = openCardsModel(game);
    const beforeDeck = [...before.projectDeck];
    const beforeDiscards = [...before.projectDiscards];
    const beforePackets = before.draftPackets.map((packet) => ({...packet, cards: [...packet.cards]}));

    player.process({type: 'card', cards: [selected.name]});
    // Research replacement mechanics can draw and discard again before the other player
    // finishes. Those changes share the same publication boundary.
    const replacement = game.projectDeck.drawOrThrow(game);
    game.projectDeck.discard(replacement);

    expect(game.hasResearched(player)).is.true;
    expect(player.cardsInHand.map(toName)).deep.eq([existingCard.name, selected.name]);
    expect(publicPlayers(player2)[0].cardsInHand?.map(toName)).deep.eq([existingCard.name]);
    expect(publicPlayers(player2)[0].cardsInHandNbr).eq(1);
    const spectatorPlayer = Server.getSpectatorModel(game).players.find((p) => p.color === player.color);
    expect(spectatorPlayer?.cardsInHand?.map(toName)).deep.eq([existingCard.name]);
    expect(openCardsModel(game).projectDeck).deep.eq(beforeDeck);
    expect(openCardsModel(game).projectDiscards).deep.eq(beforeDiscards);
    expect(openCardsModel(game).draftPackets).deep.eq(beforePackets);
    expect(Server.getGameModel(game).deckSize).eq(beforeDeck.length);
    expect(Server.getGameModel(game).discardPileSize).eq(beforeDiscards.length);

    player2.process({type: 'card', cards: []});

    expect(game.phase).eq(Phase.RESEARCH);
    expect(publicPlayers(player3)[0].cardsInHand?.map(toName)).deep.eq([existingCard.name]);
    expect(openCardsModel(game).projectDeck).deep.eq(beforeDeck);

    player3.process({type: 'card', cards: []});

    expect(game.phase).eq(Phase.ACTION);
    expect(publicPlayers(player2)[0].cardsInHand?.map(toName)).deep.eq([existingCard.name, selected.name]);
    const publishedSpectatorPlayer = Server.getSpectatorModel(game).players.find((p) => p.color === player.color);
    expect(publishedSpectatorPlayer?.cardsInHand?.map(toName)).deep.eq([existingCard.name, selected.name]);
    expect(openCardsModel(game).projectDiscards).deep.eq(game.projectDeck.discardPile.map(toName));
    expect(openCardsModel(game).projectDiscards).includes(replacement.name);
    expect(Server.getGameModel(game).discardPileSize).eq(game.projectDeck.discardPile.length);
    expect(game.projectDeck.discardPile.map(toName)).includes(playerOffer[1].name);
    expect(game.projectDeck.discardPile.map(toName)).includes(player2Offer[0].name);
    expect(game.projectDeck.discardPile.map(toName)).includes(player3Offer[0].name);
  });

  it('drafting outside Open Cards still takes the bottom of the deck', () => {
    const [game, player, player2] = testGame(2, {draftVariant: true});
    const bottom = game.projectDeck.drawPile.slice(0, 8).map(toName);

    game.generation = 1;
    finishGeneration(game);

    expect(player.draftHand.map(toName)).deep.eq(bottom.slice(0, 4));
    expect(player2.draftHand.map(toName)).deep.eq(bottom.slice(4, 8));
  });

  it('discards are recycled oldest first', () => {
    const [game] = openCardsGame();
    markStartingSelectionComplete(game);
    const [a, b, c] = game.projectDeck.drawN(game, 3);

    game.projectDeck.discard(a);
    game.projectDeck.discard(b);
    game.projectDeck.discard(c);
    expect(openCardsModel(game).projectDiscards).deep.eq([a.name, b.name, c.name]);

    game.projectDeck.drawPile.length = 0;

    expect(game.projectDeck.drawOrThrow(game)).eq(a);
    expect(game.projectDeck.drawOrThrow(game)).eq(b);
    expect(game.projectDeck.drawOrThrow(game)).eq(c);
  });

  it('cards discarded in one operation keep their order through save and load', () => {
    const [game] = openCardsGame();
    markStartingSelectionComplete(game);
    const discarded = game.projectDeck.drawN(game, 3);
    game.projectDeck.discard(...discarded);
    game.projectDeck.drawPile.length = 0;

    const reloaded = Game.deserialize(game.serialize());

    expect(openCardsModel(reloaded).projectDiscards).deep.eq(discarded.map(toName));
    expect(reloaded.projectDeck.drawN(reloaded, 3).map(toName)).deep.eq(discarded.map(toName));
  });

  it('a draw that empties the deck continues into the recycle queue', () => {
    const [game] = openCardsGame();
    const [a, b, c, d] = game.projectDeck.drawN(game, 4);
    game.projectDeck.discard(a, b, c, d);
    game.projectDeck.drawPile.length = 2;
    const remaining = deckNames(game);

    expect(game.projectDeck.drawN(game, 5).map(toName)).deep.eq([...remaining, a.name, b.name, c.name]);
  });

  it('recycling puts the queue behind the cards already in the deck', () => {
    const [game] = openCardsGame();
    const discarded = game.projectDeck.drawN(game, 3);
    game.projectDeck.discard(...discarded);
    game.projectDeck.drawPile.length = 2;
    const remaining = deckNames(game);

    game.projectDeck.recycle();

    expect(deckNames(game)).deep.eq([...remaining, ...discarded.map(toName)]);
    expect(game.projectDeck.discardPile).is.empty;
  });

  it('the projection reaches into the recycle queue when the deck is nearly out', () => {
    const [game] = openCardsGame();
    markStartingSelectionComplete(game);
    const discarded = game.projectDeck.drawN(game, 6);
    game.projectDeck.discard(...discarded);
    game.projectDeck.drawPile.length = 3;

    const model = openCardsModel(game);
    expect(model.draftPackets[0].cards).deep.eq([...model.projectDeck, discarded[0].name]);
    expect(model.draftPackets[1].cards).deep.eq(discarded.slice(1, 5).map(toName));
  });

  it('a deck with fewer than four cards left projects a short packet', () => {
    const [game] = openCardsGame();
    game.projectDeck.drawPile.length = 3;
    game.projectDeck.discardPile.length = 0;

    const model = openCardsModel(game);
    expect(model.draftPackets[0].cards).deep.eq(model.projectDeck);
    expect(model.draftPackets[1].cards).is.empty;
  });

  it('an explicit discard shuffle does not reorder the queue', () => {
    const [game] = openCardsGame();
    const discarded = game.projectDeck.drawN(game, 12);
    game.projectDeck.discard(...discarded);

    game.projectDeck.shuffleDiscardPile();

    expect(game.projectDeck.discardPile.map(toName)).deep.eq(discarded.map(toName));
  });

  it('ordinary games still shuffle their discards back in', () => {
    const [game] = testGame(2);
    const discarded = game.projectDeck.drawN(game, 40);
    game.projectDeck.discard(...discarded);
    game.projectDeck.drawPile.length = 0;

    game.projectDeck.drawOrThrow(game);

    expect(game.projectDeck.discardPile).is.empty;
    expect(deckNames(game)).does.not.deep.eq(discarded.slice(1).map(toName));
  });

  it('old saved games load with the standard deck behavior', () => {
    const [game] = testGame(2);
    const serialized = game.serialize();
    delete (serialized.gameOptions as any).openCardsVariant;

    const reloaded = Game.deserialize(serialized);

    expect(reloaded.gameOptions.openCardsVariant).is.false;
    expect(Server.getGameModel(reloaded).gameOptions.openCardsVariant).is.false;
    expect(Server.getGameModel(reloaded).openCards).is.undefined;

    const discarded = reloaded.projectDeck.drawN(reloaded, 40);
    reloaded.projectDeck.discard(...discarded);
    reloaded.projectDeck.drawPile.length = 0;
    reloaded.projectDeck.drawOrThrow(reloaded);

    expect(reloaded.projectDeck.discardPile).is.empty;
  });
});
