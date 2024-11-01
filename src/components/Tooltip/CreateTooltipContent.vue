<template>
  <el-container class="create-container">
    <el-header height="30px" class="header">
      <div>Create {{ createData.shape }}</div>
    </el-header>
    <el-main class="slides-block">
      <span class="create-text">
        Primitives will be created in the __annotation region
      </span>
      <el-row class="row" v-show="showPoint">
        <el-col :offset="0" :span="8">
          Position:
        </el-col>
        <el-col :offset="0" :span="16">
          <el-row v-for="{ value, i } in createData.points" :key="i" class="value">
            {{ i }}
          </el-row>
        </el-col>
      </el-row>
      <el-row class="row">
        <el-col :offset="0" :span="8">
          Region:
        </el-col>
        <el-col :offset="0" :span="16">
          <el-input
            v-model="region"
            placeholder="__annotation"
            size="small"
          />
        </el-col>
      </el-row>
      <el-row class="row">
        <el-col :offset="0" :span="8">
          Group:
        </el-col>
        <el-col :offset="0" :span="16">
          <el-input
            v-model="group"
            :placeholder="createData.shape"
            size="small"
          />
        </el-col>
      </el-row>
      <el-row>
        <el-col :offset="0" :span="12">
          <el-button
            type="primary"
            plain
            @click="confirm"
          >
            {{ confirmText }}
          </el-button>
        </el-col>
        <el-col :offset="0" :span="12">
          <el-button
            type="primary"
            plain
            @click="cancel"
          >
            Cancel
          </el-button>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script>
/* eslint-disable no-alert, no-console */

import {
  ElButton as Button,
  ElCol as Col,
  ElContainer as Container,
  ElHeader as Header,
  ElInput as Input,
  ElMain as Main,

} from "element-plus";

/**
 * A component to control the opacity of the target object.
 */
export default {
  name: "CreateTooltipContent",
  components: {
    Button,
    Col,
    Container,
    Header,
    Input,
    Main,
  },
  props: {
    createData: {
      type: Object,
    },
  },
  watch: {
    "createData.shape": {
      handler: function (newValue, oldValue) {
        this.group = newValue;
        if (oldValue !== undefined) {
          this.$emit("cancel-create");
        }
      },
      immediate: true,
    },
  },
  computed: {
    confirmText: function () {
      if (this.createData.editingIndex > -1) {
        return "Edit";
      }
      return "Confirm";
    },
  },
  data: function () {
    return {
      group: "default",
      region: "",
      showPoint: false,
    }
  },
  methods: {
    confirm: function () {
      this.$emit(
        "confirm-create", 
        { 
          region: "__annotation/" + this.region, 
          group: this.group,
          shape: this.createData.shape,
          editingIndex: this.createData.editingIndex,
        }
      );
      this.group = this.createData.shape;
    },
    cancel: function () {
      this.$emit("cancel-create");
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

.row {
  margin: 4px;
  text-align: left;
}

:deep(.create-text) {
  max-width: 220px;
  height:35px;
  font-size: 12px;
}


.create-container {
  width: 100%;
  height: auto;
  border-radius: 4px;
  border: solid 1px #d8dce6;
  background-color: #fff;
  overflow-y: none;
  user-select: auto;
  pointer-events: auto;
}

.value {
  font-size: 12px;
}

.input-box {
  width: 42px;
  border-radius: 4px;
  border: 1px solid rgb(144, 147, 153);
  background-color: var(--white);
  font-weight: 500;
  color: rgb(48, 49, 51);
  margin-left: 8px;
  height: 24px;

  &.number-input {
    width: 42px;
    :deep(.el-input__wrapper) {
      padding-left: 0px;
      padding-right: 0px;
    }
  }
}

</style>
