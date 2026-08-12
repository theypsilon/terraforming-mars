<template>
  <div class="log-card card-chip" :class="typeClass">
    <span>{{ $t(title) }}</span>
    <div class="log-tag" :class="'tag-' + tag" v-for="(tag, index) in tags" :key="index"></div>
    <div class="log-resource-megacredits" v-if="cost !== undefined">{{ cost }}</div>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import {getCardOrThrow} from '@/client/cards/ClientCardManifest';
import {CARD_TYPE_CSS} from '@/client/utils/CardUtils';
import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';

/**
 * A card on one line: its name, colored by card type, with its tags and cost.
 *
 * This is the same chip the log panel draws, for places that show more cards than
 * there is room to draw in full.
 */
export default defineComponent({
  name: 'CardChip',
  props: {
    name: {
      type: String as () => CardName,
      required: true,
    },
  },
  computed: {
    title(): string {
      return this.name.split(':')[0];
    },
    typeClass(): string | undefined {
      return CARD_TYPE_CSS[getCardOrThrow(this.name).type];
    },
    tags(): ReadonlyArray<Tag> {
      return getCardOrThrow(this.name).tags;
    },
    cost(): number | undefined {
      return getCardOrThrow(this.name).cost;
    },
  },
});

</script>
