/**
 * Booking skill owned by the Petbooqz app.
 * Installers assign this on a WORKSPACE agent — they do not own the skill.
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
      tool: 'app:petbooqz:calendar_slots_availability_list',
      description:
        'Check available slots. Requires: calendars (array of calendar names), dates (array in YYYY-MM-DD). Query +/- 3 business days from requested date (exclude weekends). Consults are 20 minutes. IMPORTANT: Do NOT call this tool more than 4 times in a single turn. If no slots found after 4 attempts, stop and ask the client for their preferred date/time instead of searching endlessly.',
      overrides: {
        calendars: ['Consult 1', 'Consult 2'],
      },
      constraints: {
        maxCallsPerRun: 4,
      },
    },
    {
      tool: 'app:petbooqz:calendar_slots_reserve',
      description: `Reserve a slot. CRITICAL: calendar_id MUST be the exact calendar name from the availability response (e.g., "Consult 1" or "Consult 2").
Look at the availableSlots[].calendar field from calendar_slots_availability_list - use that exact string.
Example: If availability shows {"calendar": "Consult 2", "slots": ["2026-07-23 09:00:00"]}, use calendar_id: "Consult 2"
DO NOT invent calendar IDs like "main_calendar" or "vet_calendar" - only use names from the availability response.`,
    },
    {
      tool: 'app:petbooqz:calendar_slots_confirm',
      description: `Confirm a reserved slot. REQUIRED fields:
- slot_id: From the reserve response
- calendar_id: Same calendar used in reserve (e.g., "Consult 2")
- client_id: The client_id from clients_search — MUST be passed to link appointment to client
- patient_id: The patient_id for the pet from clients_search — MUST be passed to link appointment to pet
- client_first, client_last: Client's name
- email_address, phone_number: Client's contact info
- patient_name: The pet's name
- appointment_type: The specific reason (e.g., "Eye infection", "Vaccinations") - NOT generic "Consultation"
- datetime: The datetime from reserve response`,
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

## Booking Flow

### Step 1: Identify Client
- FIRST: Check the conversation history - if \`clients_search\` was already called earlier, use that result. DO NOT call it again.
- ONLY if client data is not available: Get phone from \`sender.contact.subscription.identifierValue\` and call \`clients_search\`
- If found: Note client name and pets
- If not found: Let them know and ask for correct number

### Step 2: Collect Details
If client has multiple pets, ask which one. Then ask what the appointment is for.
You can combine these if natural: "Is this for Max or Bella, and what's it for?"

### Step 3: Find Availability
- Call \`calendar_slots_availability_list\` with:
  - calendars: Use the configured calendars from tool overrides
  - dates: +/- 3 business days from requested date (exclude weekends, YYYY-MM-DD format)
  - Use current time from context to calculate dates
- Consults are 20 minutes long

**CRITICAL - ALWAYS CALL THE TOOL FOR NEW DATE RANGES:**
- Each date range query requires a NEW tool call - NEVER assume availability from previous results
- Previous tool results ONLY apply to the exact dates that were queried
- If client asks "what about next week?", "another day?", "later this month?" - you MUST call the tool with the NEW dates
- Do NOT say "next week is also full" without actually calling the tool with next week's dates
- The calendar changes constantly - only a fresh tool call shows current availability

**CRITICAL - Reading the Results:**
- The tool returns \`availableSlots\` array with \`calendar\`, \`date\`, and \`slots\` fields
- ONLY present times that are ACTUALLY in the \`slots\` array from the response
- If \`slots: []\` (empty array) for all calendars, there is NO availability - do NOT make up times
- NEVER invent or hallucinate appointment times - only use times from the actual tool response

**If slots ARE found:**
- Present 2-3 good options in friendly format ("3pm Monday", "10am Wednesday")
- If they have a preference, try to accommodate

**If NO slots found (empty arrays):**
- Try different dates (+/- a few more days)
- After 4 attempts with no results, STOP searching and ask the client:
  "I'm not seeing availability in the next couple of weeks. When works best for you - is there a specific day or time you'd prefer?"
- Wait for their response before searching again

**IMPORTANT - Retry Limit:**
- Do NOT call \`calendar_slots_availability_list\` more than 4 times in a single turn

### Step 4: Confirm and Book
When they pick a slot:
1. Summarize: "[Pet] for [reason] at [time] on [day]"
2. On their "yes":
   - Call \`calendar_slots_reserve\` with:
     - calendar_id: Use the EXACT calendar name from the availability response where the slot was found (e.g., "Consult 1" or "Consult 2")
     - datetime: The selected slot datetime
     - duration: "20"
   - Call \`calendar_slots_confirm\` with:
     - slot_id: From the reserve response
     - calendar_id: Same calendar used in reserve
     - client_id: The client_id from clients_search result
     - patient_id: The patient_id for the selected pet from clients_search result
     - client_first: Client's first name
     - client_last: Client's last name
     - email_address: Client's email from clients_search
     - phone_number: Client's phone number
     - patient_name: The pet's name
     - appointment_type: Use the client's actual reason (e.g., "Eye infection", "Vaccinations", "Dental check") - NOT generic "Consultation"
     - datetime: The datetime from reserve response
3. Confirm: "All booked. See you [time] on [day]."

IMPORTANT:
- The calendar_id in reserve MUST match the calendar where the slot was found in availability
- The appointment_type MUST be the specific reason the client gave, not a generic term
- ALWAYS pass client_id and patient_id from the clients_search result to calendar_slots_confirm

## Be Efficient
- If they tell you the pet and reason upfront, don't ask again
- If they suggest a time, check that first
- Don't over-confirm - one "does that work?" is enough

## Handle Edge Cases
- Empty slots array: If tool returns \`slots: []\`, there is NO availability for that date/calendar - try different dates or ask the client
- No availability after 4 attempts: STOP searching. Ask the client for their preferred date/time.
- Client not found: Ask for correct phone or offer to take details for callback
- They change their mind: No problem, start over or adjust

## CRITICAL RULES
- NEVER invent appointment times - only use times that appear in the tool response
- NEVER assume availability - always check the actual \`slots\` array in the response
- If \`slots\` is empty, tell the client you don't see openings and suggest alternatives
- ALWAYS call \`calendar_slots_availability_list\` when the client asks about a DIFFERENT date range - previous results do NOT apply to new dates`,
  examples: [
    {
      input: 'I need to book an appointment for my dog',
      reasoning:
        'Client wants to book. Look up client first, then ask which pet and what for.',
      output:
        "Sure thing. I've got you as Sarah with Max and Bella. Which one needs to come in, and what's it for?",
    },
    {
      input: 'Max needs his vaccinations',
      context:
        "Tool returned: {availableSlots: [{calendar: 'Consult 1', slots: ['2026-05-20 14:00:00', '2026-05-20 14:20:00']}, {calendar: 'Consult 2', slots: ['2026-05-21 10:00:00']}]}",
      reasoning:
        'Tool returned actual slots. Present 2pm Tuesday or 10am Wednesday.',
      tool_call: 'calendar_slots_availability_list',
      output:
        "Got it, vaccinations for Max. I've got 2pm Tuesday or 10am Wednesday - which works better?",
    },
    {
      input: 'Bella needs a checkup today',
      context:
        "Tool returned: {availableSlots: [{calendar: 'Consult 1', date: '2026-05-18', slots: []}, {calendar: 'Consult 2', date: '2026-05-18', slots: []}]}",
      reasoning:
        'Tool returned EMPTY slots arrays. No availability today. Do not make up times.',
      tool_call: 'calendar_slots_availability_list',
      output:
        "Let me check - I'm not seeing any openings today for Bella. Would tomorrow or later this week work for you?",
    },
  ],
}

export default booking
