<template>
  <div class="reconciliation-table">
    <table class="reconciliation-table-inner">
      <tbody>
        <template v-for="(group, groupIndex) in groups" :key="`${tableKey}-group-${groupIndex}`">
          <tr
            v-for="(item, i) in group.items"
            :key="`${tableKey}-${groupIndex}-${i}`"
            class="table-row"
            :class="{ 'group-last': i === group.items.length - 1 }"
          >
            <!-- Direct match: single merged cell -->
            <template v-if="isDirectMatch(group, item)">
              <td
                class="table-cell direct-match-cell"
                colspan="2"
                @mouseenter="$emit('row-hovered', item, $event)"
                @mouseleave="$emit('row-hovered')"
              >
                <div class="target-content">
                  <span class="term-label">{{ capitalise(item.sckanLabel) }}</span>
                  <el-popover
                    width="150"
                    trigger="hover"
                    :teleported="true"
                    :append-to="connectivityListContainer"
                    popper-class="popover-origin-help"
                  >
                    <template #reference>
                      <el-icon
                        class="status-search-icon"
                        @click="$emit('connectivity-clicked', item.mapLabel)"
                      >
                        <el-icon-search />
                      </el-icon>
                    </template>
                    <span>Search connectivity</span>
                  </el-popover>
                </div>
              </td>
            </template>

            <!-- Non-direct match: separate source and target columns -->
            <template v-else>
              <td
                class="table-cell source-column"
                :class="{
                  mapped: this.isMatch(item),
                  'highlighted-by-target':
                    hoveredGroupIndex === groupIndex &&
                    (!group.items[0].mapId || group.items[0].mapId.length === 0),
                }"
                @mouseenter="onSourceHover(groupIndex, item, $event)"
                @mouseleave="onSourceLeave(item)"
              >
                <span class="term-label">{{ capitalise(item.sckanLabel) }}</span>
              </td>
              <td
                v-if="i === 0"
                class="table-cell target-column"
                :class="{
                  'grouped-cell': group.items.length > 1,
                  unavailable: !item.mapId || item.mapId.length === 0,
                  highlighted: hoveredGroupIndex === groupIndex,
                }"
                :rowspan="group.items.length"
                @mouseenter="onTargetHover(groupIndex, item, $event)"
                @mouseleave="onSourceLeave(item)"
              >
                <div class="target-content">
                  <template v-if="item.mapId && item.mapId.length > 0">
                    <span class="term-label">{{ capitalise(item.mapLabel) }}</span>
                    <el-popover
                      width="150"
                      trigger="hover"
                      :teleported="true"
                      :append-to="connectivityListContainer"
                      popper-class="popover-origin-help"
                    >
                      <template #reference>
                        <el-icon
                          class="status-search-icon"
                          @click="$emit('connectivity-clicked', item.mapLabel)"
                        >
                          <el-icon-search />
                        </el-icon>
                      </template>
                      <span>Search connectivity</span>
                    </el-popover>
                  </template>
                </div>
              </td>
            </template>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script>
import { Search as ElIconSearch } from '@element-plus/icons-vue';
import { capitalise } from '../utilities';

export default {
  name: 'ReconciliationTable',
  components: {
    ElIconSearch,
  },
  props: {
    groups: {
      type: Array,
      default: () => [],
    },
    tableKey: {
      type: String,
      default: 'reconciliation',
    },
    connectivityListContainer: {
      type: HTMLElement,
      default: null,
    },
  },
  emits: ['row-hovered', 'connectivity-clicked'],
  data() {
    return {
      hoveredGroupIndex: null,
    };
  },
  methods: {
    capitalise: function (text) {
      return capitalise(text);
    },
    isDirectMatch: function (group, item) {
      // Direct match only when:
      // 1. Single item (not grouped)
      // 2. Both IDs exist and match exactly
      if (group.items.length !== 1) return false;
      if (!item.sckanId || !item.mapId) return false;
      return this.isMatch(item);
    },
    isMatch: function (item) {
      return JSON.stringify(item.sckanId) === JSON.stringify(item.mapId);
    },
    onTargetHover(groupIndex, item, event) {
      this.hoveredGroupIndex = groupIndex;
      this.$emit('row-hovered', item, event, true);
    },
    onSourceHover(groupIndex, item, event) {
      this.hoveredGroupIndex = groupIndex;
      this.$emit('row-hovered', item, event, false);
    },
    onSourceLeave(_item) {
      this.hoveredGroupIndex = null;
      this.$emit('row-hovered');
    },
  },
};
</script>

<style lang="scss" scoped>
.reconciliation-table {
  overflow: hidden;
  font-size: 14px;
  font-family: $font-family;
}

.reconciliation-table-inner {
  width: 100%;
  padding: 0;
  border: 0 none;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;

  td {
    padding: 0.5rem;
    vertical-align: middle;
  }

  tbody td {
    border-top: 2px solid #f7faff;
    border-bottom: 2px solid #f7faff;
  }

  tbody tr:first-child td {
    border-top-width: 4px;
  }

  .source-column,
  .target-column {
    width: 50%;
    text-align: left;
  }
}

.table-cell {
  &.source-column,
  &.target-column,
  &.direct-match-cell {
    position: relative;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      transition:
        background-color 0.2s ease,
        border-color 0.2s ease;
    }
  }

  // Direct match merged cell styling (one-to-one exact match)
  &.direct-match-cell {
    &::before {
      background-color: rgba($app-primary-color, 0.04);
      border-left: 4px solid rgba($app-primary-color, 0.16);
    }

    &:hover::before {
      background-color: rgba($app-primary-color, 0.07);
      border-left-color: rgba($app-primary-color, 0.24);
    }
  }

  // Source column - mapped items use same style as target available style
  &.source-column.mapped {
    &::before {
      background-color: #e6ffed;
      border-left: 4px solid #aceebb;
    }

    &:hover::before {
      background-color: #d9ffe0;
      border-left-color: #7fe09c;
    }
  }

  // Source column - non-mapped items
  &.source-column:not(.mapped) {
    &::before {
      background-color: #ffebe9;
      border-left: 4px solid #ffcecb;
    }

    &:hover::before {
      background-color: #ffe5e3;
      border-left-color: #ffb7b4;
    }
  }

  // Source column - highlighted when its group's unavailable target is hovered
  &.source-column.highlighted-by-target {
    &::before {
      background-color: #ffe5e3;
      border-left-color: #ffb7b4;
    }
  }

  // Target column - unavailable items
  &.target-column.unavailable {
    &::before {
      background-color: #ffebe9;
    }

    &:hover::before {
      background-color: #ffe5e3;
    }

    .target-content {
      justify-content: flex-end;
    }
  }

  // Target column - available but not direct match
  &.target-column:not(.unavailable) {
    &::before {
      background-color: #e6ffed;
      border-left: 4px solid #aceebb;
    }

    &:hover::before,
    &.highlighted::before {
      background-color: #d9ffe0;
      border-left-color: #7fe09c;
    }
  }

  // Target column - unavailable items when highlighted
  &.target-column.unavailable.highlighted {
    &::before {
      background-color: #ffe5e3;
      border-left-color: #ffb7b4;
    }
  }

  &.grouped-cell {
    vertical-align: middle;
  }
}

.term-label {
  font-weight: 500;
  transition: color 0.2s ease;
  word-break: break-word;
  position: relative;
}

.target-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  position: relative;
}

.status-search-icon {
  font-size: 16px;
  color: $app-primary-color;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;

  &:hover {
    color: #ac76c5;
  }
}

.table-row:hover .status-search-icon,
.target-column.highlighted .status-search-icon {
  opacity: 1;
}
</style>
