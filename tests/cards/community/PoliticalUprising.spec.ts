import {expect} from 'chai';
import {PoliticalUprising} from '../../../src/server/cards/community/PoliticalUprising';
import {IGame} from '../../../src/server/IGame';
import {SelectParty} from '../../../src/server/inputs/SelectParty';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {cast} from '@/common/utils/utils';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions, testGame} from '../../TestingUtils';
import {MicroMills} from '@/server/cards/base/MicroMills';
import {AICentral} from '@/server/cards/base/AICentral';
import {PROffice} from '@/server/cards/turmoil/PROffice';
import {SupportedResearch} from '@/server/cards/turmoil/SupportedResearch';
import {CardName} from '@/common/cards/CardName';

describe('PoliticalUprising', () => {
  let card: PoliticalUprising;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new PoliticalUprising();
    [game, player/* , player2 */] = testGame(2, {turmoilExtension: true});
  });

  it('Should play', () => {
    const turmoil = game.turmoil!;
    const marsFirst = turmoil.getPartyByName(PartyName.MARS);

    expect(marsFirst.delegates.get(player)).eq(0);
    expect(player.cardsInHand).is.empty;

    card.play(player);

    expect(player.cardsInHand).has.lengthOf(1);

    for (let idx = 0; idx < 4; idx++) {
      runAllActions(game);
      const selectParty = cast(player.popWaitingFor(), SelectParty);
      selectParty.cb(PartyName.MARS);
    }
    runAllActions(game);
    cast(player.popWaitingFor(), undefined);

    expect(marsFirst.delegates.get(player)).eq(4);
  });

  it('No Turmoil card in the draw pile, but there is one in the discard pile', () => {
    player.game.projectDeck.drawPile = [new MicroMills()];
    player.game.projectDeck.discardPile = [new AICentral(), new PROffice()];

    card.play(player);

    expect(game.gameLog.some((msg) => msg.message.match(/The project deck has no Turmoil cards/))).is.true;
    // expect(game.gameLog.some((msg) => msg.message.match(/played \$\{1\} to find a Turmoil card but/))).is.false;
    expect(player.cardsInHand).has.lengthOf(1);
    expect(player.cardsInHand[0].name).eq(CardName.PR_OFFICE);
  });

  it('No Turmoil card in the draw pile or discard pile', () => {
    player.game.projectDeck.drawPile = [new MicroMills()];
    player.game.projectDeck.discardPile = [new AICentral()];

    card.play(player);

    expect(game.gameLog.some((msg) => msg.message.match(/The project deck has no Turmoil cards/))).is.true;
    expect(game.gameLog.some((msg) => msg.message.match(/played \$\{1\} to find a Turmoil card but/))).is.true;
    expect(player.cardsInHand).has.lengthOf(0);
  });

  it('Open Cards draws the first matching card in public draw order', () => {
    [game, player] = testGame(2, {openCardsVariant: true, turmoilExtension: true});
    player.game.projectDeck.drawPile = [new PROffice(), new SupportedResearch()];

    card.play(player);

    expect(player.cardsInHand).has.lengthOf(1);
    expect(player.cardsInHand[0].name).eq(CardName.SUPPORTED_RESEARCH);
  });

  it('Open Cards reports FIFO recycling without claiming to shuffle', () => {
    [game, player] = testGame(2, {openCardsVariant: true, turmoilExtension: true});
    player.game.projectDeck.drawPile = [new MicroMills()];
    player.game.projectDeck.discardPile = [new AICentral(), new PROffice()];

    card.play(player);

    const messages = game.gameLog.map((message) => message.message);
    expect(messages.some((message) => message.includes('without shuffling'))).is.true;
    expect(messages.some((message) => message.includes('being reshuffled'))).is.false;
    expect(player.cardsInHand[0].name).eq(CardName.PR_OFFICE);
  });
});
