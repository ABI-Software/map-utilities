<template>
  <el-container class="create-container">
    <el-header height="30px" class="header">
      <div>{{ dialogTitle }}</div>
    </el-header>
    <el-main class="slides-block">
      <span class="create-text" v-if="creating && targetRegion">
        {{ `Primitives will be created in the ${targetRegion} region` }}
      </span>
      <el-row class="row" v-show="showPoint">
        <el-col :offset="0" :span="8">Position:</el-col>
        <el-col :offset="0" :span="16">
          <el-row v-for="{ i } in createData.points" :key="i" class="value">
            {{ i }}
          </el-row>
        </el-col>
      </el-row>
      <el-row class="row">
        <el-col :offset="0" :span="8">Region:</el-col>
        <el-col :offset="0" :span="16">
          <el-autocomplete
            class="autocomplete-box"
            :fit-input-width="true"
            v-model="region"
            :placeholder="targetRegion"
            :fetch-suggestions="fetchRegionSuggestions"
            :teleported="true"
            popper-class="autocomplete-popper"
          >
            <template #default="{ item }">
              <div class="suggested-value">
                {{ item.value }}
              </div>
            </template>
          </el-autocomplete>
        </el-col>
      </el-row>
      <el-row class="row">
        <el-col :offset="0" :span="8">Group:</el-col>
        <el-col :offset="0" :span="16">
          <el-autocomplete
            class="autocomplete-box"
            :disabled="createData.editingIndex > -1 || createData.toBeDeleted"
            :fit-input-width="true"
            v-model="group"
            :placeholder="createData.shape"
            :fetch-suggestions="fetchGroupSuggestions"
            :teleported="true"
            popper-class="autocomplete-popper"
          >
            <template #default="{ item }">
              <div class="suggested-value">
                {{ item.value }}
              </div>
            </template>
          </el-autocomplete>
        </el-col>
      </el-row>
      <el-row v-if="!canBeConfirmed" class="row">
        <div class="warning-message">Group must be enterd before this action can be confirmed.</div>
      </el-row>
      <el-row>
        <el-col :offset="0" :span="12">
          <el-button type="primary" plain @click="confirm" :disabled="!canBeConfirmed">
            {{ confirmText }}
          </el-button>
        </el-col>
        <el-col :offset="0" :span="12">
          <el-button type="primary" plain @click="cancel">Cancel</el-button>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script>
export default {
  name: 'CreateTooltipContent',
  props: {
    createData: {
      type: Object,
      default: () => ({
        drawingBox: false,
        renaming: false,
        toBeConfirmed: false,
        points: [],
        tempGroupName: undefined,
        shape: '',
        x: 0,
        y: 0,
        editingIndex: -1,
        faceIndex: -1,
        toBeDeleted: false,
        regionPrefix: '__annotation',
      }),
    },
  },
  watch: {
    'createData.shape': {
      handler: function (newValue, oldValue) {
        this.group = this.createData.tempGroupName ? this.createData.tempGroupName : '';
        if (oldValue !== undefined) {
          this.$emit('cancel-create');
        }
      },
      immediate: true,
    },
    'createData.tempGroupName': {
      handler: function (newValue) {
        this.group = newValue ? newValue : '';
      },
      immediate: true,
    },
  },
  computed: {
    canBeConfirmed: function () {
      if (!this.createData.toBeDeleted && this.createData.editingIndex > -1) {
        return true;
      } else if (this.group) {
        if (!this.createData.renaming) {
          return true;
        } else if (this.group !== this.createData.tempGroupName) {
          return true;
        }
      }
      return false;
    },
    confirmText: function () {
      if (!this.createData.toBeDeleted && this.createData.editingIndex > -1) {
        return 'Edit';
      } else if (this.createData.renaming) {
        return 'Rename';
      } else if (this.createData.toBeDeleted) {
        return 'Delete';
      }
      return 'Confirm';
    },
    creating: function () {
      if (
        this.createData.editingIndex > -1 ||
        this.createData.renaming ||
        this.createData.toBeDeleted
      ) {
        return false;
      }
      return true;
    },
    dialogTitle: function () {
      const mode = this.confirmText;
      if (this.createData.toBeDeleted || this.createData.renaming) {
        return mode;
      }
      return `${mode} ${this.createData.shape}`;
    },
    targetRegion: function () {
      if ('regionPrefix' in this.createData) {
        return this.createData.regionPrefix;
      }
      return '';
    },
  },
  data: function () {
    return {
      group: 'default',
      region: '',
      showPoint: false,
    };
  },
  methods: {
    confirm: function () {
      this.$emit('confirm-create', {
        region: this.targetRegion + this.region,
        group: this.group,
        shape: this.createData.shape,
        editingIndex: this.createData.editingIndex,
        renaming: this.createData.renaming,
        deleting: this.createData.toBeDeleted,
      });
      this.group = this.createData.shape;
    },
    cancel: function () {
      this.$emit('cancel-create');
    },
    fetchRegionSuggestions: function (term, cb) {
      cb([]);
      this.$emit('create-region-suggestions', { term, cb });
    },
    fetchGroupSuggestions: function (term, cb) {
      cb([]);
      this.$emit('create-group-suggestions', { term, cb, region: this.region });
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.header {
  color: #606266;
  line-height: 1;
  padding: 8px 17px 1px 15px;
  border-bottom: 1px solid #ebeef5;
  font-size: 14px;
}

:deep(.create-text) {
  max-width: 220px;
  height: 35px;
  font-size: 12px;
}

.row {
  margin: 4px;
  text-align: left;
}

.create-container {
  width: 320px;
  font-family: $font-family;
  height: auto;
  border-radius: 4px;
  border: solid 1px #d8dce6;
  background-color: #fff;
  overflow-y: none;
  user-select: auto;
  pointer-events: auto;
}

:deep(.autocomplete-box) {
  position: relative;
  font-size: 12px;
  display: inline-flex;
  width: var(--el-input-width);
  line-height: var(--el-input-height);
  box-sizing: border-box;
  vertical-align: middle;
  .el-input__inner {
    height: 24px;
  }
}

.autocomplete-popper {
  li {
    line-height: normal;
    padding: 7px;

    .suggested-value {
      font-family: $font-family;
      text-align: left;
      white-space: initial;
    }

    .el-input__inner {
      font-size: 12px;
    }
  }
}

.warning-message {
  font-size: 10px;
  color: #ff8400;
}

.value {
  font-size: 12px;
}
</style>
