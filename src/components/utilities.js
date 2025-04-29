import { Cite, plugins } from '@citation-js/core';
import '@citation-js/plugin-doi';
import '@citation-js/plugin-csl';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-pubmed';

const capitalise = term => {
  if (term)
    return term.charAt(0).toUpperCase() + term.slice(1);
  return term;
};

const convertNodeToObject = (node) => {
  const obj = {};

  if (node.attributes) {
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      obj[`@${attr.nodeName}`] = attr.nodeValue;
    }
  }

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childResult = convertNodeToObject(child);
      if (obj[child.nodeName]) {
        if (!Array.isArray(obj[child.nodeName])) {
          obj[child.nodeName] = [obj[child.nodeName]];
        }
        obj[child.nodeName].push(childResult);
      } else {
        obj[child.nodeName] = childResult;
      }
    } else if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim() !== '') {
      return child.nodeValue.trim();
    }
  }

  return obj;
};

const xmlToJSON = (xmlText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const result = {};
  result[xmlDoc.documentElement.nodeName] = convertNodeToObject(xmlDoc.documentElement);

  return result;
};

const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * @param {id} id - DOI or PMID
 * @param {options:type} type - type of the ID, e.g., 'pmid'
 * @param {options:format} format - 'apa' (default), 'chicago', 'ieee', 'bibtex', etc.
 * @returns {citation} formatted citation text
 */
const getCitationById = async (id, { type, format }) => {
  // because 'chicago' and 'ieee' are not in citation.js default styles
  if ((format !== 'bibtex') && (format !== 'apa')) {
    const xml = `https://raw.githubusercontent.com/citation-style-language/styles/refs/heads/master/${format}.csl`;
    const response = await fetch(xml);
    const template = await response.text();
    let config = plugins.config.get('@csl');
    config.templates.add(format, template);
  }

  const option = {};

  if (type === 'pmid') {
    option['forceType'] = '@pubmed/id';
  }

  const cite = await Cite.async(id, option);
  const citation = (format === 'bibtex') ?
    cite.format(format) :
    cite.format('bibliography', {
      format: 'html',
      template: format || 'apa', // default as 'apa' style
      lang: 'en-US'
    })
  return citation;
};

export {
  capitalise,
  xmlToJSON,
  delay,
  getCitationById,
};
