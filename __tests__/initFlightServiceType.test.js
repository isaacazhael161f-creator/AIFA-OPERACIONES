/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

const manifiestosPath = path.resolve(__dirname, '..', 'js', 'manifiestos.js');
const manifiestosSource = fs.readFileSync(manifiestosPath, 'utf8');
const startMarker = 'window._initFlightServiceType = function initFlightServiceType(){';
const endMarker = '// Lightweight, shared OCR preloader';
const startIndex = manifiestosSource.indexOf(startMarker);
const endIndex = manifiestosSource.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  throw new Error('Unable to locate _initFlightServiceType definition for testing.');
}

const initSnippet = manifiestosSource.slice(startIndex, endIndex);

const ensureOptionCtor = () => {
  if (typeof window.Option === 'function') return window.Option;
  const OptionFallback = function OptionFallback(text = '', value = '', defaultSelected = false, selected = false) {
    const option = document.createElement('option');
    option.value = value;
    option.text = text;
    option.defaultSelected = defaultSelected;
    option.selected = selected;
    return option;
  };
  window.Option = OptionFallback;
  return OptionFallback;
};

const loadInitFlightServiceType = () => {
  const OptionCtor = ensureOptionCtor();
  const factory = new Function('window', 'document', 'Option', initSnippet + '\nreturn window._initFlightServiceType;');
  return factory(window, document, OptionCtor);
};

describe('_initFlightServiceType', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete window.flightServiceTypeCatalog;
    delete window.flightServiceTypeCodes;
    delete window.flightServiceTypeInfoByCode;
    delete window._initFlightServiceType;
  });

  test('loads the static catalog without duplicate codes or missing descriptions (input mode)', () => {
    document.body.innerHTML = `
      <input id="mf-flight-type" />
      <div id="mf-flight-type-info"></div>
      <datalist id="flight-type-list"></datalist>
    `;

    const initFlightServiceType = loadInitFlightServiceType();
    expect(typeof initFlightServiceType).toBe('function');

    initFlightServiceType();

    const catalog = window.flightServiceTypeCatalog;
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBeGreaterThan(0);

    const codes = catalog.map((row) => row.Code);
    expect(new Set(codes).size).toBe(catalog.length);

    const missingDescriptions = catalog.filter((row) => !row.Description || !row.Description.trim());
    expect(missingDescriptions).toHaveLength(0);

    expect(window.flightServiceTypeCodes instanceof Set).toBe(true);
    expect(window.flightServiceTypeCodes.size).toBe(catalog.length);

    const datalistOptions = document.querySelectorAll('#flight-type-list option');
    expect(datalistOptions.length).toBe(catalog.length);
  });

  test('populates select elements with the static catalog and exposes metadata', () => {
    document.body.innerHTML = `
      <select id="mf-flight-type">
        <option value=""></option>
      </select>
      <div id="mf-flight-type-info"></div>
    `;

    const initFlightServiceType = loadInitFlightServiceType();
    initFlightServiceType();

    const catalog = window.flightServiceTypeCatalog;
    const select = document.getElementById('mf-flight-type');

    expect(select.options.length).toBe(catalog.length + 1); // includes placeholder

    select.value = catalog[0].Code;
    select.dispatchEvent(new window.Event('change'));

    const infoText = document.getElementById('mf-flight-type-info').textContent;
    expect(infoText).not.toBe('');
  });
});
