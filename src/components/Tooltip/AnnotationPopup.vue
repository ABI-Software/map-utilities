<template>
  <el-main class="main">
    <div class="block">
      <el-row class="info-field">
        <div class="title">Feature Annotations</div>
        <div class="title-buttons">
          <copy-to-clipboard :content="updatedCopyContent" />
        </div>
      </el-row>
      <template v-if="annotationEntry">
        <el-row
          v-for="(key, label) in displayPair"
          v-show="annotationEntry[key]"
          class="dialog-text"
          :key="key"
        >
          <strong>{{ label }}: </strong>&nbsp;
          <span v-if="label !== 'Ontology'">{{ annotationEntry[key] }}</span>
          <a v-else :href="ontologyLink" target="_blank">{{ annotationEntry[key] }}</a>
        </el-row>
        <template v-if="prevSubs.length > 0">
          <div
            v-show="showSubmissions"
            class="hide"
            @click="showSubmissions = false"
          >
            Hide previous submissions
            <el-icon><el-icon-arrow-up /></el-icon>
          </div>
          <div
            v-show="!showSubmissions"
            class="hide"
            @click="showSubmissions = true"
          >
            Show previous {{ prevSubs.length }} submission(s)
            <el-icon><el-icon-arrow-down /></el-icon>
          </div>
          <template v-if="showSubmissions">
            <el-row class="dialog-spacer"></el-row>
            <el-row class="dialog-text">
              <strong class="sub-title">Previous submissions:</strong>
            </el-row>
            <div class="entry" v-for="(sub, index) in prevSubs" :key="index">
              <el-row class="dialog-text">
                <strong>{{ formatTime(sub.created) }}</strong>
                {{ sub.creator.name }}
              </el-row>
              <el-row class="dialog-text">
                <strong>Evidence: </strong>
                <el-row
                  v-for="(evidence, index) in sub.body.evidence"
                  :key="evidence"
                  class="dialog-text"
                > 
                  <a v-if="typeof evidence === 'object' ":href="Object.values(evidence)[0]" target="_blank"> 
                    {{ Object.keys(evidence)[0] }}
                  </a>
                  <span v-else> {{ evidence }}</span>
                  <span v-if="index !== sub.body.evidence.length - 1">, </span>
                </el-row>
              </el-row>
              <el-row class="dialog-text">
                <strong>Comment: </strong> {{ sub.body.comment }}
              </el-row>
            </div>
          </template>
        </template>
        <template v-if="authenticated">
          <template v-if="isEditable">
            <el-row class="dialog-spacer"></el-row>
            <el-row v-if="!editing">
              <el-icon class="standard-icon">
                <el-icon-edit @click="editing = true" />
              </el-icon>
              <el-icon class="standard-icon" v-if="isDeleted">
                <el-icon-delete @click="submit" />
              </el-icon>
              <el-icon class="standard-icon" v-else-if="isPositionUpdated">
                <el-icon-finished @click="submit" />
              </el-icon>
            </el-row>
            <template v-else>
              <el-row class="dialog-text">
                <strong class="sub-title">Suggest changes:</strong>
              </el-row>
              <template v-if="!isDeleted">
                <el-row class="dialog-text">
                  <strong>Evidence:</strong>
                </el-row>
                <el-row v-for="(value, index) in evidence" :key="value">
                  <el-col :span="20">
                    {{ evidence[index] }}
                  </el-col>
                  <el-col :span="4">
                    <el-icon class="standard-icon">
                      <el-icon-close @click="removeEvidence(index)" />
                    </el-icon>
                  </el-col>
                </el-row>
                <el-row>
                  <el-input
                    size="small"
                    placeholder="Enter"
                    v-model="newEvidence"
                    @change="evidenceEntered($event)"
                  >
                    <template #prepend>
                      <el-select
                        :teleported="false"
                        v-model="evidencePrefix"
                        placeholder="Other:"
                        class="select-box"
                        popper-class="flatmap_dropdown"
                      >
                        <el-option
                          v-for="item in evidencePrefixes"
                          :key="item.label"
                          :value="item.value"
                        >
                          <el-row>
                            <el-col :span="12">{{ item.label }}</el-col>
                          </el-row>
                        </el-option>
                      </el-select>
                    </template>
                  </el-input>
                </el-row>
              </template>
              <el-row>
                <strong>Comment:</strong>
              </el-row>
              <el-row class="dialog-text">
                <el-input
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 4 }"
                  placeholder="Enter"
                  v-model="comment"
                />
              </el-row>
              <el-row class="dialog-text">
                <el-button class="button" type="primary" plain @click="submit">
                  Submit
                </el-button>
              </el-row>
            </template>
            <el-row class="dialog-text" v-if="errorMessage">
              <strong class="sub-title"> {{ errorMessage }} </strong>
            </el-row>
          </template>
        </template>
      </template>
    </div>
  </el-main>
</template>

<script>
export default {
  name: "AnnotationPopup",
  props: {
    annotationEntry: {
      type: Object,
    },
  },
  inject: ["$annotator", "userApiKey"],
  data: function () {
    return {
      displayPair: {
        "Feature ID": "featureId",
        Label: "label",
        Ontology: "models",
        Name: "name",
        Resource: "resourceId",
      },
      editing: false,
      evidencePrefixes: [
        { value: "DOI:", label: "DOI:" },
        { value: "PMID:", label: "PMID:" },
        { value: "", label: "Other:" },
      ],
      evidencePrefix: "DOI:",
      evidence: [],
      authenticated: false,
      newEvidence: "",
      comment: "",
      prevSubs: [],
      showSubmissions: true,
      errorMessage: "",
      creator: undefined,
      copyContent: '',
    };
  },
  computed: {
    isEditable: function () {
      return (
        this.annotationEntry["resourceId"] && this.annotationEntry["featureId"]
      );
    },
    isPositionUpdated: function () {
      return (
        this.annotationEntry["resourceId"] &&
        this.annotationEntry["type"] === "updated" &&
        this.annotationEntry["positionUpdated"]
      );
    },
    isDeleted: function () {
      return (
        this.annotationEntry["resourceId"] &&
        this.annotationEntry["type"] === "deleted"
      );
    },
    ontologyLink: function () {
      const models = this.annotationEntry['models'];
      if (models && models.startsWith("UBERON")) {
        return `http://purl.obolibrary.org/obo/${this.annotationEntry.models.replace(":", "_")}`;
      }
    },
    updatedCopyContent: function () {
      return this.getUpdateCopyContent();
    },
  },
  methods: {
    evidenceEntered: function (value) {
      if (value) {
        this.evidence.push(this.evidencePrefix + value);
        this.newEvidence = "";
      }
    },
    formatTime: function (dateString) {
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      };
      return new Date(dateString).toLocaleDateString(undefined, options);
    },
    updatePrevSubmissions: function () {
      if (this.$annotator && this.authenticated) {
        if (
          this.annotationEntry["resourceId"] &&
          this.annotationEntry["featureId"]
        ) {
          this.$annotator
            ?.itemAnnotations(
              this.userApiKey,
              this.annotationEntry["resourceId"],
              this.annotationEntry["featureId"]
            )
            .then((value) => {
              this.prevSubs = value;
            })
            .catch((reason) => {
              console.log(reason); // Error!
            });
        }
      }
    },
    submit: function () {
      // User can either update/delete annotation directly
      // or provide extra comments for update/delete action
      if (
        this.annotationEntry["type"] === "updated" &&
        this.annotationEntry["positionUpdated"]
      ) {
        this.comment = this.comment
          ? `Position Updated: ${this.comment}`
          : "Position Updated";
      } else if (this.annotationEntry["type"] === "deleted") {
        this.comment = this.comment
          ? `Feature Deleted: ${this.comment}`
          : "Feature Deleted";
      }

      if (this.evidence.length > 0 || this.comment) {
        if (
          this.annotationEntry["resourceId"] &&
          this.annotationEntry["featureId"]
        ) {
          const evidenceURLs = [];
          this.evidence.forEach((evi) => {
            let eviObject = {}
            if (evi.includes("DOI:")) {
              eviObject[evi] = evi.replace("DOI:", "https://doi.org/");
            } else if (evi.includes("PMID:")) {
              eviObject[evi] = evi.replace(
                "PMID:",
                "https://pubmed.ncbi.nlm.nih.gov/"
              );
            }
            if (evi in eviObject) {
              evidenceURLs.push(eviObject);
            } else {
              evidenceURLs.push(evi);
            }
          });
          const userAnnotation = {
            resource: this.annotationEntry["resourceId"],
            item: Object.assign(
              { id: this.annotationEntry["featureId"] },
              Object.fromEntries(
                Object.entries(this.annotationEntry).filter(([key]) =>
                  ["label", "models"].includes(key)
                )
              )
            ),
            body: {
              evidence: evidenceURLs,
              comment: this.comment,
            },
            feature: this.annotationEntry["feature"],
          };
          Object.assign(userAnnotation.body, this.annotationEntry["body"]);
          if (this.annotationEntry["type"] === "deleted") {
            userAnnotation.feature = undefined;
          }
          if (this.creator) userAnnotation.creator = this.creator;
          this.$annotator
            ?.addAnnotation(this.userApiKey, userAnnotation)
            .then(() => {
              this.$emit("annotation", userAnnotation);
              this.errorMessage = "";
              this.resetSubmission();
              this.updatePrevSubmissions();
            })
            .catch(() => {
              this.errorMessage =
                "There is a problem with the submission, please try again later";
            });
        }
      }
    },
    removeEvidence: function (index) {
      this.evidence.splice(index, 1);
    },
    resetSubmission: function () {
      this.editing = false;
      this.evidence = [];
      this.newFeature = "";
      this.comment = "";
    },
    getUpdateCopyContent: function () {
      if (!this.annotationEntry) {
        return '';
      }

      const contentArray = [];

      // featureId
      if (this.annotationEntry.featureId) {
        contentArray.push(`<div><strong>Feature ID:</strong>${this.annotationEntry.featureId}</div>`);
      }

      // label
      if (this.annotationEntry.label) {
        contentArray.push(`<div><strong>Label:</strong>${this.annotationEntry.label}</div>`);
      }

      // models
      if (this.annotationEntry.models) {
        contentArray.push(`<div><strong>Ontology:</strong>${this.annotationEntry.models}</div>`);
        if (this.ontologyLink) {
          contentArray.push(`<div><strong>Ontology Link:</strong>${this.ontologyLink}</div>`);
        }
      }

      // resourceId
      if (this.annotationEntry.resourceId) {
        contentArray.push(`<div><strong>Resource:</strong>${this.annotationEntry.resourceId}</div>`);
      }

      if (this.prevSubs.length) {
        let annotationContent = '<div><strong>Annotations:</strong></div>\n<br>';
        this.prevSubs.map((sub, index) => {
          annotationContent += `<div><strong>Created:</strong>${this.formatTime(sub.created)}</div>\n<br>`;
          annotationContent += `<div><strong>Creator:</strong>${sub.creator.name}</div>\n<br>`;
          annotationContent += `<div><strong>Email:</strong>${sub.creator.email}</div>\n<br>`;
          if (sub.body.evidence.length) {
            let evidenceContent = '';
            sub.body.evidence.forEach((evi, index) => {
              evidenceContent += `${typeof evi === 'object' ? Object.values(evi)[0] : evi}`;
              if (index !== sub.body.evidence.length - 1) evidenceContent += ', ';
            })
            annotationContent += `<div><strong>Evidence:</strong>${evidenceContent}</div>\n<br>`;
          }
          annotationContent += `<div><strong>Comment:</strong>${sub.body.comment}</div>\n<br>`;
        })
        contentArray.push(`<div>${annotationContent}</div>`);
      }

      return contentArray.join('\n\n<br>');
    },
  },
  watch: {
    annotationEntry: {
      handler: function (newVal, oldVal) {
        if (newVal !== oldVal) {
          this.resetSubmission();
          this.updatePrevSubmissions();
        }
      },
      immediate: false,
      deep: false,
    },
  },
  mounted: function () {
    this.$annotator?.authenticate(this.userApiKey).then((userData) => {
      if (userData.name && userData.email && userData.canUpdate) {
        this.creator = userData;
        if (!userData.orcid) this.creator.orcid = "0000-0000-0000-0000";
        this.authenticated = true;
        this.updatePrevSubmissions();
      } else {
        this.errorMessage = "";
      }
    });
  },
};
</script>

<style lang="scss" scoped>
.info-field {
  padding: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 1rem;
}

.block {
  margin-bottom: 0.5em;

  .main > &:first-of-type {
    margin-right: 0.5em;
  }
}

.button {
  padding-top: 5px;
  padding-bottom: 5px;
}

.standard-icon {
  color: $app-primary-color;
  &:hover {
    cursor: pointer;
  }
}

.dialog-text {
  color: rgb(48, 49, 51);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
}

.main {
  font-size: 14px;
  text-align: left;
  line-height: 1.5em;
  font-family: Asap, sans-serif, Helvetica;
  font-weight: 400;
  /* outline: thin red solid; */
  padding: 1em !important;
  overflow-x: hidden;
  overflow-y: auto;
  min-width: 300px; // .maplibregl-popup max-width
  max-height: 400px;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    box-shadow: inset 0 0 6px #c0c4cc;
  }
}

.title {
  font-size: 18px;
  font-weight: 500;
  font-weight: bold;
  padding-bottom: 8px;
  color: $app-primary-color;
}

.title-buttons {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;

  :deep(.copy-clipboard-button) {
    &,
    &:hover,
    &:focus {
      border-color: $app-primary-color !important;
      border-radius: 50%;
    }
  }
}

.sub-title {
  font-size: 16px;
}

.dialog-spacer {
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 10px;
}

.submit {
  color: $app-primary-color;
  &:hover {
    cursor: pointer;
  }
}

.entry ~ .entry {
  border-top: 1px solid #e4e7ed;
  margin-top: 10px;
}

.hide {
  color: $app-primary-color;
  cursor: pointer;
  margin-right: 6px;
  margin-top: 3px;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  font-family: Asap, sans-serif;
}

.select-box {
  width: 80px;
  background-color: var(--white);
  font-weight: 500;
  color: rgb(48, 49, 51);
  :deep(.el-input__inner) {
    height: 30px;
    color: rgb(48, 49, 51);
  }
  :deep(.el-input__icon) {
    line-height: 30px;
  }
}

:deep(.flatmap_dropdown) {
  min-width: 80px !important;
  .el-select-dropdown__item {
    white-space: nowrap;
    text-align: left;
    &.selected {
      color: $app-primary-color;
      font-weight: normal;
    }
  }
}
</style>
