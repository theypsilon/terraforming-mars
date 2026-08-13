import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import {fakePublicPlayerModel} from '../testHelpers';
import OpenCardsSetup from '@/client/components/openCards/OpenCardsSetup.vue';
import {CardName} from '@/common/cards/CardName';
import {Color} from '@/common/Color';
import {OpenCardsModel, OpenCardsPlayerModel} from '@/common/models/OpenCardsModel';

function fakeOffers(overrides?: Partial<OpenCardsPlayerModel>): OpenCardsPlayerModel {
  return {
    color: 'blue',
    corporations: [CardName.ECOLINE, CardName.THARSIS_REPUBLIC],
    preludes: [CardName.ALLIED_BANK, CardName.AQUIFER_TURBINES, CardName.BIOFUELS, CardName.DOME_FARMING],
    projects: [CardName.ACQUIRED_COMPANY, CardName.CAPITAL],
    ...overrides,
  };
}

function mountSetup(players: ReadonlyArray<OpenCardsPlayerModel>, viewerColor?: Color) {
  const openCards: OpenCardsModel = {
    players: players,
    projectDeck: [],
    projectDiscards: [],
    draftPackets: [],
    preludeDeck: [],
    globalEventDeck: [],
  };
  return shallowMount(OpenCardsSetup, {
    ...globalConfig,
    props: {
      openCards: openCards,
      players: [
        fakePublicPlayerModel({color: 'blue', name: 'blue'}),
        fakePublicPlayerModel({color: 'red', name: 'red'}),
      ],
      viewerColor: viewerColor,
    },
  });
}

describe('OpenCardsSetup', () => {
  it('mounts without errors', () => {
    const wrapper = mountSetup([fakeOffers()]);
    expect(wrapper.exists()).to.be.true;
  });

  it('shows every player section to a spectator', () => {
    const wrapper = mountSetup([fakeOffers(), fakeOffers({color: 'red'})]);

    const offers = wrapper.findAll('.open-cards-offer');
    expect(offers).has.length(2);
    expect(wrapper.findAll('.open-cards-player-name').map((header) => header.text())).deep.eq(['blue', 'red']);
    // 2 corporations, 4 preludes and 2 projects.
    expect(offers[0].findAll('card-stub')).has.length(8);
  });

  it('leaves out the offers of the player reading it', () => {
    const wrapper = mountSetup([fakeOffers(), fakeOffers({color: 'red'})], 'blue');

    const offers = wrapper.findAll('.open-cards-offer');
    expect(offers).has.length(1);
    expect(offers[0].get('.open-cards-player-name').text()).eq('red');
    expect(offers[0].get('.open-cards-player-header').classes()).includes('player_translucent_bg_color_red');
  });

  it('does not show selections until both players submit', () => {
    const wrapper = mountSetup([fakeOffers()]);

    expect(wrapper.findAll('.open-cards-setup-section-title').map((title) => title.text())).deep.eq(['Starting offer']);
    expect(wrapper.findAll('card-stub')).has.length(8);
  });

  it('shows selections once both players submit', () => {
    const wrapper = mountSetup([fakeOffers({
      selection: {
        corporation: CardName.ECOLINE,
        preludes: [CardName.ALLIED_BANK, CardName.BIOFUELS],
        projects: [CardName.CAPITAL],
      },
    })]);

    expect(wrapper.findAll('.open-cards-setup-section-title').map((title) => title.text())).deep.eq([
      'Starting offer',
      'Selected cards',
    ]);
    // The eight offers, plus the corporation, two preludes and one project that were kept.
    expect(wrapper.findAll('card-stub')).has.length(12);
  });

  it('uses a player-colored header for each set of offers', () => {
    const wrapper = mountSetup([fakeOffers({color: 'red'})]);

    const header = wrapper.get('.open-cards-player-header');
    expect(header.text()).eq('red');
    expect(header.classes()).includes('player_translucent_bg_color_red');
  });
});
