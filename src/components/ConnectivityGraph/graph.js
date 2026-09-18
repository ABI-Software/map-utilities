/*==============================================================================

A viewer for neuron connectivity graphs.

Copyright (c) 2019 - 2024  David Brooks

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

==============================================================================*/

import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
cytoscape.use(dagre);

//==============================================================================

//==============================================================================

const inArray = function (ar1, ar2) {
  if (!ar1 || !ar2) return false;
  let as1 = JSON.stringify(ar1);
  let as2 = JSON.stringify(ar2);
  return as1.indexOf(as2) !== -1;
};

const removeDuplicates = function (arrayOfAnything) {
  if (!arrayOfAnything) return [];
  return [...new Set(arrayOfAnything.map((e) => JSON.stringify(e)))].map((e) => JSON.parse(e));
};

const findComponents = function (knowledge, axons, dendrites) {
  let dnodes = knowledge.connectivity.flat(); // get nodes from edgelist
  let nodes = removeDuplicates(dnodes);

  let found = [];
  let terminal = false;
  nodes.forEach((node) => {
    terminal = false;
    // Check if the node is an destination or origin (note that they are labelled dendrite and axon as opposed to origin and destination)
    if (inArray(axons, node)) {
      terminal = true;
    }
    if (inArray(dendrites, node)) {
      terminal = true;
    }
    if (!terminal) {
      found.push(node);
    }
  });

  return found;
};

export class ConnectivityGraph extends EventTarget {
  cyg = null;
  nodes = [];
  edges = [];
  axons = [];
  dendrites = [];
  somas = [];
  labelCache = new Map();
  graphCanvas = null;
  hasPhenotypes = false;
  unavailableNodeIds = new Set();
  termOverrides = new Map();
  termLabels = new Map();
  combinationMap = new Map();

  constructor(labelCache, graphCanvas, options = {}) {
    super();
    this.labelCache = labelCache;
    this.graphCanvas = graphCanvas;
    this.unavailableNodeIds =
      options.unavailableNodeIds instanceof Set
        ? options.unavailableNodeIds
        : new Set(options.unavailableNodeIds || []);
    this.termOverrides =
      options.termOverrides instanceof Map
        ? options.termOverrides
        : new Map(Object.entries(options.termOverrides || {}));
    this.termLabels =
      options.termLabels instanceof Map
        ? options.termLabels
        : new Map(Object.entries(options.termLabels || {}));
    this.combinationMap =
      options.combinationMap instanceof Map
        ? options.combinationMap
        : new Map(Object.entries(options.combinationMap || {}));
  }

  async addConnectivity(knowledge) {
    //=====================================================
    if (knowledge && knowledge['node-phenotypes']) {
      const sourceKey = ['ilxtr:hasSomaLocatedIn'];
      const destinationKey = [
        'ilxtr:hasAxonPresynapticElementIn',
        'ilxtr:hasAxonSensorySubcellularElementIn',
      ];

      const source = [];
      const destination = [];
      sourceKey.forEach((key) => {
        source.push(...knowledge['node-phenotypes'][key]);
      });
      destinationKey.forEach((key) => {
        destination.push(...knowledge['node-phenotypes'][key]);
      });
      const via = findComponents(knowledge, source, destination);
      this.dendrites = source.map((node) => JSON.stringify(node));
      this.axons = destination.map((node) => JSON.stringify(node));
      if (via?.length) {
        this.somas = via.map((node) => JSON.stringify(node));
      }
      this.hasPhenotypes = true;
    } else {
      this.axons = knowledge.axons.map((node) => JSON.stringify(node));
      this.dendrites = knowledge.dendrites.map((node) => JSON.stringify(node));
      if (knowledge.somas?.length) {
        this.somas = knowledge.somas.map((node) => JSON.stringify(node));
      }
      this.hasPhenotypes = false;
    }
    if (knowledge.connectivity.length) {
      for (const edge of knowledge.connectivity) {
        const e0 = await this.graphNode(edge[0]);
        const e1 = await this.graphNode(edge[1]);
        this.nodes.push(e0);
        this.nodes.push(e1);
        this.edges.push({
          id: `${e0.id}_${e1.id}`,
          source: e0.id,
          target: e1.id,
        });
      }
    } else {
      this.nodes.push({
        id: 'MISSING',
        label: 'NO PATHS',
      });
    }
  }

  showConnectivity(graphCanvas) {
    //================
    this.cyg = new CytoscapeGraph(this, graphCanvas);

    this.cyg.on('tap-node', (event) => {
      const tapEvent = new CustomEvent('tap-node', {
        detail: event.detail,
      });
      this.dispatchEvent(tapEvent);
    });
  }

  selectConnectivity(selectedConnectivityData) {
    if (this.cyg?.cy) {
      let eleId = '';
      this.cyg.cy.elements().forEach((ele) => {
        const connectivityData = getNodeConnectivityData(ele.data());

        if (areArraysIdentical(selectedConnectivityData, connectivityData)) {
          eleId = ele.id();
        }
      });

      if (eleId) {
        this.cyg.cy.$id(eleId).select();
      }
    }
  }

  clearConnectivity() {
    //=================
    if (this.cyg) {
      this.cyg.remove();
      this.cyg = null;
    }
  }

  reset() {
    //=====
    if (this.cyg) {
      this.cyg.resetView();
    }
  }

  resize() {
    //======
    if (this.cyg) {
      this.cyg.resize();
    }
  }

  zoom(val) {
    //=======
    if (this.cyg?.cy) {
      const currentZoom = this.cyg.cy.zoom();
      const width = this.cyg.cy.width();
      const height = this.cyg.cy.height();
      const positionToRender = {
        x: width / 2,
        y: height / 2,
      };
      this.cyg.cy.zoom({
        level: currentZoom + val,
        renderedPosition: positionToRender,
      });
    }
  }

  enableZoom(option) {
    //================
    if (this.cyg?.cy) {
      this.cyg.cy.userZoomingEnabled(option);
    }
  }

  get elements() {
    //============
    return [
      ...this.nodes.map((n) => {
        return { data: n };
      }),
      ...this.edges.map((e) => {
        return { data: e };
      }),
    ];
  }

  get roots() {
    //===================
    if (this.hasPhenotypes) {
      return [...this.dendrites];
    } else {
      return [...this.dendrites, ...this.somas];
    }
  }

  async graphNode(node) {
    //=======================================================
    const id = JSON.stringify(node);
    const nodeTerms = [node[0], ...node[1]];
    // combination-level lookup (exact compound node match)
    // This fixes cross-combination contamination where a term that is
    // unavailable in one combination incorrectly marks a node from a
    // different, available combination as unavailable.
    const combination = this.combinationMap.get(id);
    if (combination) {
      return this.graphNodeFromCombination(id, nodeTerms, combination);
    }

    // individual term lookup (fallback for non-combination nodes)
    const displayTerms = nodeTerms.map((term) => {
      const override = this.termOverrides.get(term);
      return override?.id || term;
    });

    // Deduplicate: multiple SCKAN terms may resolve to the same Map term
    const seenIds = new Set();
    const uniqueTermPairs = [];
    nodeTerms.forEach((term, index) => {
      const displayTerm = displayTerms[index];
      if (!seenIds.has(displayTerm)) {
        seenIds.add(displayTerm);
        const override = this.termOverrides.get(term);
        const humanLabel =
          override?.label ||
          (this.termLabels.has(displayTerm) ? this.termLabels.get(displayTerm) : '') ||
          (this.labelCache.has(displayTerm) ? this.labelCache.get(displayTerm) : '');
        uniqueTermPairs.push({ id: displayTerm, humanLabel });
      }
    });

    const label = [
      ...uniqueTermPairs.map((p) => p.id),
      ...uniqueTermPairs.map((p) => p.humanLabel),
    ];

    const result = {
      id,
      label: label.join('\n'),
      displayLabel: formatDisplayLabels(uniqueTermPairs.map((pair) => pair.humanLabel)),
      connectivityData: uniqueTermPairs.map((pair) => ({
        id: pair.id,
        label: pair.humanLabel || pair.id,
      })),
    };
    const mappedFrom = [];
    nodeTerms.forEach((term) => {
      const override = this.termOverrides.get(term);
      if (!override) {
        return;
      }

      const sourceLabel = this.termLabels.has(term)
        ? this.termLabels.get(term)
        : this.labelCache.has(term)
          ? this.labelCache.get(term)
          : term;
      mappedFrom.push({
        sourceId: term,
        sourceLabel,
        targetId: override.id,
        targetLabel: override.label || sourceLabel,
      });
    });
    if (mappedFrom.length) {
      result['mappedFrom'] = removeDuplicateMappings(mappedFrom);
    }
    const hasUnavailableTerm = nodeTerms.some((term) => this.unavailableNodeIds.has(term));
    const hasMappedTerm = nodeTerms.some((term) => this.termOverrides.has(term));

    if (hasMappedTerm) {
      result['mapped'] = true;
    } else if (hasUnavailableTerm) {
      result['unavailable'] = true;
    }
    if (this.hasPhenotypes) {
      if (this.axons.includes(id)) {
        result['axon'] = true;
      } else if (this.dendrites.includes(id)) {
        result['dendrite'] = true;
      } else {
        result['somas'] = true;
      }
    } else {
      if (this.axons.includes(id)) {
        if (this.dendrites.includes(id) || this.somas.includes(id)) {
          result['somas'] = true;
        } else {
          result['axon'] = true;
        }
      } else if (this.dendrites.includes(id) || this.somas.includes(id)) {
        result['dendrite'] = true;
      }
    }
    return result;
  }

  graphNodeFromCombination(id, nodeTerms, combination) {
    //==================================================
    const hasMapId = combination.mapId?.length > 0;
    const isUnavailableOnMap = !hasMapId || !combination.mapLabel;
    const isDirectMatch =
      !isUnavailableOnMap &&
      JSON.stringify(combination.mapId) === JSON.stringify(combination.sckanId);
    const isMappedTerm = !isUnavailableOnMap && !isDirectMatch;

    const displayIds = isMappedTerm
      ? [...new Set(flattenIds(combination.mapId))]
      : [...new Set(nodeTerms)];

    const combinedLabel = (isMappedTerm ? combination.mapLabel : combination.sckanLabel) || '';

    const label = [...displayIds, combinedLabel].join('\n');

    const displayLabel = formatDisplayLabels([combinedLabel]);

    const result = {
      id,
      label,
      displayLabel,
      connectivityData: displayIds.map((displayId) => ({
        id: displayId,
        label: displayLabel || displayId,
      })),
    };

    if (isMappedTerm) {
      result['mapped'] = true;
      const mapIds = flattenIds(combination.mapId);
      const primaryMapId = mapIds[0];
      if (primaryMapId) {
        result['mappedFrom'] = [
          {
            sourceId: JSON.stringify(combination.sckanId),
            sourceLabel: combination.sckanLabel || '',
            targetId: primaryMapId,
            targetLabel: combination.mapLabel || combination.sckanLabel || '',
          },
        ];
      }
    } else if (isUnavailableOnMap) {
      result['unavailable'] = true;
    }

    if (this.hasPhenotypes) {
      if (this.axons.includes(id)) {
        result['axon'] = true;
      } else if (this.dendrites.includes(id)) {
        result['dendrite'] = true;
      } else {
        result['somas'] = true;
      }
    } else {
      if (this.axons.includes(id)) {
        if (this.dendrites.includes(id) || this.somas.includes(id)) {
          result['somas'] = true;
        } else {
          result['axon'] = true;
        }
      } else if (this.dendrites.includes(id) || this.somas.includes(id)) {
        result['dendrite'] = true;
      }
    }

    return result;
  }

  getConnectivityLabelForId(displayId, fallbackLabel = '') {
    //===============================================
    const labelFromCache = this.labelCache.get(displayId);
    if (labelFromCache) {
      return labelFromCache;
    }

    const labelFromTerms = this.termLabels.get(displayId);
    if (labelFromTerms && normalizeLabel(labelFromTerms) !== normalizeLabel(fallbackLabel)) {
      return labelFromTerms;
    }

    return displayId;
  }

  on(eventName, callback) {
    //=====================
    this.addEventListener(eventName, callback);
  }
}

function flattenIds(value, ids = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenIds(item, ids));
  } else if (typeof value === 'string' && value) {
    ids.push(value);
  }
  return ids;
}

function normalizeLabel(label) {
  return String(label || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

//==============================================================================

const APP_PRIMARY_COLOR = '#8300bf';
const BG_COLOR = '#f3ecf6';
const UNAVAILABLE_BG_COLOR = '#ffe5e3';
const UNAVAILABLE_BORDER_COLOR = '#ffb7b4';
const MAPPED_BG_COLOR = '#d9ffe0';
const MAPPED_BORDER_COLOR = '#aceebb';
const GRAPH_PADDING = 40;
const GRAPH_STYLE = [
  {
    selector: 'node',
    style: {
      label: function (ele) {
        return ele.data('displayLabel') || trimLabel(ele.data('label'));
      },
      // 'background-color': '#80F0F0',
      'background-color': 'transparent',
      'background-opacity': '0',
      'text-valign': 'center',
      'text-wrap': 'wrap',
      width: '80px',
      height: '80px',
      'text-max-width': '80px',
      'font-size': '6px',
      shape: 'round-rectangle',
      'border-width': 1,
      'border-style': 'solid',
      'border-color': 'gray',
    },
  },
  {
    selector: 'node[axon]',
    style: {
      // 'background-color': 'green',
      shape: 'round-diamond',
      width: '100px',
      height: '100px',
    },
  },
  {
    selector: 'node[dendrite]',
    style: {
      // 'background-color': 'red',
      shape: 'ellipse',
    },
  },
  {
    selector: 'node[somas]',
    style: {
      // 'background-color': 'gray',
      shape: 'round-rectangle',
    },
  },
  {
    selector: 'node[unavailable]',
    style: {
      'border-color': UNAVAILABLE_BORDER_COLOR,
    },
  },
  {
    selector: 'node[mapped]',
    style: {
      'border-color': MAPPED_BORDER_COLOR,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1,
      'line-color': 'dimgray',
      'curve-style': 'bezier',
    },
  },
  {
    selector: 'node.active',
    style: {
      'border-color': APP_PRIMARY_COLOR,
      'background-color': BG_COLOR,
      'background-opacity': 0.75,
    },
  },
  {
    selector: 'node[unavailable].active',
    style: {
      'border-color': UNAVAILABLE_BORDER_COLOR,
      'background-color': UNAVAILABLE_BG_COLOR,
      'background-opacity': 0.75,
    },
  },
  {
    selector: 'node[mapped].active',
    style: {
      'border-color': MAPPED_BORDER_COLOR,
      'background-color': MAPPED_BG_COLOR,
      'background-opacity': 0.75,
    },
  },
];

function trimLabel(label) {
  const labels = label.split('\n');
  const half = labels.length / 2;
  const trimLabels = labels.slice(half);
  // Deduplicate repeated labels, even if they differ only by whitespace.
  const seen = new Set();
  const uniqueLabels = trimLabels
    .map((item) =>
      String(item || '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((item) => item)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  return capitalizeLabels(uniqueLabels.join('\n'));
}

function formatDisplayLabels(labels) {
  const seen = new Set();
  const uniqueLabels = (labels || [])
    .flatMap((item) => String(item || '').split('\n'))
    .map((item) =>
      String(item || '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((item) => item)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

  return capitalizeLabels(uniqueLabels.join('\n'));
}

function capitalizeLabels(input) {
  return input
    .split('\n')
    .map((label) => {
      if (label && label[0] >= 'a' && label[0] <= 'z') {
        return label.charAt(0).toUpperCase() + label.slice(1);
      }
      return label;
    })
    .join('\n');
}

function escapeHtml(input) {
  return String(input || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getConnectivityData(label) {
  const labels = label ? label.split(`\n`) : [];
  const connectivityData = [];

  for (let i = 0; i < labels.length / 2; i++) {
    connectivityData.push({
      id: labels[i],
      label: labels[i + labels.length / 2],
    });
  }
  return connectivityData;
}

function getNodeConnectivityData(data) {
  if (Array.isArray(data?.connectivityData) && data.connectivityData.length) {
    return data.connectivityData;
  }

  return getConnectivityData(data?.label || '');
}

function getTooltipConnectivityData(data) {
  const grouped = new Map();

  getNodeConnectivityData(data).forEach((item) => {
    const label = String(item?.label || item?.id || '')
      .replace(/\s+/g, ' ')
      .trim();
    const id = String(item?.id || '').trim();
    const key = label.toLowerCase();

    if (!grouped.has(key)) {
      grouped.set(key, {
        label,
        ids: [],
      });
    }

    if (id && !grouped.get(key).ids.includes(id)) {
      grouped.get(key).ids.push(id);
    }
  });

  return [...grouped.values()].map((item) => ({
    label: item.label,
    id: item.ids.join(', '),
  }));
}

function areArraysIdentical(arr1, arr2) {
  arr1.sort((a, b) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  arr2.sort((a, b) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i]?.id !== arr2[i]?.id) {
      return false;
    }
  }

  return true;
}

function removeDuplicateMappings(mappings) {
  const seen = new Set();
  const uniqueMappings = [];

  mappings.forEach((mapping) => {
    const key = JSON.stringify(mapping);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMappings.push(mapping);
    }
  });

  return uniqueMappings;
}
//==============================================================================

class CytoscapeGraph extends EventTarget {
  cy;
  tooltip;
  layoutOptions;

  constructor(connectivityGraph, graphCanvas) {
    super();
    this.layoutOptions = {
      name: 'dagre',
      nodeSep: 150,
      edgeSep: 50,
      rankSep: 100,
      rankDir: 'TB',
      roots: connectivityGraph.roots.length ? connectivityGraph.roots : undefined,
      fit: true,
      padding: GRAPH_PADDING,
      animate: false,
    };
    this.cy = cytoscape({
      container: graphCanvas,
      elements: connectivityGraph.elements,
      layout: this.layoutOptions,
      style: GRAPH_STYLE,
      minZoom: 0.1,
      maxZoom: 10,
      wheelSensitivity: 0.4,
    })
      .on('mouseover', 'node', this.overNode.bind(this))
      .on('mouseout', 'node', this.exitNode.bind(this))
      .on('position', 'node', this.moveNode.bind(this));

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'cy-graph-tooltip';
    this.tooltip.hidden = true;
    graphCanvas?.lastChild?.appendChild(this.tooltip);
  }

  remove() {
    //======
    if (this.cy) {
      this.cy.destroy();
    }
  }

  resetView() {
    //=========
    if (!this.cy) {
      return;
    }

    this.cy.layout(this.layoutOptions).run();

    const elements = this.cy.elements();
    if (elements.length) {
      this.cy.fit(elements, GRAPH_PADDING);
      this.cy.center(elements);
    } else {
      this.cy.reset();
    }
  }

  resize() {
    //======
    if (!this.cy) {
      return;
    }

    this.cy.resize();
    this.resetView();
  }

  checkRightBoundary(leftPos) {
    //==================================
    if (leftPos + this.tooltip.offsetWidth >= this.tooltip.parentElement?.offsetWidth) {
      this.tooltip.style.left = `${leftPos - this.tooltip.offsetWidth}px`;
    }
  }

  overNode(event) {
    //==============
    const node = event.target;
    const data = node.data();
    const connectivityData = getTooltipConnectivityData(data);
    const tooltipLines = connectivityData.map((item) => ({
      text: `${item.label} (${item.id})`,
      type: 'default',
    }));
    const mappedFrom = data.mappedFrom || [];
    const isUnavailable = !!data.unavailable;
    const isMapped = !!data.mapped;

    if (mappedFrom.length) {
      tooltipLines.push({ text: '', type: 'spacer' });
      tooltipLines.push({ text: 'SCKAN feature alias:', type: 'alias' });
      mappedFrom.forEach((mapping) => {
        tooltipLines.push({
          text: `${mapping.sourceLabel} (${mapping.sourceId})`,
          type: 'alias-source',
        });
      });
    } else if (isUnavailable) {
      tooltipLines.unshift({ text: '', type: 'spacer' });
      tooltipLines.unshift({ text: 'SCKAN feature unavailable on Map', type: 'unavailable' });
    }

    const tooltipMarkup = tooltipLines
      .map((line) => {
        if (line.type === 'spacer') {
          return '<div class="cy-graph-tooltip-spacer"></div>';
        }

        const classes = ['cy-graph-tooltip-line'];
        if (line.type === 'alias') classes.push('is-alias');
        if (line.type === 'alias-source') classes.push('is-alias-source');
        if (line.type === 'unavailable') classes.push('is-unavailable');

        return `<div class="${classes.join(' ')}">${escapeHtml(capitalizeLabels(line.text))}</div>`;
      })
      .join('');

    this.tooltip.innerHTML = tooltipMarkup;
    this.tooltip.style.backgroundColor = isUnavailable
      ? UNAVAILABLE_BG_COLOR
      : isMapped
        ? MAPPED_BG_COLOR
        : BG_COLOR;
    this.tooltip.style.borderColor = isUnavailable
      ? UNAVAILABLE_BORDER_COLOR
      : isMapped
        ? MAPPED_BORDER_COLOR
        : APP_PRIMARY_COLOR;
    this.tooltip.style.left = `${event.renderedPosition.x}px`;
    this.tooltip.style.top = `${event.renderedPosition.y}px`;
    this.tooltip.style.maxWidth = '240px';
    this.tooltip.style.zIndex = 2;
    this.tooltip.hidden = false;

    this.checkRightBoundary(event.renderedPosition.x);

    this.tapNode(event, true);
  }

  moveNode(event) {
    //==============
    const node = event.target;
    this.tooltip.style.left = `${node.renderedPosition().x}px`;
    this.tooltip.style.top = `${node.renderedPosition().y}px`;
    this.checkRightBoundary(node.renderedPosition().x);
  }

  exitNode(event) {
    //==============
    this.tooltip.hidden = true;

    this.tapNode(event, false);
  }

  tapNode(event, show) {
    //============
    const node = event.target;
    const data = node.data();
    let connectivityData = getTooltipConnectivityData(data);

    if (show) {
      node.addClass('active');
    } else {
      node.removeClass('active');
      connectivityData = [];
      setTimeout(() => {
        node.unselect();
      });
    }

    const tapEvent = new CustomEvent('tap-node', {
      detail: connectivityData,
    });
    this.dispatchEvent(tapEvent);
  }

  on(eventName, callback) {
    //=====================
    this.addEventListener(eventName, callback);
  }
}

//==============================================================================
