import {shallowMount, VueWrapper} from '@vue/test-utils';
import {expect} from 'chai';
import {nextTick} from 'vue';
import {globalConfig} from '../getLocalVue';
import OpenCardsPanel from '@/client/components/openCards/OpenCardsPanel.vue';
import OpenCardsShortcut from '@/client/components/openCards/OpenCardsShortcut.vue';
import {CardName} from '@/common/cards/CardName';
import {OpenCardsModel} from '@/common/models/OpenCardsModel';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';

describe('OpenCardsShortcut', () => {
  const openCards: OpenCardsModel = {
    projectDeck: [],
    projectDiscards: [],
    draftPackets: [],
    preludeDeck: [CardName.ALLIED_BANK],
    globalEventDeck: [GlobalEventName.PRODUCTIVITY],
    corporationDeck: [CardName.HELION],
  };
  let wrapper: VueWrapper;

  beforeEach(() => {
    wrapper = shallowMount(OpenCardsShortcut, {
      ...globalConfig,
      props: {openCards},
      attachTo: document.body,
    });
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('toggles the Open Cards overlay when clicked', async () => {
    const trigger = wrapper.get('.open-cards-shortcut-trigger');

    expect(trigger.element.tagName).eq('BUTTON');
    expect(trigger.get('.open-cards-shortcut-label').text()).eq('Open Cards');
    expect(trigger.attributes('aria-label')).eq('Open Cards');
    expect(trigger.find('.tag-cards').exists()).is.false;
    expect(trigger.attributes('aria-expanded')).eq('false');
    expect(wrapper.find('.open-cards-shortcut-overlay').exists()).is.false;

    await trigger.trigger('click');

    expect(trigger.attributes('aria-expanded')).eq('true');
    expect(wrapper.get('.open-cards-shortcut-overlay').isVisible()).is.true;

    await trigger.trigger('click');

    expect(trigger.attributes('aria-expanded')).eq('false');
    expect(wrapper.find('.open-cards-shortcut-overlay').exists()).is.false;
  });

  it('closes the overlay with Escape', async () => {
    const trigger = wrapper.get<HTMLButtonElement>('.open-cards-shortcut-trigger');
    await trigger.trigger('click');

    trigger.element.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await nextTick();

    expect(trigger.attributes('aria-expanded')).eq('false');
    expect(document.activeElement).eq(trigger.element);
  });

  it('closes the overlay when clicking outside it', async () => {
    const trigger = wrapper.get('.open-cards-shortcut-trigger');
    await trigger.trigger('click');

    document.body.dispatchEvent(new window.MouseEvent('click', {bubbles: true}));
    await nextTick();

    expect(trigger.attributes('aria-expanded')).eq('false');
  });

  it('provides the same deck without redundant controls', async () => {
    await wrapper.get('.open-cards-shortcut-trigger').trigger('click');

    expect(wrapper.get('.open-cards-shortcut-overlay').attributes('role')).eq('region');
    expect(wrapper.get('.open-cards-shortcut-overlay').attributes('aria-label')).eq('Open Cards');
    expect(wrapper.getComponent(OpenCardsPanel).props('openCards')).deep.eq(openCards);
    expect(wrapper.getComponent(OpenCardsPanel).props('collapsible')).is.false;
    expect(wrapper.find('a[href="#openCards"]').exists()).is.false;
  });
});
