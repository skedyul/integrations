import { describe, expect, it } from '@jest/globals'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as workflows from '../index'
import { setupCalendarEventsStep } from '../../setup'

const workflowsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const PUSH_HANDLES = [
  'push-calendar-event-create-to-google',
  'push-calendar-event-update-to-google',
  'push-calendar-event-delete-to-google',
]

describe('outbound push workflows', () => {
  const registered = Object.values(workflows)

  it('provisions create, update and delete pushes', () => {
    const handles = registered.map((workflow) => workflow.handle)
    expect(handles).toEqual(expect.arrayContaining(PUSH_HANDLES))
  })

  it('points every provisioned workflow at a YAML file that exists', () => {
    for (const workflow of registered) {
      expect(existsSync(resolve(workflowsDir, workflow.path))).toBe(true)
    }
  })

  it('wires all three pushes on the calendar events setup step', () => {
    expect(setupCalendarEventsStep.workflowHandles).toEqual(
      expect.arrayContaining(PUSH_HANDLES),
    )
  })
})
