import assert from 'node:assert/strict'
import { test } from 'node:test'
import { knownPhrase, phraseLanguages, phrases } from '../src/phrases.ts'
import { micProblem, pickVoice, speechLang } from '../src/speech.ts'
import { translationLanguages } from '../src/translate.ts'

test('chaque langue du traducteur a une langue de lecture avec son pays', () => {
  for (const code of translationLanguages) assert.match(speechLang(code), /^[a-z]{2}-[A-Z]{2}$/, code)
  assert.equal(speechLang('ja'), 'ja-JP')
})

test('choisit la voix du bon pays, sinon de la bonne langue', () => {
  const voices = [{ lang: 'en-GB' }, { lang: 'en_US' }, { lang: 'fr-CA' }, { lang: 'zh-HK' }]
  assert.equal(pickVoice(voices, 'en')?.lang, 'en_US')
  assert.equal(pickVoice(voices, 'fr')?.lang, 'fr-CA')
  assert.equal(pickVoice(voices, 'ja'), undefined)
  // Une voix de Hong Kong ne lit pas le chinois continental.
  assert.equal(pickVoice(voices, 'zh-CN'), undefined)
})

test('les phrases prêtes sont reconnues malgré la ponctuation et les accents', () => {
  assert.equal(knownPhrase('grazie mille!', 'it', 'ja'), 'どうもありがとうございます')
  assert.equal(knownPhrase("dov'e il bagno", 'it', 'ja'), 'トイレはどこですか？')
  assert.equal(knownPhrase('ありがとうございます。', 'ja', 'it'), 'Grazie')
  assert.equal(knownPhrase('Grazie', 'it', 'de'), undefined)
  assert.equal(knownPhrase('Una frase qualsiasi', 'it', 'ja'), undefined)
  for (const language of phraseLanguages) {
    assert.equal(new Set(phrases.map((p) => p[language])).size, phrases.length, language)
    for (const p of phrases) assert.ok(knownPhrase(p[language], language, language === 'ja' ? 'it' : 'ja'), p[language])
  }
})

test('explique les pannes du micro', () => {
  assert.equal(micProblem('not-allowed'), 'micDenied')
  assert.equal(micProblem('service-not-allowed'), 'micDenied')
  assert.equal(micProblem('no-speech'), 'micNothing')
  assert.equal(micProblem('network'), 'micFailed')
})
