/**
 * Availability (timetable) skill owned by the Petbooqz app.
 * Search calendars and slots only — no reserve or confirm.
 */

const availability = {
  handle: 'availability',
  name: 'Availability',
  description:
    'Check Petbooqz calendars and available appointment slots. Does not book.',
  tools: [
    {
      tool: 'app:petbooqz:calendars_list',
      description:
        'List calendars for this practice. Use calendar names from this response in availability searches.',
    },
    {
      tool: 'app:petbooqz:calendar_slots_availability_list',
      description:
        'Check available slots. Requires: calendars (array of calendar names), dates (array in YYYY-MM-DD). Query +/- 3 business days from the requested date (exclude weekends). Do NOT call this tool more than 4 times in a single turn.',
      constraints: {
        maxCallsPerRun: 4,
      },
    },
  ],
  instructions: `# Availability Skill

## Your Job
Tell the client what appointment times are open. Do not reserve or confirm a booking.

## Flow
1. If you do not already know the calendar names, call \`calendars_list\`.
2. Call \`calendar_slots_availability_list\` with those calendar names and dates around the requested day (+/- 3 business days, YYYY-MM-DD, no weekends).
3. Present 2-3 real times from the \`availableSlots[].slots\` arrays only.

## Rules
- NEVER invent times. Empty \`slots: []\` means no availability for that calendar/date.
- A new date range needs a new tool call. Previous results do not apply to next week or another month.
- After 4 availability calls with no slots, stop and ask when they would prefer.
- If they want to book a slot, say you can take the details and a booking skill will finish it — do not call reserve or confirm.`,
  examples: [
    {
      input: 'What times do you have next Tuesday?',
      reasoning: 'Need live slots for that date range.',
      tool_call: 'calendar_slots_availability_list',
      output:
        "I've got 2pm and 2:20pm Tuesday, or 10am Wednesday. Which works?",
    },
  ],
}

export default availability
