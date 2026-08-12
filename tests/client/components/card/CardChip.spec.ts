import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import CardChip from '@/client/components/card/CardChip.vue';
import {CardName} from '@/common/cards/CardName';

function mountChip(name: CardName) {
  return shallowMount(CardChip, {
    ...globalConfig,
    props: {name},
  });
}

describe('CardChip', () => {
  it('mounts without errors', () => {
    const wrapper = mountChip(CardName.CAPITAL);
    expect(wrapper.exists()).to.be.true;
  });

  it('shows the name, tags and cost', () => {
    const wrapper = mountChip(CardName.CAPITAL);

    expect(wrapper.text()).includes('Capital');
    expect(wrapper.text()).includes('26');
    expect(wrapper.findAll('.log-tag').map((tag) => tag.classes())).deep.eq([
      ['log-tag', 'tag-city'],
      ['log-tag', 'tag-building'],
    ]);
  });

  it('colors the name by card type', () => {
    expect(mountChip(CardName.CAPITAL).classes()).includes('background-color-automated');
    expect(mountChip(CardName.SEARCH_FOR_LIFE).classes()).includes('background-color-active');
    expect(mountChip(CardName.ASTEROID).classes()).includes('background-color-events');
  });

  it('drops the suffix from a name that has one', () => {
    expect(mountChip(CardName.SPECIAL_DESIGN).text()).includes('Special Design');
  });
});
