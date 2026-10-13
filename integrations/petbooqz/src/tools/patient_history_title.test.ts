import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildPatientHistoryTitle,
  historyLookupTitles,
} from './patient_history_title.ts'

describe('buildPatientHistoryTitle', () => {
  it('keeps a lab reference title when source_report_id is also set', () => {
    assert.equal(
      buildPatientHistoryTitle('Pathology Result 26-55006028/211', 'ins_report'),
      'Pathology Result 26-55006028/211',
    )
  })

  it('falls back to the legacy unique title for the generic placeholder', () => {
    assert.equal(
      buildPatientHistoryTitle('Patient History from Skedyul', 'ins_report'),
      'Skedyul Report ins_report',
    )
  })

  it('falls back to Pathology Result when both inputs are empty', () => {
    assert.equal(buildPatientHistoryTitle('  '), 'Pathology Result')
  })
})

describe('historyLookupTitles', () => {
  it('matches the visible title and the legacy Skedyul Report id', () => {
    assert.deepEqual(
      historyLookupTitles('Pathology Result 26-55007813/501', 'ins_ge8'),
      ['Pathology Result 26-55007813/501', 'Skedyul Report ins_ge8'],
    )
  })
})
