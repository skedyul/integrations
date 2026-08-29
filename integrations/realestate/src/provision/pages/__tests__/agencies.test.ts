import { describe, expect, it } from '@jest/globals'
import agenciesPage from '../agencies'

type LooseField = {
  id?: string
  component?: string
  handler?: string
  iterable?: string
  emptyMessage?: string
  itemTemplate?: { props?: { label?: string } }
}

describe('Agencies page', () => {
  it('loads agencies from context and lists them in the card', () => {
    expect(agenciesPage.context).toEqual({
      agencies: {
        model: 'agency',
        mode: 'many',
        limit: 50,
      },
    })

    expect(agenciesPage.blocks?.some((block) => block.type === 'list')).toBe(
      false,
    )

    const card = agenciesPage.blocks?.[0]
    expect(card?.type).toBe('card')
    expect(card?.header?.title).toBe('Connected Agencies')

    const fields = (card && 'form' in card ? card.form?.fields : []) as
      | LooseField[]
      | undefined
    const refresh = fields?.find((field) => field.id === 'refresh_agencies')
    const list = fields?.find((field) => field.id === 'agencies_list')

    expect(refresh?.component).toBe('fieldsetting')
    expect(refresh?.handler).toBe('check_ignite_integration')
    expect(list?.component).toBe('list')
    expect(list?.iterable).toBe('{{ agencies }}')
    expect(list?.itemTemplate?.props?.label).toBe('{{ item.agency_id }}')
    expect(list?.emptyMessage).toMatch(/No agencies yet/)
  })

  it('invokes check_ignite_integration from the page action', () => {
    expect(agenciesPage.actions).toEqual([
      expect.objectContaining({
        handle: 'check_ignite_integration',
        handler: 'check_ignite_integration',
        label: 'Check Ignite status',
      }),
    ])
  })
})
