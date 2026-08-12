<template>
  <div class="open-cards-setup">
    <div class="open-cards-offer" v-for="player in offers" :key="player.color">
      <div class="open-cards-player-header" :class="'player_translucent_bg_color_' + player.color">
        <span class="open-cards-player-name">{{ playerName(player.color) }}</span>
      </div>
      <h3 class="open-cards-setup-section-title" v-i18n>Starting offer</h3>
      <div>
        <div class="cardbox" v-for="name in player.corporations" :key="name">
          <Card :card="{name}"/>
        </div>
        <div class="cardbox" v-for="name in player.preludes" :key="name">
          <Card :card="{name}"/>
        </div>
        <div class="cardbox" v-for="name in player.projects" :key="name">
          <Card :card="{name}"/>
        </div>
      </div>

      <template v-if="player.selection !== undefined">
        <h3 class="open-cards-setup-section-title" v-i18n>Selected cards</h3>
        <div>
          <div class="cardbox">
            <Card :card="{name: player.selection.corporation}"/>
          </div>
          <div class="cardbox" v-for="name in player.selection.preludes" :key="name">
            <Card :card="{name}"/>
          </div>
          <div class="cardbox" v-for="name in player.selection.projects" :key="name">
            <Card :card="{name}"/>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

import Card from '@/client/components/card/Card.vue';
import {Color} from '@/common/Color';
import {OpenCardsModel, OpenCardsPlayerModel} from '@/common/models/OpenCardsModel';
import {PublicPlayerModel} from '@/common/models/PlayerModel';

export default defineComponent({
  name: 'OpenCardsSetup',
  props: {
    openCards: {
      type: Object as () => OpenCardsModel,
      required: true,
    },
    players: {
      type: Array as () => ReadonlyArray<PublicPlayerModel>,
      required: true,
    },
    /** The player reading this. Their own offers are on the rest of the page already. */
    viewerColor: {
      type: String as () => Color,
      required: false,
      default: undefined,
    },
  },
  components: {
    Card,
  },
  computed: {
    offers(): ReadonlyArray<OpenCardsPlayerModel> {
      return this.openCards.players?.filter((player) => player.color !== this.viewerColor) ?? [];
    },
  },
  methods: {
    playerName(color: Color): string {
      return this.players.find((player) => player.color === color)?.name ?? '';
    },
  },
});
</script>
