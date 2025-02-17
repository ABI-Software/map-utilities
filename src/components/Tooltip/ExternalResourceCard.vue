<template>
  <div class="resource-container">
    <div class="attribute-title-container">
      <div class="attribute-title">References</div>
      <div class="copy-button">
        <CopyToClipboard label="Copy list to clipboard" :content="referecesListContent" />
      </div>
    </div>
    <div class="citation-tabs" v-if="useDOIFormatter ? referencesWithDOI : pubMedReferences.length">
      <el-button
        link
        v-for="citationOption of citationOptions"
        :key="citationOption.value"
        :type="citationType === citationOption.value ? 'primary' : ''"
        @click="onCitationFormatChange(citationOption.value)"
      >
        {{ citationOption.label }}
      </el-button>
    </div>
    <ul class="citation-list">
      <li
        v-for="reference of pubMedReferences"
        :key="reference.id"
        :class="{
          'loading': reference.citation && !reference.citation.error && reference.citation[citationType] === '',
          'error': reference.citation && reference.citation.error
        }"
      >
        <template v-if="reference.citation">

          <!-- DOI Server Error -->
          <template v-if="reference.citation.error?.ref === 'doi' && reference.citation.error?.type === citationType">
            <span>Internal Server Error</span><br />
            Sorry, something went wrong.<br />
            The dataset citation generator (<a
              :href="crosscite_host"
              target="_blank"
            >{{ crosscite_host }}</a>) encountered an internal error and was unable to complete your
            request.<br />
            Please come back later.
          </template>

          <!-- PubMed Server Error -->
          <template v-else-if="reference.citation.error?.ref === 'pubmed' && reference.citation.error?.type === citationType">
            <span>Sorry, something went wrong.</span><br />
            Please try again.
            <span class="reload-button" @click="reloadCitation(reference)">Reload</span>
          </template>

          <template v-else>
            <span v-html="reference.citation[citationType]"></span>

            <div class="reference-button-container">
              <el-button
                class="reference-icon-button"
                size="small"
                @click="showRelatedConnectivities(reference.resource)"
              >
                Show related connectivities
              </el-button>
            </div>

            <CopyToClipboard :content="reference.citation[citationType]" />
          </template>
        </template>
      </li>

      <li v-for="reference of openLibReferences">
        <div v-html="formatCopyReference(reference)"></div>

        <div class="reference-button-container">
          <el-button
            class="reference-icon-button"
            size="small"
            @click="showRelatedConnectivities(reference.resource)"
          >
            Show related connectivities
          </el-button>
        </div>

        <CopyToClipboard :content="formatCopyReference(reference)" />
      </li>

      <li v-for="reference of isbnDBReferences">
        <a :href="reference.url" target="_blank">{{ reference.url }}</a>

        <div class="reference-button-container">
          <el-button
            class="reference-icon-button"
            size="small"
            @click="showRelatedConnectivities(reference.resource)"
          >
            Show related connectivities
          </el-button>
        </div>

        <CopyToClipboard :content="reference.url" />
      </li>
    </ul>
  </div>
</template>

<script>
import CopyToClipboard from '../CopyToClipboard/CopyToClipboard.vue';
import { delay, getCitationById } from '../utilities';

const CROSSCITE_API_HOST = 'https://citation.doi.org';
const CITATION_OPTIONS = [
  {
    label: 'APA',
    value: 'apa',
  },
  {
    label: 'Chicago',
    value: 'chicago-note-bibliography',
  },
  {
    label: 'IEEE',
    value: 'ieee',
  },
  {
    label: 'Bibtex',
    value: 'bibtex',
  },
];
const CITATION_DEFAULT = 'apa';
const LOADING_DELAY = 600;

export default {
  name: "ExternalResourceCard",
  components: {
    CopyToClipboard,
  },
  props: {
    resources: {
      type: Array,
      default: () => [],
    },
    useDOIFormatter: {
      type: Boolean,
      default: true,
    }
  },
  data: function () {
    return {
      pubMedReferences: [],
      openLibReferences: [],
      isbnDBReferences: [],
      referecesListContent: '',
      citationOptions: CITATION_OPTIONS,
      citationType: CITATION_DEFAULT,
      crosscite_host: CROSSCITE_API_HOST,
    }
  },
  watch: {
    resources: function (_resources) {
      this.formatReferences([..._resources]);
      this.getCitationText(CITATION_DEFAULT);
    },
  },
  computed: {
    referencesWithDOI: function () {
      const withDOI = this.pubMedReferences.filter((reference) => reference.type === 'doi' || reference.doi);
      return withDOI.length;
    },
  },
  mounted: function () {
    this.formatReferences([...this.resources]);
    this.getCitationText(CITATION_DEFAULT);
  },
  methods: {
    showRelatedConnectivities: function (resource) {
      this.$emit('show-reference-connectivities', resource);
    },
    formatReferences: function (references) {
      const nonPubMedReferences = this.extractNonPubMedReferences(references);
      const pubMedReferences = references.filter((reference) => !nonPubMedReferences.includes(reference));

      this.pubMedReferences = pubMedReferences.map((reference) =>
        (typeof reference === 'object') ?
        this.extractPublicationIdFromURLString(reference[0]) :
        this.extractPublicationIdFromURLString(reference)
      );

      // pmc to pmid
      this.pubMedReferences.forEach((reference) => {
        if (reference.type === 'pmc') {
          const pmcId = reference.id;
          this.searchPMID(pmcId).then((data) => {
            if (data && data.esearchresult) {
              const idList = data.esearchresult.idlist || [];
              reference.id = idList[0];
              reference.type = 'pmid';
            }
          });
        }
      });

      this.formatNonPubMedReferences(nonPubMedReferences).then((responses) => {
        this.openLibReferences = responses.filter((response) => response.type === 'openlib');
        this.isbnDBReferences = responses.filter((response) => response.type === 'isbndb');

        this.formatOpenLibReferences();
      });
    },
    extractNonPubMedReferences: function (references) {
      const extractedReferences = [];
      const pubmedDomains = this.getPubMedDomains();

      references.forEach((reference) => {
        let count = 0;
        pubmedDomains.forEach((name) => {
          if (reference.includes(name)) {
            count++;
          }
        });
        if (!count) {
          extractedReferences.push(reference);
        }
      });

      return extractedReferences;
    },
    formatNonPubMedReferences: async function (references) {
      const transformedReferences = [];
      const filteredReferences = references.filter((referenceURL) => referenceURL.indexOf('isbn') !== -1);

      const isbnIDs = filteredReferences.map((url) => {
        const isbnId = url.split('/').pop();
        return 'ISBN:' + isbnId;
      });
      const isbnIDsKey = isbnIDs.join(',');
      const failedIDs = isbnIDs.slice();

      const getOriginalURL = (id) => {
        return filteredReferences.find((url) => url.includes(id));
      };

      const openlibAPI = `https://openlibrary.org/api/books?bibkeys=${isbnIDsKey}&format=json`;
      const data = await this.fetchData(openlibAPI);

      for (const key in data) {
        const successKeyIndex = failedIDs.indexOf(key);
        failedIDs.splice(successKeyIndex, 1);

        const url = data[key].info_url;
        const urlSegments = url.split('/');
        const endpointIndex = urlSegments.indexOf('books');
        const bookId = urlSegments[endpointIndex + 1];
        const id = key.split(':')[1]; // Key => "ISBN:1234"
        const resource = getOriginalURL(id);

        transformedReferences.push({
          id: id,
          type: 'openlib',
          url: url,
          bookId: bookId,
          resource: resource,
        });
      }

      failedIDs.forEach((failedID) => {
        const id = failedID.split(':')[1];
        // Data does not exist in OpenLibrary
        // Provide ISBNDB link for reference
        const url = `https://isbndb.com/book/${id}`;
        const resource = getOriginalURL(id);

        transformedReferences.push({
          id: id,
          url: url,
          type: 'isbndb',
          resource: resource,
        });
      });

      return transformedReferences;
    },
    extractPublicationIdFromURLString: function (urlStr) {
      if (!urlStr) return

      const str = decodeURIComponent(urlStr)

      let term = {id: '', type: '', citation: {}, resource: urlStr}

      const names = this.getPubMedDomains()

      names.forEach((name) => {
        const lastIndex = str.lastIndexOf(name)
        if (lastIndex !== -1) {
          term.id = str.slice(lastIndex + name.length)
          if (name === 'doi.org/') {
            term.type = "doi"
          } else if (name === 'pmc/articles/') {
            term.type = "pmc"
          } else {
            term.type = "pmid"
          }
        }
      })

      //Backward compatability with doi: and PMID:
      if (term.id === '') {
        if (urlStr.includes("doi:")) {
          term.id = this.stripPMIDPrefix(urlStr)
          term.type = "doi"
        } else if (urlStr.includes("PMID:")) {
          term.id = this.stripPMIDPrefix(urlStr)
          term.type = "pmid"
        }
      }

      if (term.id.endsWith('/')) {
        term.id = term.id.slice(0, -1)
      }

      return term
    },
    getPubMedDomains: function () {
      const names = [
        'doi.org/',
        'nih.gov/pubmed/',
        'pmc/articles/',
        'pubmed.ncbi.nlm.nih.gov/',
      ]

      return names;
    },
    stripPMIDPrefix: function (pubmedId) {
      return pubmedId.split(':')[1]
    },
    onCitationFormatChange: function(citationType) {
      this.citationType = citationType;
      this.getCitationText(citationType);
    },
    generateCitationText: function (reference, citationType) {
      const { id, type, doi } = reference;

      if (
        !(reference.citation && reference.citation[citationType])
        && id
      ) {
        reference.citation[citationType] = ''; // loading
        reference.citation['error'] = null; // clear errors

        if (type === 'doi' || doi) {
          const doiID = type === 'doi' ? id : doi;
          const fetchCitationFromAPI = this.useDOIFormatter ?
            this.getCitationTextByDOI(doiID) :
            getCitationById(doiID, {
              type: 'doi',
              format: citationType
            });

          fetchCitationFromAPI.then((text) => {
            const formattedText = this.replaceLinkInText(text);
            reference.citation[citationType] = formattedText;
            this.updateCopyContents();
          }).catch((error) => {
            reference.citation['error'] = {
              type: citationType,
              ref: 'doi',
            };
          });
        } else if (type === 'pmid') {
          if (this.useDOIFormatter) {
            this.getDOIFromPubMedID(id).then((data) => {
              if (data?.result) {
                const resultObj = data.result[id];
                const articleIDs = resultObj?.articleids || [];
                const doiObj = articleIDs.find((item) => item.idtype === 'doi');
                const doiID = doiObj?.value;

                if (doiID) {
                  reference['doi'] = doiID;
                  this.getCitationTextByDOI(doiID).then((text) => {
                    const formattedText = this.replaceLinkInText(text);
                    reference.citation[citationType] = formattedText;
                    this.updateCopyContents();
                  }).catch((error) => {
                    reference.citation['error'] = {
                      type: citationType,
                      ref: 'doi',
                    };
                  });
                } else {
                  // If there has no doi in PubMed
                  const { title, pubdate, authors } = resultObj;
                  const authorNames = authors ? authors.map((author) => author.name) : [];
                  const formattedText = this.formatCopyReference({
                    title: title || '',
                    date: pubdate || '',
                    authors: authorNames,
                    url: `https://pubmed.ncbi.nlm.nih.gov/${id}`,
                  });
                  reference.citation[citationType] = formattedText;
                  this.updateCopyContents();
                }
              }
            }).catch((error) => {
              reference.citation['error'] = {
                type: citationType,
                ref: 'pubmed',
              };
            });
          } else {
            getCitationById(id, {
              type: 'pmid',
              format: citationType
            }).then((text) => {
              const formattedText = this.replaceLinkInText(text);
              reference.citation[citationType] = formattedText;
              this.updateCopyContents();
            }).catch((error) => {
              reference.citation['error'] = {
                type: citationType,
                ref: 'pubmed',
              };
            });
          }
        }
      }
    },
    getCitationText: function(citationType) {
      async function generateCitationTextSequentially(that) {
        for (let i = 0; i < that.pubMedReferences.length; i++) {
          that.generateCitationText(that.pubMedReferences[i], citationType);

          // add delay only for more than 3 items in the list
          if (
            that.pubMedReferences.length > 3 &&
            i < that.pubMedReferences.length - 1
          ) {
            await delay(LOADING_DELAY);
          }
        }
      }

      generateCitationTextSequentially(this);
    },
    reloadCitation: function (reference) {
      this.generateCitationText(reference, this.citationType);
    },
    updateCopyContents: function () {
      const citationTypeObj = this.citationOptions.find((item) => item.value === this.citationType);
      let citationFormatStyle = '';
      const values = [];

      if (this.referencesWithDOI) {
        citationFormatStyle = citationTypeObj?.label;
      }

      this.pubMedReferences.forEach((reference) => {
        values.push(reference.citation[this.citationType]);
      });

      this.openLibReferences.forEach((reference) => {
        values.push(this.formatCopyReference(reference));
      });

      this.isbnDBReferences.forEach((reference) => {
        values.push(reference.url);
      });

      if (values.length) {
        const list = values.map((item) => `<li>${item}</li>`).join('\n');
        const listContent = `<ul>${list}</ul>`;
        const listTitle = `<div><strong>References</strong></div>`;
        this.referecesListContent = listTitle + `\n` + listContent;
      }

      this.$emit('references-loaded', {
        style: citationFormatStyle,
        list: values
      });
    },
    replaceLinkInText: function (text) {
      const protocol = 'https://';
      let linkBody = text.split(protocol)[1];

      if (linkBody) {
        linkBody = linkBody.split(' ')[0];
        linkBody = linkBody.trim();

        if (linkBody.endsWith('.')) {
          linkBody = linkBody.substring(0, linkBody.length - 1);
        }

        const fullLink = protocol + linkBody;
        const htmlLink = `<a href="${fullLink}" target="_blank">${fullLink}</a>`;

        return text.replace(fullLink, htmlLink);
      }

      return text;
    },
    searchPMID: async function (term) {
      const esearchAPI = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${term}&format=json`;
      return await this.fetchData(esearchAPI);
    },
    getCitationTextByDOI: async function (id) {
      const citationAPI = `${this.crosscite_host}/format?doi=${id}&style=${this.citationType}&lang=en-US`;
      return await this.fetchData(citationAPI, 'text');
    },
    getDOIFromPubMedID: async function (pubmedId) {
      const summaryAPI = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pubmedId}&format=json`;
      return await this.fetchData(summaryAPI);
    },
    formatOpenLibReferences: function () {
      this.openLibReferences.forEach((reference) => {
        const { bookId } = reference;
        this.getBookData(bookId).then((data) => {
          const { title, authors, publish_date } = data;
          if (title) {
            reference['title'] = title;
          }

          if (publish_date) {
            reference['date'] = publish_date;
          }

          if (authors) {
            reference['authors'] = [];

            authors.forEach((author) => {
              this.getBookAuthor(author.key).then((data) => {
                const { name } = data;
                if (name) {
                  reference['authors'].push(name);
                  this.updateCopyContents();
                }
              });
            });
          }
          this.updateCopyContents();
        });
      });
    },
    getBookData: async function (bookId) {
      const apiURL = `https://openlibrary.org/books/${bookId}.json`;
      return await this.fetchData(apiURL);
    },
    getBookAuthor: async function (key) {
      const apiURL = `https://openlibrary.org${key}.json`;
      return await this.fetchData(apiURL);
    },
    formatCopyReference: function (reference) {
      const copyContents = [];
      const { title, date, authors, url } = reference;

      if (title) {
        copyContents.push(title);
      }

      if (date) {
        copyContents.push(`(${date})`);
      }

      if (authors) {
        copyContents.push(`- ${authors.join(', ')}`);
      }

      copyContents.push(`<div><a href="${url}" target="_blank">${url}</a></div>`);

      return copyContents.join(' ');
    },
    fetchData: async function (apiURL, format) {
      try {
        const response = await fetch(apiURL);
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }

        if (format === 'text') {
          return await response.text();
        } else {
          return await response.json();
        }
      } catch (error) {
        throw new Error(error);
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.resource-container {
  margin-top: 1em;

  &:hover {
    .attribute-title-container :deep(.copy-clipboard-button) {
      opacity: 1;
      visibility: visible;
    }
  }
}

.attribute-title-container {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  :deep(.copy-clipboard-button) {
    opacity: 0;
    visibility: hidden;
  }
}

.attribute-title {
  font-size: 16px;
  font-weight: 600;
  /* font-weight: bold; */
  text-transform: uppercase;
}

.citation-list {
  margin: 0;
  margin-top: 0.5rem;
  padding: 0;
  list-style: none;
  line-height: 1.3;

  li {
    margin: 0;
    padding: 0.5rem 1.5rem 0.5rem 0.75rem;
    border-radius: var(--el-border-radius-base);
    background-color: var(--el-bg-color-page);
    position: relative;

    :deep(a) {
      word-wrap: break-word;
      color: $app-primary-color;
    }

    + li {
      margin-top: 0.5rem;
    }

    &.loading {
      padding: 1rem;

      &::before {
        content: "";
        display: block;
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        animation-duration: 3s;
        animation-fill-mode: forwards;
        animation-iteration-count: infinite;
        animation-name: loadingAnimation;
        animation-timing-function: linear;
        background: linear-gradient(to right,
          var(--el-bg-color-page) 5%,
          var(--el-color-info-light-8) 15%,
          var(--el-bg-color-page) 30%
        );
      }
    }

    &.error {
      font-style: italic;
      color: var(--el-color-info);
      border: 1px dotted red;
      background-color: transparent;
    }

    :deep(.copy-clipboard-button) {
      position: absolute;
      bottom: 0.25rem;
      right: 0.25rem;
      opacity: 0;
      visibility: hidden;
    }

    &:hover {
      :deep(.copy-clipboard-button) {
        opacity: 1;
        visibility: visible;
      }
    }
  }
}

.citation-tabs {
  .el-button {
    &:hover,
    &:focus,
    &:active {
      color: $app-primary-color;
    }

    &.is-link {
      background: transparent !important;
      border-color: transparent !important;
      color: var(--el-button-text-color) !important;
      height: auto !important;
      padding: 2px !important;

      &:hover,
      &:focus,
      &:active {
        color: $app-primary-color !important;
        box-shadow: none !important;
      }
    }
  }

  .el-button + .el-button {
    margin-left: 0.25rem;
  }
}

.reload-button {
  color: $app-primary-color;
  text-decoration: underline;
  cursor: pointer;
}

.reference-button-container {
  margin-top: 0.5rem;
}

.reference-icon-button {
  color: $app-primary-color !important;
  background-color: #f9f2fc !important;
  border-color: $app-primary-color !important;

  &:hover {
    background-color: transparent !important;
  }
}

@keyframes loadingAnimation {
  0% {
    background-position: -30vw 0;
  }
  100% {
    background-position: 70vw 0;
  }
}
</style>
