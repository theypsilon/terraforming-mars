import {mount, shallowMount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import CreateGameForm from '@/client/components/create/CreateGameForm.vue';
import {CreateGameSettingsStorage} from '@/client/components/create/CreateGameSettingsStorage';
import {FakeLocalStorage} from '../FakeLocalStorage';
import {BoardName} from '@/common/boards/BoardName';
import {DEFAULT_EXPANSIONS} from '@/common/cards/GameModule';
import {JSONObject} from '@/common/Types';
import {defineComponent} from 'vue';

// Minimal serialized Create Game payload used by settings restore tests.
function createGameSettings(overrides: JSONObject = {}): JSONObject {
  return {
    players: [
      {name: 'Alice', color: 'red', beginner: false, handicap: 0},
      {name: 'Bob', color: 'blue', beginner: false, handicap: 0},
    ],
    expansions: DEFAULT_EXPANSIONS,
    board: BoardName.HELLAS,
    draftVariant: false,
    solarPhaseOption: true,
    ...overrides,
  };
}

describe('CreateGameForm', () => {
  let localStorage: FakeLocalStorage;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    FakeLocalStorage.register(localStorage);
  });

  afterEach(() => {
    FakeLocalStorage.deregister(localStorage);
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('restores the last saved game settings on load', async () => {
    new CreateGameSettingsStorage(localStorage).saveSettings(createGameSettings({
      expansions: {...DEFAULT_EXPANSIONS, venus: true},
    }));

    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).playersCount).eq(2);
    expect((wrapper.vm as any).players[0].name).eq('Alice');
    expect((wrapper.vm as any).players[1].name).eq('Bob');
    expect((wrapper.vm as any).board).eq(BoardName.HELLAS);
    expect((wrapper.vm as any).draftVariant).eq(false);
    expect((wrapper.vm as any).expansions.venus).eq(true);
    expect((wrapper.vm as any).solarPhaseOption).eq(true);
  });

  it('normalizes incompatible Open Cards options and preserves offer sizes', async () => {
    new CreateGameSettingsStorage(localStorage).saveSettings(createGameSettings({
      expansions: {...DEFAULT_EXPANSIONS, prelude: false, ceo: true, deltaProject: true},
      initialDraft: true,
      preludeDraftVariant: true,
      ceosDraftVariant: true,
      twoCorpsVariant: true,
      seededGame: true,
      startingCorporations: 4,
      startingPreludes: 8,
      openCardsVariant: true,
    }));

    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    await wrapper.vm.$nextTick();

    const form = wrapper.vm as any;
    expect(form.expansions.prelude).is.false;
    expect(form.expansions.ceo).is.false;
    expect(form.expansions.deltaProject).is.true;
    expect(form.initialDraft).is.false;
    expect(form.preludeDraftVariant).is.false;
    expect(form.ceosDraftVariant).is.false;
    expect(form.twoCorpsVariant).is.false;
    expect(form.seededGame).is.false;
    expect(form.startingCorporations).eq(4);
    expect(form.startingPreludes).eq(8);

    for (const selector of [
      '#ceo-checkbox',
      '#seeded-checkbox',
      '#initialDraft-checkbox',
    ]) {
      expect((wrapper.get(selector).element as HTMLInputElement).disabled, selector).is.true;
    }

    expect((wrapper.get('#prelude-checkbox').element as HTMLInputElement).disabled).is.false;
    expect((wrapper.get('#deltaProject-checkbox').element as HTMLInputElement).disabled).is.false;
    expect((wrapper.get('#startingCorpNum-checkbox').element as HTMLInputElement).disabled).is.false;
    expect(wrapper.find('#startingPreludeNum-checkbox').exists()).is.false;
    expect(wrapper.find('#twoCorps-checkbox').exists()).is.false;

    form.allOfficialExpansions = true;
    await wrapper.vm.$nextTick();
    expect(form.expansions.prelude).is.true;
    expect((wrapper.get('#startingPreludeNum-checkbox').element as HTMLInputElement).disabled).is.false;
    expect((wrapper.get('#twoCorps-checkbox').element as HTMLInputElement).disabled).is.true;

    form.allOfficialExpansions = false;
    await wrapper.vm.$nextTick();
    expect(form.expansions.prelude).is.false;
    expect(wrapper.find('#startingPreludeNum-checkbox').exists()).is.false;
  });

  it('offers Open Cards for one to five players and clears it at six', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const form = wrapper.vm as any;

    for (const count of [1, 2, 3, 4, 5]) {
      form.playersCount = count;
      await wrapper.vm.$nextTick();
      expect(wrapper.find('#openCards-checkbox').exists(), `${count} players`).is.true;
    }

    form.openCardsVariant = true;
    await wrapper.vm.$nextTick();
    form.playersCount = 6;
    await wrapper.vm.$nextTick();

    expect(form.openCardsVariant).is.false;
    expect(wrapper.find('#openCards-checkbox').exists()).is.false;
  });

  it('normalizes Open Cards immediately before serialization', async () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    const form = wrapper.vm as any;
    form.playersCount = 2;
    form.openCardsVariant = true;
    form.expansions.prelude = false;
    form.expansions.ceo = true;
    form.expansions.deltaProject = true;
    form.initialDraft = true;
    form.preludeDraftVariant = true;
    form.ceosDraftVariant = true;
    form.twoCorpsVariant = true;
    form.startingCorporations = 4;
    form.startingPreludes = 8;

    const settings = JSON.parse(await form.serializeSettings());

    expect(settings.expansions.prelude).is.false;
    expect(settings.expansions.ceo).is.false;
    expect(settings.expansions.deltaProject).is.true;
    expect(settings.initialDraft).is.false;
    expect(settings.preludeDraftVariant).is.false;
    expect(settings.ceosDraftVariant).is.false;
    expect(settings.twoCorpsVariant).is.false;
    expect(settings.startingCorporations).eq(4);
    expect(settings.startingPreludes).eq(8);
  });

  it('shows warnings when restoring saved settings', async () => {
    const alerts: Array<{title: string, message: string}> = [];
    const Root = defineComponent({
      components: {
        CreateGameForm,
      },
      template: '<CreateGameForm ref="form" />',
    });
    const wrapper = mount(Root, {
      ...globalConfig,
    });
    const form = wrapper.findComponent(CreateGameForm);
    (form.vm.$root as any).showAlert = (title: string, message: string) => {
      alerts.push({title, message});
    };

    new CreateGameSettingsStorage(localStorage).saveSettings(createGameSettings({
      customPreludes: ['Bad Prelude Name'],
    }));

    (form.vm as any).restoreLastSettings();
    await form.vm.$nextTick();

    expect(alerts).deep.eq([{
      title: 'Restore settings',
      message: "Settings loaded with these warnings: \nUnknown card name 'Bad Prelude Name' in customPreludes",
    }]);
  });

  it('resets the form and clears saved settings', async () => {
    const settingsStorage = new CreateGameSettingsStorage(localStorage);
    settingsStorage.saveSettings(createGameSettings());

    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).board).eq(BoardName.HELLAS);

    (wrapper.vm as any).resetSettings();
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).board).eq(BoardName.THARSIS);
    expect((wrapper.vm as any).draftVariant).eq(true);
    expect(settingsStorage.loadSettings()).eq(undefined);
    expect(wrapper.findAllComponents({name: 'AppButton'}).map((button) => button.props('title'))).includes('Reset');
  });

  it('clears uploading when applying settings throws', () => {
    const wrapper = shallowMount(CreateGameForm, {
      ...globalConfig,
    });

    expect(() => (wrapper.vm as any).applySettings(createGameSettings({
      players: [
        {name: 'Alice', color: 'red', beginner: false, handicap: 0},
        {name: 'Bob', color: 'red', beginner: false, handicap: 0},
      ],
    }))).throws('Colors are duplicated');
    expect((wrapper.vm as any).uploading).eq(false);
  });

  it('saves current settings before creating a game', async () => {
    const originalFetch = global.fetch;
    const originalAlert = global.alert;
    global.fetch = (() => Promise.reject(new Error('stop after saving'))) as typeof fetch;
    global.alert = (() => {}) as typeof alert;

    try {
      const wrapper = shallowMount(CreateGameForm, {
        ...globalConfig,
      });
      (wrapper.vm as any).playersCount = 2;
      (wrapper.vm as any).randomFirstPlayer = false;
      (wrapper.vm as any).players[0].name = 'Alice';
      (wrapper.vm as any).players[1].name = 'Bob';
      (wrapper.vm as any).board = BoardName.ELYSIUM;

      await (wrapper.vm as any).createGame();

      const savedSettings = new CreateGameSettingsStorage(localStorage).loadSettings();
      expect(savedSettings?.board).eq(BoardName.ELYSIUM);
      expect((savedSettings?.players as Array<{name: string}>).map((player) => player.name)).deep.eq(['Alice', 'Bob']);
    } finally {
      global.fetch = originalFetch;
      global.alert = originalAlert;
    }
  });
});
