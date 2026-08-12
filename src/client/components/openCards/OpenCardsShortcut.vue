<template>
  <div class="open-cards-shortcut" ref="root">
    <button class="open-cards-shortcut-trigger" type="button" ref="trigger"
      :title="$t('Project deck')" :aria-label="$t('Project deck')"
      aria-controls="open-cards-shortcut-overlay" :aria-expanded="isOpen"
      @click="toggleOverlay">
      <span class="open-cards-shortcut-icon" aria-hidden="true">🂠</span>
      <span class="open-cards-shortcut-label" v-i18n>Open Cards</span>
    </button>
    <div v-if="isOpen" id="open-cards-shortcut-overlay" class="open-cards-shortcut-overlay"
      role="region" :aria-label="$t('Project deck')">
      <OpenCardsPanel :openCards="openCards" :collapsible="false"/>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

import OpenCardsPanel from '@/client/components/openCards/OpenCardsPanel.vue';
import {OpenCardsModel} from '@/common/models/OpenCardsModel';

type DataModel = {
  isOpen: boolean;
};

export default defineComponent({
  name: 'OpenCardsShortcut',
  props: {
    openCards: {
      type: Object as () => OpenCardsModel,
      required: true,
    },
  },
  components: {
    OpenCardsPanel,
  },
  data(): DataModel {
    return {
      isOpen: false,
    };
  },
  mounted() {
    document.addEventListener('click', this.closeOnOutsideClick);
    window.addEventListener('keydown', this.closeOnEscape);
  },
  unmounted() {
    document.removeEventListener('click', this.closeOnOutsideClick);
    window.removeEventListener('keydown', this.closeOnEscape);
  },
  methods: {
    toggleOverlay() {
      this.isOpen = !this.isOpen;
    },
    closeOverlay() {
      this.isOpen = false;
    },
    closeOnOutsideClick(event: MouseEvent) {
      const root = this.$refs.root;
      const target = event.target;
      if (this.isOpen && root instanceof window.HTMLElement && target instanceof window.Node && !root.contains(target)) {
        this.closeOverlay();
      }
    },
    closeOnEscape(event: KeyboardEvent) {
      if (this.isOpen && event.key === 'Escape') {
        this.closeOverlay();
        const trigger = this.$refs.trigger;
        if (trigger instanceof window.HTMLButtonElement) {
          trigger.focus();
        }
      }
    },
  },
});
</script>
