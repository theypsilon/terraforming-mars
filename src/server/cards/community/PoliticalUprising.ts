import {IPlayer} from '../../IPlayer';
import {PreludeCard} from '../prelude/PreludeCard';
import {IProjectCard} from '../IProjectCard';
import {CardName} from '../../../common/cards/CardName';
import {TURMOIL_CARD_MANIFEST} from '../turmoil/TurmoilCardManifest';
import {CardRenderer} from '../render/CardRenderer';
import {AltSecondaryTag} from '../../../common/cards/render/AltSecondaryTag';
import {CardManifest} from '../ModuleManifest';

export class PoliticalUprising extends PreludeCard implements IProjectCard {
  constructor() {
    super({
      name: CardName.POLITICAL_UPRISING,

      behavior: {
        turmoil: {sendDelegates: {count: 4, manyParties: true}},
      },

      metadata: {
        cardNumber: 'Y03',
        renderData: CardRenderer.builder((b) => {
          b.delegates(4).br.br;
          b.cards(1, {secondaryTag: AltSecondaryTag.TURMOIL});
        }),
        description: 'Place 4 delegates in any parties. Draw a Turmoil card.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    this.drawTurmoilCard(player);
    return undefined;
  }

  private drawTurmoilCard(player: IPlayer) {
    // Rather than draw and discard potentially dozens of cards, find one card in the deck that's a Turmoil card.

    // First get all the card names for Turmoil Project cards by indexing the manifest.
    const turmoilCardNames = CardManifest.keys(TURMOIL_CARD_MANIFEST.projectCards);

    const projectDeck = player.game.projectDeck;
    const findCardIndex = () => {
      if (!player.game.gameOptions.openCardsVariant) {
        return projectDeck.drawPile.findIndex((card) => turmoilCardNames.includes(card.name));
      }
      // Open Cards exposes the normal draw order, whose first card is at the end of drawPile.
      for (let idx = projectDeck.drawPile.length - 1; idx >= 0; idx--) {
        if (turmoilCardNames.includes(projectDeck.drawPile[idx].name)) {
          return idx;
        }
      }
      return -1;
    };
    let cardIndex = findCardIndex();

    // If there's none in the draw pile, recycle the discard pile and look through it.
    if (cardIndex === -1) {
      if (player.game.gameOptions.openCardsVariant) {
        player.game.log(`The project deck has no Turmoil cards, so the discard pile becomes the new deck without shuffling.`);
      } else {
        player.game.log(`The project deck has no Turmoil cards, so the discard pile is being reshuffled to form a new deck.`);
      }
      projectDeck.recycle();
      cardIndex = findCardIndex();
    }

    if (cardIndex === -1) {
      player.game.log('${0} played ${1} to find a Turmoil card but none were found.', (b) => b.player(player).card(this));
    } else {
      const [drawnCard] = projectDeck.drawPile.splice(cardIndex, 1);

      player.cardsInHand.push(drawnCard);
      player.game.log('${0} drew ${1}', (b) => b.player(player).card(drawnCard));
    }

    return undefined;
  }
}
