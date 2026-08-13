import {DOMWrapper, mount, shallowMount, VueWrapper} from '@vue/test-utils';
import {expect} from 'chai';
import {nextTick} from 'vue';
import {globalConfig} from '../getLocalVue';
import Card from '@/client/components/card/Card.vue';
import CardChip from '@/client/components/card/CardChip.vue';
import OpenCardsPanel from '@/client/components/openCards/OpenCardsPanel.vue';
import GlobalEvent from '@/client/components/turmoil/GlobalEvent.vue';
import {CardName} from '@/common/cards/CardName';
import {OpenCardsModel} from '@/common/models/OpenCardsModel';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';

const DECK = [
  CardName.ACQUIRED_COMPANY,
  CardName.BIOFERTILIZER_FACILITY,
  CardName.CAPITAL,
  CardName.DECOMPOSERS,
  CardName.EARTH_OFFICE,
  CardName.FISH,
  CardName.GENE_REPAIR,
  CardName.HACKERS,
  CardName.IMPORTED_GHG,
  CardName.KELP_FARMING,
  CardName.LAVA_FLOWS,
] as const;

const FIVE_PLAYER_DECK = [
  ...DECK,
  CardName.AI_CENTRAL,
  CardName.ALGAE,
  CardName.ANTS,
  CardName.ASTEROID,
  CardName.BIRDS,
  CardName.COMET,
  CardName.FLOODING,
  CardName.MICRO_MILLS,
  CardName.MOHOLE_AREA,
] as const;

const SIX_PLAYER_DECK = [
  ...FIVE_PLAYER_DECK,
  CardName.NITRITE_REDUCING_BACTERIA,
  CardName.POWER_GRID,
  CardName.RESEARCH,
  CardName.STEELWORKS,
] as const;

function fakeOpenCardsModel(overrides?: Partial<OpenCardsModel>): OpenCardsModel {
  return {
    projectDeck: [...DECK],
    projectDiscards: [],
    draftPackets: [
      {color: 'blue', cards: DECK.slice(0, 4)},
      {color: 'red', cards: DECK.slice(4, 8)},
    ],
    preludeDeck: [],
    globalEventDeck: [],
    corporationDeck: [],
    ...overrides,
  };
}

function mountPanel(openCards: OpenCardsModel, collapsible = true) {
  return shallowMount(OpenCardsPanel, {
    ...globalConfig,
    global: {
      ...globalConfig.global,
      stubs: {teleport: true},
    },
    props: {openCards, collapsible},
  });
}

/** The cards rendered inside `wrapper`, in the order they appear. */
function cardNames(wrapper: DOMWrapper<Element>): Array<CardName> {
  return wrapper.findAllComponents(CardChip).map((card: VueWrapper<any>) => card.props('name'));
}

describe('OpenCardsPanel', () => {
  it('mounts without errors', () => {
    const wrapper = mountPanel(fakeOpenCardsModel());
    expect(wrapper.exists()).to.be.true;
  });

  it('shows the lower-page project deck with its collapse control', () => {
    const wrapper = mountPanel(fakeOpenCardsModel());

    expect(wrapper.get('.open-cards-panel-title').text()).includes('Project deck');
    expect(wrapper.get('details').attributes()).has.property('open');
    expect(wrapper.find('summary').exists()).is.true;
  });

  it('can show the popup project deck without a collapse control', () => {
    const wrapper = mountPanel(fakeOpenCardsModel(), false);

    expect(wrapper.get('.open-cards-panel-title').text()).includes('Project deck');
    expect(wrapper.find('details').exists()).is.false;
    expect(wrapper.find('summary').exists()).is.false;
  });

  it('keeps auxiliary deck controls collapsed in the popup', () => {
    const wrapper = mountPanel(fakeOpenCardsModel({
      preludeDeck: [CardName.ALLIED_BANK],
      globalEventDeck: [GlobalEventName.PRODUCTIVITY],
      corporationDeck: [CardName.HELION],
    }), false);

    expect(wrapper.get('.open-cards-panel-container').element.tagName).eq('DIV');
    const auxiliaryDecks = wrapper.findAll('.open-cards-auxiliary-deck');
    expect(auxiliaryDecks).has.length(3);
    for (const deck of auxiliaryDecks) {
      expect(deck.element.tagName).eq('DETAILS');
      expect(deck.attributes()).not.to.have.property('open');
      expect(deck.find('summary').exists()).is.true;
    }
  });

  it('keeps the two-player row as two four-card packets', () => {
    const wrapper = mountPanel(fakeOpenCardsModel());

    const rows = wrapper.findAll('.open-cards-deck-row');
    expect(rows).has.length(2);
    expect(rows[0].findAll('.open-cards-packets')).has.length(1);

    const first = rows[0].findAll('.open-cards-packet');
    expect(first).has.length(2);
    expect(cardNames(first[0])).has.length(4);
    expect(cardNames(first[1])).has.length(4);
    expect(cardNames(rows[0])).has.length(8);
  });

  it('puts five player packets in one logical row', () => {
    const colors = ['red', 'green', 'blue', 'yellow', 'black'] as const;
    const wrapper = mountPanel(fakeOpenCardsModel({
      projectDeck: [...FIVE_PLAYER_DECK],
      draftPackets: colors.map((color, idx) => ({
        color,
        cards: FIVE_PLAYER_DECK.slice(idx * 4, idx * 4 + 4),
      })),
    }));

    const rows = wrapper.findAll('.open-cards-deck-row');
    expect(rows).has.length(1);
    const packetGrid = rows[0].find('.open-cards-packets');
    expect(packetGrid.exists()).is.true;
    const packets = packetGrid.findAll('.open-cards-packet');
    expect(packets).has.length(5);
    expect(packets.map((packet) => cardNames(packet).length)).deep.eq([4, 4, 4, 4, 4]);
    expect(cardNames(packetGrid)).deep.eq([...FIVE_PLAYER_DECK]);
  });

  it('puts six player packets in one logical row', () => {
    const colors = ['red', 'green', 'blue', 'yellow', 'black', 'purple'] as const;
    const wrapper = mountPanel(fakeOpenCardsModel({
      projectDeck: [...SIX_PLAYER_DECK],
      draftPackets: colors.map((color, idx) => ({
        color,
        cards: SIX_PLAYER_DECK.slice(idx * 4, idx * 4 + 4),
      })),
    }));

    const rows = wrapper.findAll('.open-cards-deck-row');
    expect(rows).has.length(1);
    const packetGrid = rows[0].find('.open-cards-packets');
    const packets = packetGrid.findAll('.open-cards-packet');
    expect(packets).has.length(6);
    expect(packets.map((packet) => cardNames(packet).length)).deep.eq([4, 4, 4, 4, 4, 4]);
    expect(cardNames(packetGrid)).deep.eq([...SIX_PLAYER_DECK]);
  });

  it('colors each packet for the player who would draft it', () => {
    const wrapper = mountPanel(fakeOpenCardsModel());

    const packets = wrapper.findAll('.open-cards-deck-row')[0].findAll('.open-cards-packet');
    expect(packets[0].classes()).includes('player_translucent_bg_color_blue');
    expect(packets[1].classes()).includes('player_translucent_bg_color_red');
  });

  it('shows the cards in the order they will be drawn', () => {
    const wrapper = mountPanel(fakeOpenCardsModel());

    const names = wrapper.findAll('.open-cards-packet').flatMap(cardNames);
    expect(names).deep.eq([...DECK]);
  });

  it('a partial final row keeps its grouping', () => {
    const wrapper = mountPanel(fakeOpenCardsModel());

    const rows = wrapper.findAll('.open-cards-deck-row');
    const last = rows[1].findAll('.open-cards-packet');
    expect(last).has.length(1);
    expect(cardNames(last[0])).has.length(3);
    expect(last[0].classes()).includes('player_translucent_bg_color_blue');
  });

  it('a deck shorter than one packet is a single row', () => {
    const wrapper = mountPanel(fakeOpenCardsModel({
      projectDeck: DECK.slice(0, 2),
      draftPackets: [
        {color: 'blue', cards: DECK.slice(0, 2)},
        {color: 'red', cards: []},
      ],
    }));

    const rows = wrapper.findAll('.open-cards-deck-row');
    expect(rows).has.length(1);
    expect(rows[0].findAll('.open-cards-packet')).has.length(1);
    expect(cardNames(rows[0])).has.length(2);
  });

  it('shows recycled cards in the packets that will actually receive them', () => {
    const wrapper = mountPanel(fakeOpenCardsModel({
      projectDeck: DECK.slice(0, 3),
      projectDiscards: DECK.slice(3, 9),
      draftPackets: [
        {color: 'blue', cards: DECK.slice(0, 4)},
        {color: 'red', cards: DECK.slice(4, 8)},
      ],
    }));

    const rows = wrapper.findAll('.open-cards-deck-row');
    const packets = rows[0].findAll('.open-cards-packet');
    expect(cardNames(packets[0])).deep.eq(DECK.slice(0, 4));
    expect(cardNames(packets[1])).deep.eq(DECK.slice(4, 8));
    expect(cardNames(rows[1])).deep.eq(DECK.slice(8, 9));
  });

  it('continues through the recycle queue in the same container', () => {
    const discards = [CardName.MOHOLE_AREA, CardName.NITRITE_REDUCING_BACTERIA];
    const projectDeck = DECK.slice(0, 8);
    const wrapper = mountPanel(fakeOpenCardsModel({projectDeck, projectDiscards: discards}));

    expect(wrapper.findAll('.open-cards-panel-body')).has.length(1);
    expect(wrapper.find('.open-cards-panel-title').text()).includes('(10)');
    expect(wrapper.findAll('.open-cards-packet').flatMap(cardNames)).deep.eq([...projectDeck, ...discards]);
  });

  it('shows the Prelude deck below the project deck, collapsed and in draw order', () => {
    const preludes = [CardName.ALLIED_BANK, CardName.AQUIFER_TURBINES, CardName.BIOFUELS];
    const wrapper = mountPanel(fakeOpenCardsModel({preludeDeck: preludes}));

    const auxiliaryDeck = wrapper.get('.open-cards-auxiliary-deck');
    expect(auxiliaryDeck.element.tagName).eq('DETAILS');
    expect(auxiliaryDeck.attributes()).not.to.have.property('open');
    expect(auxiliaryDeck.get('.open-cards-auxiliary-title').text()).includes('Prelude deck');
    expect(auxiliaryDeck.get('.open-cards-auxiliary-title').text()).includes('(3)');
    expect(auxiliaryDeck.findAllComponents(CardChip).map((card: VueWrapper<any>) => card.props('name'))).deep.eq(preludes);
    expect(auxiliaryDeck.element.previousElementSibling).eq(wrapper.get('.open-cards-panel-container').element);
    expect(wrapper.find('.open-cards-panel-container .open-cards-auxiliary-deck').exists()).is.false;
  });

  it('shows later global events after the Prelude deck in draw order', () => {
    const events = [GlobalEventName.PRODUCTIVITY, GlobalEventName.SNOW_COVER];
    const wrapper = mountPanel(fakeOpenCardsModel({
      preludeDeck: [CardName.ALLIED_BANK],
      globalEventDeck: events,
    }));

    const auxiliaryDecks = wrapper.findAll('.open-cards-auxiliary-deck');
    expect(auxiliaryDecks).has.length(2);
    expect(auxiliaryDecks[1].get('.open-cards-auxiliary-title').text()).includes('Later global events');
    expect(auxiliaryDecks[1].get('.open-cards-auxiliary-title').text()).includes('(2)');
    expect(auxiliaryDecks[1].attributes()).not.to.have.property('open');
    expect(auxiliaryDecks[1].findAll('.background-color-global-event').map((event) => event.text())).deep.eq(events);
  });

  it('shows the Corporation deck after the other auxiliary decks in draw order', () => {
    const corporations = [CardName.HELION, CardName.ECOLINE];
    const wrapper = mountPanel(fakeOpenCardsModel({
      preludeDeck: [CardName.ALLIED_BANK],
      globalEventDeck: [GlobalEventName.PRODUCTIVITY],
      corporationDeck: corporations,
    }));

    const auxiliaryDecks = wrapper.findAll('.open-cards-auxiliary-deck');
    expect(auxiliaryDecks).has.length(3);
    const corporationDeck = auxiliaryDecks[2];
    expect(corporationDeck.get('.open-cards-auxiliary-title').text()).includes('Corporation deck');
    expect(corporationDeck.get('.open-cards-auxiliary-title').text()).includes('(2)');
    expect(corporationDeck.attributes()).not.to.have.property('open');
    expect(corporationDeck.findAllComponents(CardChip).map((card: VueWrapper<any>) => card.props('name'))).deep.eq(corporations);
  });

  it('previews Prelude, global event, and Corporation cards on hover and click', async () => {
    const event = GlobalEventName.PRODUCTIVITY;
    const wrapper = mountPanel(fakeOpenCardsModel({
      preludeDeck: [CardName.ALLIED_BANK],
      globalEventDeck: [event],
      corporationDeck: [CardName.HELION],
    }));
    const auxiliaryDecks = wrapper.findAll('.open-cards-auxiliary-deck');
    const prelude = auxiliaryDecks[0].get('.open-cards-chip');
    const globalEvent = auxiliaryDecks[1].get('.open-cards-chip');
    const corporation = auxiliaryDecks[2].get('.open-cards-chip');

    await prelude.trigger('mousemove');
    expect(wrapper.getComponent(Card).props('card').name).eq(CardName.ALLIED_BANK);
    await prelude.trigger('mouseleave');

    await globalEvent.trigger('click');
    expect(wrapper.getComponent(GlobalEvent).props('globalEventName')).eq(event);
    expect(globalEvent.attributes('aria-expanded')).eq('true');

    await corporation.trigger('click');
    expect(wrapper.getComponent(Card).props('card').name).eq(CardName.HELION);
    expect(corporation.attributes('aria-expanded')).eq('true');
  });

  it('shows a card in full while the pointer is over its chip', async () => {
    const wrapper = mountPanel(fakeOpenCardsModel());
    expect(wrapper.find('.open-cards-preview').exists()).is.false;

    const chips = wrapper.findAll('.open-cards-chip');
    await chips[2].trigger('mousemove');
    expect(wrapper.findComponent(Card).props('card').name).eq(DECK[2]);

    await chips[2].trigger('mouseleave');
    expect(wrapper.find('.open-cards-preview').exists()).is.false;
  });

  it('toggles the same full-card preview when a chip is clicked', async () => {
    const wrapper = mountPanel(fakeOpenCardsModel());
    const chip = wrapper.findAll('.open-cards-chip')[2];

    await chip.trigger('click');
    expect(wrapper.findComponent(Card).props('card').name).eq(DECK[2]);
    expect(chip.attributes('aria-expanded')).eq('true');

    await chip.trigger('click');
    expect(wrapper.find('.open-cards-preview').exists()).is.false;
    expect(chip.attributes('aria-expanded')).eq('false');
  });

  it('does not restore a clicked card after a hovered card closes', async () => {
    const wrapper = mountPanel(fakeOpenCardsModel());
    const chips = wrapper.findAll('.open-cards-chip');

    await chips[0].trigger('click');
    expect(wrapper.findComponent(Card).props('card').name).eq(DECK[0]);

    await chips[1].trigger('mousemove');
    expect(wrapper.findComponent(Card).props('card').name).eq(DECK[1]);

    await chips[1].trigger('mouseleave');
    expect(wrapper.find('.open-cards-preview').exists()).is.false;
    expect(chips[0].attributes('aria-expanded')).eq('false');
  });

  it('opens below its chip when an upward preview would cross the sticky HUD', async () => {
    const wrapper = mountPanel(fakeOpenCardsModel());
    const original = window.HTMLElement.prototype.getBoundingClientRect;
    window.HTMLElement.prototype.getBoundingClientRect = function(): DOMRect {
      if (this.classList.contains('open-cards-chip')) {
        return {x: 100, y: 100, top: 100, right: 200, bottom: 120, left: 100, width: 100, height: 20, toJSON: () => ({})};
      }
      if (this.classList.contains('open-cards-preview')) {
        return {x: 0, y: 0, top: 0, right: 240, bottom: 300, left: 0, width: 240, height: 300, toJSON: () => ({})};
      }
      return original.call(this);
    };

    try {
      await wrapper.findAll('.open-cards-chip')[0].trigger('mousemove');
      await nextTick();
      const preview = wrapper.get('.open-cards-preview');
      expect(preview.classes()).includes('open-cards-preview--below');
      expect(preview.attributes('style')).includes('top: 124px');
      expect(preview.attributes('style')).includes('left: 30px');
    } finally {
      window.HTMLElement.prototype.getBoundingClientRect = original;
    }
  });

  it('opens above its chip and stays inside the viewport edge', async () => {
    const wrapper = mountPanel(fakeOpenCardsModel());
    const original = window.HTMLElement.prototype.getBoundingClientRect;
    window.HTMLElement.prototype.getBoundingClientRect = function(): DOMRect {
      if (this.classList.contains('open-cards-chip')) {
        return {
          x: window.innerWidth - 20,
          y: 500,
          top: 500,
          right: window.innerWidth,
          bottom: 520,
          left: window.innerWidth - 20,
          width: 20,
          height: 20,
          toJSON: () => ({}),
        };
      }
      if (this.classList.contains('open-cards-preview')) {
        return {x: 0, y: 0, top: 0, right: 240, bottom: 300, left: 0, width: 240, height: 300, toJSON: () => ({})};
      }
      return original.call(this);
    };

    try {
      await wrapper.findAll('.open-cards-chip')[0].trigger('mousemove');
      await nextTick();
      const preview = wrapper.get('.open-cards-preview');
      expect(preview.classes()).includes('open-cards-preview--above');
      expect(preview.attributes('style')).includes('top: 196px');
      expect(preview.attributes('style')).includes(`left: ${window.innerWidth - 248}px`);
    } finally {
      window.HTMLElement.prototype.getBoundingClientRect = original;
    }
  });

  it('teleports the preview outside the clipping deck containers', async () => {
    const wrapper = mount(OpenCardsPanel, {
      ...globalConfig,
      props: {openCards: fakeOpenCardsModel()},
      attachTo: document.body,
    });

    try {
      await wrapper.findAll('.open-cards-chip')[0].trigger('mousemove');
      await nextTick();
      const preview = document.body.querySelector('.open-cards-preview');
      expect(preview).not.eq(null);
      expect(preview?.closest('.open-cards-panel')).eq(null);
    } finally {
      wrapper.unmount();
    }
  });

  it('moving to another chip swaps the card on show, contents and all', async () => {
    // Mounted for real, because Card reads its card once when it is created. A shared
    // instance would keep the first card's contents under the second card's title.
    const wrapper = mount(OpenCardsPanel, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        stubs: {teleport: true},
      },
      props: {openCards: fakeOpenCardsModel()},
    });
    const chips = wrapper.findAll('.open-cards-chip');

    await chips[1].trigger('mousemove');
    expect(wrapper.find('.open-cards-preview').text()).includes('Requires 1 science tag');

    await chips[1].trigger('mouseleave');
    await chips[2].trigger('mousemove');
    const preview = wrapper.find('.open-cards-preview').text();
    expect(preview).includes('Requires 4 ocean tiles');
    expect(preview).does.not.include('Requires 1 science tag');
  });

  it('numbers the rows by how many generations away their draft is', () => {
    const wrapper = mountPanel(fakeOpenCardsModel());

    expect(wrapper.findAll('.open-cards-row-number').map((n) => n.text())).deep.eq(['1', '2']);
  });
});
