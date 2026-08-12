import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import PlayerHome from '@/client/components/PlayerHome.vue';
import {fakePlayerViewModel} from './testHelpers';
import {FakeLocalStorage} from './FakeLocalStorage';
import raw_settings from '@/genfiles/settings.json';
import OpenCardsPanel from '@/client/components/openCards/OpenCardsPanel.vue';
import PlayerSetupView from '@/client/components/PlayerSetupView.vue';

describe('PlayerHome', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
  });

  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView: fakePlayerViewModel(),
        settings: raw_settings,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('keeps the full Project deck after player-specific content', () => {
    const playerView = fakePlayerViewModel();
    playerView.game.openCards = {
      projectDeck: [],
      projectDiscards: [],
      draftPackets: [],
    };
    const wrapper = shallowMount(PlayerHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
        },
      } as any,
      props: {
        playerView,
        settings: raw_settings,
      },
    });

    const openCards = wrapper.getComponent(OpenCardsPanel).element;
    const setup = wrapper.getComponent(PlayerSetupView).element;
    expect(setup.compareDocumentPosition(openCards) & Node.DOCUMENT_POSITION_FOLLOWING).not.eq(0);
  });
});
