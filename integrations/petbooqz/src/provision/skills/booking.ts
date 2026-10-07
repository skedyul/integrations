/**
 * Shared booking skill.
 *
 * Provisioned onto each Petbooqz app version. Workplaces that have that
 * version installed can assign it as `@petbooqz/skills/booking`.
 *
 * Calendar names come from calendars_list so each practice uses its own rooms.
 */

const booking = {
  handle: 'booking',
  name: 'Booking',
  description:
    'Handle the complete appointment booking flow - client lookup, pet selection, reason collection, slot finding, and confirmation.',
  tools: [
    {
      tool: 'app:petbooqz:clients_search',
      description:
        'Search for clients by phone number. Returns client details and their pets. IMPORTANT: Only call this if client data is not already available in the conversation. Check the conversation history first - if clients_search was already called and returned results, use that data instead of calling again.',
    },
    {
      tool: 'app:petbooqz:calendars_list',
      description:
        'List this practice\'s calendars. Call this before checking availability. Use the returned calendar names exactly. Do not invent names.',
    },
    {
      tool: 'app:petbooqz:calendar_slots_availability_list',
      description:
        'Check available slots. Requires: calendars (array of calendar names from calendars_list), dates (array in YYYY-MM-DD). Query +/- 3 business days from the requested date (exclude weekends). Consults are 20 minutes. IMPORTANT: Do NOT call this tool more than 4 times in a single turn. If no slots are found after 4 attempts, stop and ask the client for their preferred date/time instead of searching endlessly.',
      constraints: { maxCallsPerRun: 4 },
    },
    {
      tool: 'app:petbooqz:calendar_slots_reserve',
      description:
        'Reserve a slot. CRITICAL: calendar_id MUST be the exact calendar name from the availability response.\nLook at availableSlots[].calendar from calendar_slots_availability_list and use that exact string.\nDO NOT invent calendar IDs. Only use names returned by the tools.',
    },
    {
      tool: 'app:petbooqz:calendar_slots_confirm',
      description:
        'Confirm a reserved slot. REQUIRED fields:\n- slot_id: From the reserve response\n- calendar_id: Same calendar used in reserve\n- client_id: The client_id from clients_search - MUST be passed to link the appointment to the client\n- patient_id: The patient_id for the pet from clients_search - MUST be passed to link the appointment to the pet\n- client_first, client_last: Client\'s name\n- email_address, phone_number: Client\'s contact info\n- patient_name: The pet\'s name\n- appointment_type: The specific reason (for example "Eye infection" or "Vaccinations") - NOT generic "Consultation"\n- datetime: The datetime from the reserve response',
    },
  ],
  instructions: `# Booking Skill

## Your Job
Book an appointment efficiently. Get the info you need, find a slot, confirm it.

## Information Needed
1. **Client** - Look up by phone number from \`sender.contact.subscription.identifierValue\`
2. **Pet** - Which pet is the appointment for (if multiple)
3. **Reason** - What's the appointment for
4. **Time** - When works for them
5. **Calendars** - The practice's calendar names from \`calendars_list\`

## Booking Flow

### Step 1: Identify Client
- FIRST: Check the conversation history - if \`clients_search\` was already called earlier, use that result. DO NOT call it again.
- ONLY if client data is not available: Get phone from \`sender.contact.subscription.identifierValue\` and call \`clients_search\`
- If found: Note client name and pets
- If not found: Let them know and ask for the correct number

### Step 2: Collect Details
If the client has multiple pets, ask which one. Then ask what the appointment is for.
You can combine these if natural: "Is this for Max or Bella, and what's it for?"

### Step 3: Find Availability
- If you do not already have this practice's calendar names, call \`calendars_list\` first
- Call \`calendar_slots_availability_list\` with:
  - calendars: the names returned by \`calendars_list\` (use those exact strings)
  - dates: +/- 3 business days from the requested date (exclude weekends, YYYY-MM-DD format)
  - Use the current time from context to calculate dates
- Consults are 20 minutes long

**CRITICAL - ALWAYS CALL THE TOOL FOR NEW DATE RANGES:**
- Each date range query requires a NEW tool call - NEVER assume availability from previous results
- Previous tool results ONLY apply to the exact dates that were queried
- If the client asks about a different day or week, call the tool with the NEW dates
- The calendar changes constantly - only a fresh tool call shows current availability

**CRITICAL - Reading the Results:**
- The tool returns \`availableSlots\` with \`calendar\`, \`date\`, and \`slots\`
- ONLY present times that are ACTUALLY in the \`slots\` array
- If \`slots\` is empty for every calendar, there is NO availability - do NOT make up times

**If slots ARE found:**
- Present 2-3 good options in a friendly format ("3pm Monday", "10am Wednesday")

**If NO slots found:**
- Try different dates
- After 4 attempts with no results, STOP searching and ask the client when works best
- Do NOT call \`calendar_slots_availability_list\` more than 4 times in a single turn

### Step 4: Confirm and Book
When they pick a slot:
1. Summarize: "[Pet] for [reason] at [time] on [day]"
2. On their "yes":
   - Call \`calendar_slots_reserve\` with calendar_id set to the exact calendar name from the availability response, the selected datetime, and duration "20"
   - Call \`calendar_slots_confirm\` with slot_id, the same calendar_id, client_id, patient_id, the client's name and contact details, patient_name, the specific appointment_type, and datetime
3. Confirm: "All booked. See you [time] on [day]."

- calendar_id MUST match the calendar where the slot was found
- appointment_type MUST be the specific reason the client gave
- ALWAYS pass client_id and patient_id from clients_search

## Be Efficient
- If they tell you the pet and reason upfront, don't ask again
- If they suggest a time, check that first
- Don't over-confirm - one "does that work?" is enough

## Handle Edge Cases
- Empty slots: try different dates or ask the client
- No availability after 4 attempts: stop searching and ask when works best
- Client not found: ask for the correct phone or offer to take details for a callback
- They change their mind: start over or adjust

## CRITICAL RULES
- NEVER invent appointment times or calendar names
- NEVER assume availability - always check the \`slots\` array
- ALWAYS call \`calendars_list\` before the first availability search in a conversation
- ALWAYS call \`calendar_slots_availability_list\` again when the client asks about a different date range
`,
  examples: [
    {
      input: 'I need to book an appointment for my dog',
      reasoning:
        'Client wants to book. Look up the client first, then ask which pet and what for.',
      output:
        "Sure thing. I've got you as Sarah with Max and Bella. Which one needs to come in, and what's it for?",
    },
    {
      input: 'Max needs his vaccinations',
      context:
        "Tool returned: {availableSlots: [{calendar: 'Consult 1', slots: ['2026-05-20 14:00:00', '2026-05-20 14:20:00']}, {calendar: 'Consult 2', slots: ['2026-05-21 10:00:00']}]}",
      reasoning:
        'Tool returned actual slots. Present only those times.',
      output:
        "Got it, vaccinations for Max. I've got 2pm Tuesday or 10am Wednesday - which works better?",
    },
    {
      input: 'Bella needs a checkup today',
      context:
        "Tool returned: {availableSlots: [{calendar: 'Consult 1', date: '2026-05-18', slots: []}, {calendar: 'Consult 2', date: '2026-05-18', slots: []}]}",
      reasoning:
        'Both calendars returned empty slots. Do not invent times.',
      output:
        "Let me check - I'm not seeing any openings today for Bella. Would tomorrow or later this week work for you?",
    },
    {
      input: 'Tuesday works',
      reasoning: 'They picked a slot. Confirm and book.',
      output:
        "Perfect. Max for vaccinations, 2pm Tuesday. I'll lock that in for you?",
    },
    {
      input: 'Yep',
      reasoning: 'Confirmed. Reserve and confirm the slot.',
      output: 'All booked. See you Tuesday at 2pm with Max.',
    },
  ],
}

export default booking
