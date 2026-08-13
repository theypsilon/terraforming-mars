<template>
  <div class="open-cards-panel" @mouseleave="closePreview">
    <component :is="collapsible ? 'details' : 'div'" class="open-cards-panel-container"
      :class="{'accordion': collapsible}" :open="collapsible ? true : undefined">
      <component :is="collapsible ? 'summary' : 'div'" class="open-cards-panel-title"
        :class="{'accordion-header': collapsible}">
        <div :class="{'is-action': collapsible}">
          <i v-if="collapsible" class="icon icon-arrow-right mr-1"></i>
          <span v-i18n>Project deck</span>&nbsp;<span>({{ openCards.projectDeck.length + openCards.projectDiscards.length }})</span>
        </div>
      </component>
      <div class="open-cards-panel-body" :class="{'accordion-body': collapsible}">
        <div class="open-cards-deck-row" v-for="(row, rowIdx) in rows" :key="rowIdx">
          <div class="open-cards-row-number" title="Generations until this draft">{{ rowIdx + 1 }}</div>
          <div class="open-cards-packets">
            <div class="open-cards-packet" :class="packetClass(packet)" v-for="(packet, packetIdx) in row" :key="packetIdx">
              <div class="open-cards-chip" v-for="name in packet.cards" :key="name" role="button" tabindex="0"
                :aria-expanded="isSelectedCard(name)"
                @mousemove="hoverCard(name, $event)" @mouseleave="closePreview"
                @click="toggleCard(name, $event)"
                @keydown.enter.prevent="toggleCard(name, $event)" @keydown.space.prevent="toggleCard(name, $event)">
                <CardChip :name="name"/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </component>
    <details v-if="openCards.preludeDeck.length > 0" class="open-cards-auxiliary-deck accordion" @toggle="closePreview">
      <summary class="open-cards-auxiliary-title accordion-header">
        <div class="is-action">
          <i class="icon icon-arrow-right mr-1"></i>
          <span v-i18n>Prelude deck</span>&nbsp;<span>({{ openCards.preludeDeck.length }})</span>
        </div>
      </summary>
      <div class="open-cards-ordered-cards accordion-body">
        <div class="open-cards-chip" v-for="name in openCards.preludeDeck" :key="name" role="button" tabindex="0"
          :aria-expanded="isSelectedCard(name)"
          @mousemove="hoverCard(name, $event)" @mouseleave="closePreview"
          @click="toggleCard(name, $event)"
          @keydown.enter.prevent="toggleCard(name, $event)" @keydown.space.prevent="toggleCard(name, $event)">
          <CardChip :name="name"/>
        </div>
      </div>
    </details>
    <details v-if="openCards.globalEventDeck.length > 0" class="open-cards-auxiliary-deck accordion" @toggle="closePreview">
      <summary class="open-cards-auxiliary-title accordion-header">
        <div class="is-action">
          <i class="icon icon-arrow-right mr-1"></i>
          <span v-i18n>Later global events</span>&nbsp;<span>({{ openCards.globalEventDeck.length }})</span>
        </div>
      </summary>
      <div class="open-cards-ordered-cards accordion-body">
        <div class="open-cards-chip" v-for="name in openCards.globalEventDeck" :key="name" role="button" tabindex="0"
          :aria-expanded="isSelectedGlobalEvent(name)"
          @mousemove="hoverGlobalEvent(name, $event)" @mouseleave="closePreview"
          @click="toggleGlobalEvent(name, $event)"
          @keydown.enter.prevent="toggleGlobalEvent(name, $event)" @keydown.space.prevent="toggleGlobalEvent(name, $event)">
          <span class="log-card card-chip background-color-global-event" v-i18n>{{ name }}</span>
        </div>
      </div>
    </details>
    <details v-if="openCards.corporationDeck.length > 0" class="open-cards-auxiliary-deck accordion" @toggle="closePreview">
      <summary class="open-cards-auxiliary-title accordion-header">
        <div class="is-action">
          <i class="icon icon-arrow-right mr-1"></i>
          <span v-i18n>Corporation deck</span>&nbsp;<span>({{ openCards.corporationDeck.length }})</span>
        </div>
      </summary>
      <div class="open-cards-ordered-cards accordion-body">
        <div class="open-cards-chip" v-for="name in openCards.corporationDeck" :key="name" role="button" tabindex="0"
          :aria-expanded="isSelectedCard(name)"
          @mousemove="hoverCard(name, $event)" @mouseleave="closePreview"
          @click="toggleCard(name, $event)"
          @keydown.enter.prevent="toggleCard(name, $event)" @keydown.space.prevent="toggleCard(name, $event)">
          <CardChip :name="name"/>
        </div>
      </div>
    </details>
    <Teleport to="body">
      <div v-if="previewedItem !== undefined" ref="preview" class="open-cards-preview"
        :class="previewClasses" :style="previewStyle">
        <Card v-if="previewedCard !== undefined" :key="previewedCard" :card="{name: previewedCard}"/>
        <GlobalEvent v-if="previewedGlobalEvent !== undefined" :key="previewedGlobalEvent"
          :globalEventName="previewedGlobalEvent" type="distant"/>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import {defineComponent, nextTick} from 'vue';

import Card from '@/client/components/card/Card.vue';
import CardChip from '@/client/components/card/CardChip.vue';
import GlobalEvent from '@/client/components/turmoil/GlobalEvent.vue';
import {CardName} from '@/common/cards/CardName';
import {Color} from '@/common/Color';
import {OpenCardsModel} from '@/common/models/OpenCardsModel';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';
import {playerColorClass} from '@/common/utils/utils';

/** A run of deck cards shown together because one player would draft them. */
type DeckPacket = {
  color: Color;
  cards: ReadonlyArray<CardName>;
};

type PreviewPosition = {
  top: number;
  left: number;
  placement: 'above' | 'below';
};

type PreviewItem =
  | {kind: 'card'; name: CardName}
  | {kind: 'globalEvent'; name: GlobalEventName};

type DataModel = {
  /**
   * The card or global event whose full representation is on show.
   *
   * It follows pointer movement rather than mouseenter, so that a row arriving under a
   * resting pointer, which happens on the first render, doesn't count as hovering.
   */
  hoveredItem: PreviewItem | undefined;
  selectedItem: PreviewItem | undefined;
  hoveredPreviewPosition: PreviewPosition | undefined;
  selectedPreviewPosition: PreviewPosition | undefined;
};

export default defineComponent({
  name: 'OpenCardsPanel',
  props: {
    openCards: {
      type: Object as () => OpenCardsModel,
      required: true,
    },
    collapsible: {
      type: Boolean,
      default: true,
    },
  },
  components: {
    Card,
    CardChip,
    GlobalEvent,
  },
  data(): DataModel {
    return {
      hoveredItem: undefined,
      selectedItem: undefined,
      hoveredPreviewPosition: undefined,
      selectedPreviewPosition: undefined,
    };
  },
  computed: {
    previewedItem(): PreviewItem | undefined {
      return this.hoveredItem ?? this.selectedItem;
    },
    previewedCard(): CardName | undefined {
      return this.previewedItem?.kind === 'card' ? this.previewedItem.name : undefined;
    },
    previewedGlobalEvent(): GlobalEventName | undefined {
      return this.previewedItem?.kind === 'globalEvent' ? this.previewedItem.name : undefined;
    },
    activePreviewPosition(): PreviewPosition | undefined {
      return this.hoveredItem === undefined ? this.selectedPreviewPosition : this.hoveredPreviewPosition;
    },
    previewClasses(): Record<string, boolean> {
      return {
        'open-cards-preview--above': this.activePreviewPosition?.placement === 'above',
        'open-cards-preview--below': this.activePreviewPosition?.placement === 'below',
      };
    },
    previewStyle(): Record<string, string> {
      const position = this.activePreviewPosition;
      if (position === undefined) {
        return {top: '0', left: '0', visibility: 'hidden'};
      }
      return {top: `${position.top}px`, left: `${position.left}px`};
    },
    /**
     * The deck grouped into the packets players would draft, one row per Research phase.
     *
     * The first row is the next draft. The rows below it repeat that pattern, which is what
     * players would receive if nobody drew a card in between.
     */
    rows(): Array<Array<DeckPacket>> {
      const futureCards = [...this.openCards.projectDeck, ...this.openCards.projectDiscards];
      // A packet is empty only when the deck is nearly exhausted. Dropping those keeps the
      // rows cycling through the players who still have cards coming.
      const packets = this.openCards.draftPackets.filter((packet) => packet.cards.length > 0);
      if (packets.length === 0) {
        return [];
      }
      // The server projection is authoritative for the first row, including cards that cross
      // from the draw pile into the FIFO recycle queue.
      const firstRow = packets.map((packet) => ({color: packet.color, cards: packet.cards}));
      const rows: Array<Array<DeckPacket>> = [firstRow];
      let idx = firstRow.reduce((count, packet) => count + packet.cards.length, 0);
      while (idx < futureCards.length) {
        const row: Array<DeckPacket> = [];
        for (const packet of packets) {
          const cards = futureCards.slice(idx, idx + packet.cards.length);
          if (cards.length > 0) {
            row.push({color: packet.color, cards: cards});
            idx += cards.length;
          }
        }
        rows.push(row);
      }
      return rows;
    },
  },
  methods: {
    closePreview() {
      this.hoveredItem = undefined;
      this.selectedItem = undefined;
      this.hoveredPreviewPosition = undefined;
      this.selectedPreviewPosition = undefined;
    },
    async hoverCard(name: CardName, event: MouseEvent) {
      await this.hoverItem({kind: 'card', name}, event);
    },
    async hoverGlobalEvent(name: GlobalEventName, event: MouseEvent) {
      await this.hoverItem({kind: 'globalEvent', name}, event);
    },
    async hoverItem(item: PreviewItem, event: MouseEvent) {
      const chip = event.currentTarget;
      if (!(chip instanceof window.HTMLElement)) {
        return;
      }
      if (!this.isSameItem(this.hoveredItem, item)) {
        this.hoveredPreviewPosition = undefined;
      }
      this.hoveredItem = item;
      await nextTick();
      if (this.isSameItem(this.hoveredItem, item)) {
        this.hoveredPreviewPosition = this.calculatePreviewPosition(chip);
      }
    },
    async toggleCard(name: CardName, event: Event) {
      await this.toggleItem({kind: 'card', name}, event);
    },
    async toggleGlobalEvent(name: GlobalEventName, event: Event) {
      await this.toggleItem({kind: 'globalEvent', name}, event);
    },
    async toggleItem(item: PreviewItem, event: Event) {
      const chip = event.currentTarget;
      this.hoveredItem = undefined;
      if (this.isSameItem(this.selectedItem, item)) {
        this.selectedItem = undefined;
        this.selectedPreviewPosition = undefined;
        return;
      }
      this.selectedItem = item;
      this.selectedPreviewPosition = undefined;
      await nextTick();
      if (this.isSameItem(this.selectedItem, item) && chip instanceof window.HTMLElement) {
        this.selectedPreviewPosition = this.calculatePreviewPosition(chip);
      }
    },
    isSameItem(first: PreviewItem | undefined, second: PreviewItem): boolean {
      return first?.kind === second.kind && first.name === second.name;
    },
    isSelectedCard(name: CardName): boolean {
      return this.isSameItem(this.selectedItem, {kind: 'card', name});
    },
    isSelectedGlobalEvent(name: GlobalEventName): boolean {
      return this.isSameItem(this.selectedItem, {kind: 'globalEvent', name});
    },
    calculatePreviewPosition(chip: HTMLElement): PreviewPosition | undefined {
      const preview = this.$refs.preview;
      if (!(preview instanceof window.HTMLElement)) {
        return undefined;
      }
      const previewRect = preview.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();
      const viewportMargin = 8;
      const stickyHudBottom = 70;
      const chipGap = 4;
      const availableAbove = chipRect.top - stickyHudBottom - chipGap;
      const availableBelow = window.innerHeight - chipRect.bottom - viewportMargin - chipGap;
      const placement = previewRect.height > availableAbove && availableBelow > availableAbove ? 'below' : 'above';

      const requestedTop = placement === 'below' ? chipRect.bottom + chipGap : chipRect.top - previewRect.height - chipGap;
      const maximumTop = Math.max(stickyHudBottom, window.innerHeight - previewRect.height - viewportMargin);
      const top = Math.min(Math.max(requestedTop, stickyHudBottom), maximumTop);

      const requestedLeft = chipRect.left + (chipRect.width - previewRect.width) / 2;
      const maximumLeft = Math.max(viewportMargin, window.innerWidth - previewRect.width - viewportMargin);
      const left = Math.min(Math.max(requestedLeft, viewportMargin), maximumLeft);

      return {top, left, placement};
    },
    packetClass(packet: DeckPacket): string {
      return playerColorClass(packet.color, 'bg_transparent');
    },
  },
});
</script>
