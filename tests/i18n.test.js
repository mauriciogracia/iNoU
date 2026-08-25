const test = require('node:test');
const assert = require('node:assert/strict');
const { getI18n } = require('../dist/i18n');

test('I18N Localization Engine & Dictionary Unit Tests', async (t) => {
  await t.test('resolves Spanish dictionary by default or fallback', () => {
    const dict = getI18n('es');
    assert.equal(dict.lang, 'es');
    assert.equal(dict.shellBanner.title, 'Shell Interactivo de iNoU');

    const fallback = getI18n('unknown_lang');
    assert.equal(fallback.lang, 'es');
  });

  await t.test('resolves English dictionary', () => {
    const dict = getI18n('en');
    assert.equal(dict.lang, 'en');
    assert.equal(dict.shellBanner.title, 'iNoU Interactive Shell');
  });

  await t.test('resolves German dictionary', () => {
    const dict = getI18n('de');
    assert.equal(dict.lang, 'de');
    assert.equal(dict.shellBanner.title, 'Interaktive iNoU-Shell');
    assert.match(dict.farewell, /Auf Wiedersehen!/);
  });

  await t.test('resolves French dictionary', () => {
    const dict = getI18n('fr');
    assert.equal(dict.lang, 'fr');
    assert.equal(dict.shellBanner.title, 'Shell Interactif iNoU');
    assert.match(dict.farewell, /Au revoir !/);
  });

  await t.test('resolves Portuguese dictionary', () => {
    const dict = getI18n('pt');
    assert.equal(dict.lang, 'pt');
    assert.equal(dict.shellBanner.title, 'Shell Interativo do iNoU');
    assert.match(dict.farewell, /Até logo!/);
  });

  await t.test('contains all required technical error strings across all languages', () => {
    const langs = ['es', 'en', 'de', 'fr', 'pt'];
    for (const lang of langs) {
      const dict = getI18n(lang);
      assert.ok(dict.errors.tokenQuotaReached, `Missing tokenQuotaReached in ${lang}`);
      assert.ok(dict.errors.networkError, `Missing networkError in ${lang}`);
      assert.ok(dict.errors.invalidApiKey, `Missing invalidApiKey in ${lang}`);
      assert.ok(dict.errors.serviceUnavailable, `Missing serviceUnavailable in ${lang}`);
      assert.ok(dict.errors.generalTechnicalError, `Missing generalTechnicalError in ${lang}`);
    }
  });
});
