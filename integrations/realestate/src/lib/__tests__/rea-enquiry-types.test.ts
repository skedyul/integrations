import { describe, expect, it } from '@jest/globals'
import {
  REA_ENQUIRY_TYPES,
  REA_ENQUIRY_TYPE_LABELS,
  REA_ENQUIRY_TYPE_OPTIONS,
} from '../rea-enquiry-types'

describe('REA enquiry types', () => {
  it('includes official REA Leads API type values', () => {
    expect(REA_ENQUIRY_TYPES.REALESTATE_COM_AU_LISTING).toBe(
      'REALESTATE_COM_AU_LISTING',
    )
    expect(Object.values(REA_ENQUIRY_TYPES)).toEqual(
      expect.arrayContaining([
        'REALESTATE_COM_AU_LISTING',
        'REALESTATE_COM_AU_RENT',
        'REALESTATE_COM_AU_AGENCY',
        'REALESTATE_COM_AU_AGENT',
        'REALESTATE_COM_AU_LEAD_AD',
        'REALESTATE_COM_AU_SALES_APPRAISAL_REQUEST',
        'REALESTATE_COM_AU_RENTAL_APPRAISAL_REQUEST',
        'REALESTATE_COM_AU_AGENCY_SALES_APPRAISAL_REQUEST',
        'REALESTATE_COM_AU_AGENCY_RENTAL_APPRAISAL_REQUEST',
        'REALCOMMERCIAL_COM_AU_BUY',
        'REALCOMMERCIAL_COM_AU_LEASE',
        'REALCOMMERCIAL_COM_AU_BUY_AND_LEASE',
        'REALCOMMERCIAL_COM_AU_FIND_AGENCY',
        'REALCOMMERCIAL_COM_AU_DOCUMENT_ACCESS',
        'DEVELOPER_PROJECT',
        'DEVELOPER_PROJECT_DOCUMENT_DOWNLOAD',
        'DEVELOPER_BUILDER_GENERAL',
        'DEVELOPER_BUILDER_INFORMATION_PACK',
        'DEVELOPER_BUILDER_DESIGN',
        'DEVELOPER_BUILDER_PROMOTION',
        'DEVELOPER_BUILDER_DISPLAY_VISIT',
        'DEVELOPER_INSPECTION_REGISTRATION',
        'DEVELOPER_EXTENSION_CAMPAIGN',
        'OTHER',
      ]),
    )
    expect(Object.values(REA_ENQUIRY_TYPES)).toHaveLength(24)
  })

  it('exposes human-readable labels for CRM select options', () => {
    expect(REA_ENQUIRY_TYPE_LABELS.REALESTATE_COM_AU_LISTING).toBe(
      'Residential listing',
    )
    expect(REA_ENQUIRY_TYPE_OPTIONS).toHaveLength(
      Object.keys(REA_ENQUIRY_TYPES).length,
    )

    for (const option of REA_ENQUIRY_TYPE_OPTIONS) {
      expect(option.label).not.toBe(option.value)
      expect(option.label).not.toMatch(/_/)
      expect(option.label.trim().length).toBeGreaterThan(0)
      expect(REA_ENQUIRY_TYPE_LABELS[option.value]).toBe(option.label)
    }
  })
})
