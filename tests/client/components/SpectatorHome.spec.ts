import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from './getLocalVue';
import SpectatorHome from '@/client/components/SpectatorHome.vue';
import {fakeGameModel, fakePublicPlayerModel} from './testHelpers';
import LogPanel from '@/client/components/logpanel/LogPanel.vue';
import OpenCardsPanel from '@/client/components/openCards/OpenCardsPanel.vue';

describe('SpectatorHome', () => {
  it('mounts without errors', () => {
    const player = fakePublicPlayerModel();
    const wrapper = shallowMount(SpectatorHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
          updateSpectator: () => {},
        },
      } as any,
      props: {
        spectator: {
          game: fakeGameModel(),
          players: [player],
          id: 's-spectator-id',
          thisPlayer: player,
          runId: 'run-id',
          color: 'neutral',
        },
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('keeps the full Project deck after spectator content', () => {
    const player = fakePublicPlayerModel();
    const game = fakeGameModel();
    game.openCards = {
      projectDeck: [],
      projectDiscards: [],
      draftPackets: [],
    };
    const wrapper = shallowMount(SpectatorHome, {
      ...globalConfig,
      parentComponent: {
        methods: {
          getVisibilityState: () => true,
          setVisibilityState: () => {},
          updateSpectator: () => {},
        },
      } as any,
      props: {
        spectator: {
          game,
          players: [player],
          id: 's-spectator-id',
          thisPlayer: player,
          runId: 'run-id',
          color: 'neutral',
        },
      },
    });

    const openCards = wrapper.getComponent(OpenCardsPanel).element;
    const log = wrapper.getComponent(LogPanel).element;
    expect(log.compareDocumentPosition(openCards) & Node.DOCUMENT_POSITION_FOLLOWING).not.eq(0);
  });
});
