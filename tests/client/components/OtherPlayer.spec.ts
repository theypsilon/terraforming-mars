import {shallowMount, VueWrapper} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import Card from '@/client/components/card/Card.vue';
import OtherPlayer from '@/client/components/OtherPlayer.vue';
import {CardName} from '@/common/cards/CardName';
import {PublicPlayerModel} from '@/common/models/PlayerModel';
import {fakePublicPlayerModel} from './testHelpers';

function mountOtherPlayer(player: PublicPlayerModel) {
  return shallowMount(OtherPlayer, {
    ...globalConfig,
    global: {
      ...globalConfig.global,
      mixins: [{
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      }],
    },
    props: {
      player: player,
      playerIndex: 0,
    },
  });
}

describe('OtherPlayer', () => {
  it('mounts without errors', () => {
    const wrapper = mountOtherPlayer(fakePublicPlayerModel());
    expect(wrapper.exists()).to.be.true;
  });

  it('shows no hand when the game does not make it public', () => {
    const wrapper = mountOtherPlayer(fakePublicPlayerModel());
    expect(wrapper.text()).does.not.include('Cards In Hand');
  });

  it('shows the hand Open Cards makes public', () => {
    const wrapper = mountOtherPlayer(fakePublicPlayerModel({
      preludeCardsInHand: [{name: CardName.ALLIED_BANK}],
      cardsInHand: [{name: CardName.CAPITAL}, {name: CardName.FISH}],
    }));

    expect(wrapper.text()).includes('Cards In Hand');
    expect(wrapper.findAllComponents(Card).map((card: VueWrapper<any>) => card.props('card').name))
      .deep.eq([CardName.ALLIED_BANK, CardName.CAPITAL, CardName.FISH]);
  });
});
