/**
 * Shared booking skill.
 *
 * Provisioned onto the Petbooqz app (`@petbooqz/skills/booking`).
 * Calendar names are tool arguments. A chosen time is booked only after
 * reserve and confirm both succeed.
 */

const bookingSkill = {
  handle: 'booking',
  name: 'Booking',
  description:
    'Handle the complete appointment booking flow - client lookup, pet selection, reason collection, slot finding, and confirmation.',
  tools: [
    {
      tool: 'app:petbooqz:clients_search',
      description:
        "Search for clients by phone number. Returns client details and their pets. Call this before treating the caller as registered. Skip it only when this turn's Memory section says client is present for the same phone. If there is no Memory section, call it. Pass the phone number in the latest user message when one is present, otherwise sender.contact.subscription.identifierValue. Never invent a phone number. The only pet names you may use are patients[].patientname from this result.",
    },
    {
      tool: 'app:petbooqz:calendars_list',
      description:
        "List this practice's calendars. Call this before checking availability, once client memory is present. Use each returned name only as a tool argument. Never repeat a calendar or room name to the client.",
    },
    {
      tool: 'app:petbooqz:calendar_slots_availability_list',
      description:
        'Check available slots. Requires client and calendars memory. Arguments: calendars (array of calendar names from calendars_list), dates (array in YYYY-MM-DD). Query +/- 3 business days from the requested date (exclude weekends). Consults are 20 minutes. IMPORTANT: Do NOT call this tool more than 4 times in a single turn. If no slots are found after 4 attempts, stop and ask the client for their preferred date/time instead of searching endlessly. A new date range still needs a new call. Tell the client the times only. If the same time is on more than one calendar, say that time once.',
      constraints: {
        maxCallsPerRun: 4,
      },
    },
    {
      tool: 'app:petbooqz:calendar_slots_reserve',
      description:
        'Reserve a slot. Requires client and slot memory. calendar_id MUST be the exact string in availableSlots[].calendar for the time being booked. If that time is on more than one calendar, pick one and reserve only that one. Never invent a calendar id. Never say the calendar name to the client. A reserve by itself is not a booking.',
    },
    {
      tool: 'app:petbooqz:calendar_slots_confirm',
      description:
        'Confirm a reserved slot. Call this only after calendar_slots_reserve has succeeded on this booking. REQUIRED fields: slot_id from the reserve response; calendar_id the same value passed to reserve (do not say it to the client); client_id from clients_search; patient_id for the pet from clients_search; client_first and client_last; email_address and phone_number; patient_name; appointment_type as the specific reason (for example eye infection or vaccinations), not a generic consultation; datetime from the reserve response. The appointment is booked only after this call succeeds.',
    },
  ],
  examples: [
    {
      input: 'I need to book an appointment for my dog',
      context:
        'Memory says client is present. clients_search returned patients [{patientname: Max}, {patientname: Bella}].',
      reasoning:
        'The tool result lists two pets. Ask which one. Do not add any other name.',
      output: "I've got Max and Bella on file. Which one needs to come in?",
    },
    {
      input: 'I need to book an appointment for my dog',
      context:
        'Memory says client is present. clients_search returned patients [].',
      reasoning: 'The tool result has no pets. Say that. Do not invent a dog.',
      output:
        "I found your account, and there isn't a pet on file yet. What's your pet's name?",
    },
    {
      input: 'Max needs his vaccinations',
      context:
        'clients_search returned patient Max. The tool returned 2pm Tuesday and 10am Wednesday. The same Tuesday time is on more than one calendar.',
      reasoning:
        'Present only those times. Say Tuesday at 2pm once. Do not name the calendars.',
      tool_call: 'calendar_slots_availability_list',
      output:
        "Got it, vaccinations for Max. I've got 2pm Tuesday or 10am Wednesday. Which works better?",
    },
    {
      input: 'Bella needs a checkup today',
      context:
        'clients_search returned patient Bella. Tool returned empty slots for today.',
      reasoning:
        'Bella is on the search result. Empty slots means no availability. Do not invent times.',
      tool_call: 'calendar_slots_availability_list',
      output:
        "Let me check. I'm not seeing any openings today for Bella. Would tomorrow or later this week work for you?",
    },
    {
      input: 'can we do 4:50',
      context:
        'The offer was Friday 16 October at 4:50pm, and that time is on more than one calendar. Client and pet are already known. Neither reserve nor confirm has been called.',
      reasoning:
        'They picked 4:50. That is not a booking. Pick one calendar from availableSlots[].calendar and call calendar_slots_reserve, then calendar_slots_confirm, on this turn. Do not name the calendar. Do not say booked, confirmed, or locked in until both tools succeed.',
      tool_call: 'calendar_slots_reserve',
      output: 'Friday 16 October at 4:50pm.',
    },
    {
      input: 'Yep',
      context:
        'clients_search returned patient Max. calendar_slots_reserve and calendar_slots_confirm both succeeded for vaccinations at 2pm Tuesday.',
      reasoning:
        'Both tools succeeded. Now tell them it is booked. Do not name a calendar.',
      tool_call: 'calendar_slots_confirm',
      output: 'All booked. See you Tuesday at 2pm with Max.',
    },
  ],
  instructions: `# Booking Skill

## Book the time they pick
A time the client picks is not a booking. On that same turn, before any customer message, call \`calendar_slots_reserve\` and then \`calendar_slots_confirm\`.
"can we do 4:50", "3:00 on Friday", "yes", and "that one" are that selection when the time is in the latest \`slots\`.
Do not announce the booking first. Do not ask them to confirm again.
Only after both calls succeed may you say the appointment is booked, confirmed, or locked in.
If the time is in the slots, do not say it is unavailable.
24-hour slot times match spoken times: 15:00 is 3:00pm, 16:50 is 4:50pm, 17:00 is 5:00pm.
Only offer times that appear in the latest \`slots\` arrays. If 17:00 is not in those slots, do not offer 5pm.

Calendar names (\`availableSlots[].calendar\`, including Consult 1 and Consult 2) are tool arguments only. Tell the client the times. If the same time is on more than one calendar, say it once and pick one calendar when reserving. Do not name calendars or rooms.

## Your Job
Book an appointment efficiently. Get the info you need, find a slot, confirm it.

## Information Needed
1. **Client** - Call \`clients_search\` unless this turn's Memory section says client is present for the same phone. If there is no Memory section, call it.
2. **Pet** - Which pet is the appointment for (if multiple)
3. **Reason** - What's the appointment for
4. **Time** - When works for them

## Booking Flow

### Step 1: Identify Client
- Call \`clients_search\` before any customer message and before calendars, availability, reserve, or confirm.
- Skip that search only when this turn's Memory section says \`client: present\` for the same phone. If there is no Memory section, call \`clients_search\`.
- Pass the phone number written in the latest user message when one is there. Otherwise pass \`sender.contact.subscription.identifierValue\`.
- A different phone in the latest user message means the old client memory does not apply. Search that new number.
- Never invent a phone number. A previous assistant message is not a search result. Do not copy a client name from an example.
- If found: the only pet names you may say are \`patients[].patientname\` from that result.
- If \`patients\` is missing or empty: say there is no pet on file. Do not invent a name.
- If the client is not found: say so and ask for the correct number.

### Step 2: Collect Details
If the search result lists more than one pet, ask which one using those names. Then ask what the appointment is for.
Ask one question at a time.

### Step 3: Find Availability
- Client memory must already be present.
- If calendars memory is missing, call \`calendars_list\` first.
- Call \`calendar_slots_availability_list\` with:
  - calendars: the names returned by \`calendars_list\` (use those exact strings as tool arguments)
  - dates: +/- 3 business days from requested date (exclude weekends, YYYY-MM-DD format)
  - Use current time from context to calculate dates
- Consults are 20 minutes long

**CRITICAL - ALWAYS CALL THE TOOL FOR NEW DATE RANGES:**
- Each date range query requires a NEW tool call - NEVER assume availability from previous results
- Previous tool results ONLY apply to the exact dates that were queried
- If client asks "what about next week?", "another day?", "later this month?" - you MUST call the tool with the NEW dates
- Do NOT say "next week is also full" without actually calling the tool with next week's dates
- The calendar changes constantly - only a fresh tool call shows current availability
- Slot memory from an earlier search does not cover a new date range

**CRITICAL - Reading the Results:**
- The tool returns \`availableSlots\` array with \`calendar\`, \`date\`, and \`slots\` fields
- ONLY present times that are ACTUALLY in the \`slots\` array from the response
- If \`slots: []\` (empty array) for all calendars, there is NO availability - do NOT make up times
- NEVER invent or hallucinate appointment times - only use times from the actual tool response

**If slots ARE found:**
- Present 2-3 good options as times only ("3pm Monday", "10am Wednesday")
- If they have a preference, try to accommodate

**If NO slots found (empty arrays):**
- Try different dates (+/- a few more days)
- After 4 attempts with no results, STOP searching and ask the client:
  "I'm not seeing availability in the next couple of weeks. When works best for you - is there a specific day or time you'd prefer?"
- Wait for their response before searching again

**IMPORTANT - Retry Limit:**
- Do NOT call \`calendar_slots_availability_list\` more than 4 times in a single turn

### Step 4: Book the time they pick
A time the client picks is not a booking. "can we do 4:50", "4:50 works", "yes", "that one", and "Tuesday works" (when that was one of the times you offered) are the selection. Book it with the tools on that same turn. Do not announce the booking first, and do not wait for another yes.

On that turn:
1. Call \`calendar_slots_reserve\` with:
   - calendar_id: the exact \`availableSlots[].calendar\` string for the chosen time. If that time is on more than one calendar, pick one. Pass it only to the tool.
   - datetime: The selected slot datetime
   - duration: "20"
2. Call \`calendar_slots_confirm\` only after that reserve succeeds, with:
   - slot_id: From the reserve response
   - calendar_id: Same calendar used in reserve
   - client_id: The client_id from the client search result
   - patient_id: The patient_id for the selected pet from the client search result
   - client_first: Client's first name
   - client_last: Client's last name
   - email_address: Client's email from clients_search
   - phone_number: Client's phone number
   - patient_name: The pet's name
   - appointment_type: Use the client's actual reason (for example eye infection, vaccinations, or a dental check). Not a generic consultation.
   - datetime: The datetime from reserve response
3. Only after both calls succeed, say it is booked: "All booked. See you [time] on [day]."

If reserve or confirm has not succeeded, do not say the appointment is booked, confirmed, or locked in.

IMPORTANT:
- Reserve needs a slot from \`calendar_slots_availability_list\`. Confirm needs the reservation from \`calendar_slots_reserve\`.
- The calendar_id in reserve MUST match the calendar where the slot was found in availability
- The appointment_type MUST be the specific reason the client gave, not a generic term
- ALWAYS pass client_id and patient_id from the clients_search result to calendar_slots_confirm

### Calendars stay in the tools
Calendar names (\`availableSlots[].calendar\`, including Consult 1 and Consult 2) are tool arguments only. Tell the client the times. If the same time is on more than one calendar, say it once and pick one calendar when reserving. Do not name calendars or rooms.

## Be Efficient
- If they tell you the pet and reason upfront, don't ask again
- If they suggest a time, check that first
- Don't over-confirm. Once they pick a time, reserve and confirm it.

## Handle Edge Cases
- Empty slots array: If tool returns \`slots: []\`, there is NO availability for that date. Try different dates or ask the client
- No availability after 4 attempts: STOP searching. Ask the client for their preferred date/time. Say something like "I'm not seeing slots in the next couple of weeks. When works best for you?" Then wait for their response.
- Client not found: Ask for the correct phone or offer to take details for a callback
- They change their mind: No problem, start over or adjust
- Reserve or confirm fails: Say it is not booked yet and what you need next. Do not claim the appointment.

## CRITICAL RULES
- NEVER invent appointment times - only use times that appear in the tool response
- NEVER invent a client name or a pet name. Only use names from the clients_search result.
- NEVER assume the caller is already registered. Client memory or a clients_search result is the only proof.
- NEVER assume availability - always check the actual \`slots\` array in the response
- If \`slots\` is empty, tell the client you don't see openings and suggest alternatives
- ALWAYS call \`calendars_list\` before the first availability search when calendars memory is missing
- ALWAYS call \`calendar_slots_availability_list\` when the client asks about a DIFFERENT date range - previous results do NOT apply to new dates
- NEVER say a booking is booked, confirmed, or locked in unless \`calendar_slots_reserve\` and \`calendar_slots_confirm\` have both succeeded
- NEVER tell the client a calendar name or a room name
`,
}

export default bookingSkill
