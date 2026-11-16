/**
 * A file past the size the Hangul editor opens: the main process does not read it, and the
 * tab says so in the screen language, with the limit, instead of the refusal's own words.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createI18n, LANGS as UI_LANGS, type Lang } from '@genoffice/i18n'
import { strings } from '../src/renderer/i18n/strings'
import { MAX_HWP_SAVE_BYTES } from '../src/shared/ipc'

const translate = createI18n(strings)
const LANGS = Object.keys(strings) as Lang[]
const source = (path: string): string => readFileSync(join(__dirname, '..', path), 'utf8')

describe('a file too large to open', () => {
  it('names the limit in every UI language', () => {
    expect(LANGS).toHaveLength(UI_LANGS.length)
    const mb = MAX_HWP_SAVE_BYTES / 1024 / 1024
    const notices = new Set<string>()
    for (const lang of LANGS) {
      const notice = translate(lang, 'openTooLarge', { mb })
      expect(notice, lang).toContain(String(mb))
      expect(notice, lang).not.toContain('{mb}')
      // more than the plain "could not be opened"
      expect(notice, lang).not.toBe(translate(lang, 'openFailed'))
      notices.add(notice)
    }
    // each language writes its own words, not a copy of another's
    expect(notices.size).toBeGreaterThanOrEqual(20)
    expect(translate('ko', 'openTooLarge', { mb })).toBe(
      `문서를 열지 못했습니다. ${mb}MB 제한을 초과했습니다.`,
    )
  })

  it('is told apart by the words the main process refuses the file with', () => {
    const refusal = 'hwp: file is too large to open'
    expect(source('src/main/hwp-main.ts')).toContain(
      `if (info.size > MAX_HWP_SAVE_BYTES) throw new Error('${refusal}')`,
    )
    const app = source('src/renderer/App.tsx')
    expect(app).toContain(`detailOf(error).includes('${refusal}')`)
    expect(app).toContain("setNotice({ tone: 'error', key: 'openTooLarge', params: { mb } })")
  })
})
