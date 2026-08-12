import {CardModel} from '@/common/models/CardModel';
import {CardType} from '@/common/cards/CardType';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {getCard} from '@/client/cards/ClientCardManifest';

/** The background each card type is drawn with. */
export const CARD_TYPE_CSS: Record<CardType, string | undefined> = {
  event: 'background-color-events',
  corporation: 'background-color-corporation',
  active: 'background-color-active',
  automated: 'background-color-automated',
  prelude: 'background-color-prelude',
  ceo: 'background-color-ceo',
  standard_project: 'background-color-standard-project',
  standard_action: 'background-color-standard-project',
  proxy: undefined,
};

export function getCardsByType(inCards: ReadonlyArray<CardModel>, cardTypes: ReadonlyArray<CardType>): ReadonlyArray<CardModel> {
  const outCards = inCards.filter((inCard) => {
    const outCard = getCard(inCard.name);
    if (outCard === undefined) {
      return false;
    }
    return cardTypes.includes(outCard.type);
  });
  return outCards.reverse();
}

export function isCardActivated(card: CardModel, player: PublicPlayerModel): boolean {
  return player.actionsThisGeneration.includes(card.name) || (card.isDisabled === true);
}
