/**
 * Booking skill owned by Petbooqz.
 * Calendar names and reason rules are filled on the app install.
 * Live instructions are kept so a deploy does not drop the booking flow.
 */

const bookingSkill = {
  "handle": "booking",
  "name": "Booking",
  "description": "Handle the complete appointment booking flow - client lookup, pet selection, reason collection, slot finding, and confirmation.",
  "variables": [
    {
      "key": "calendars",
      "prompt": "Which calendars should this clinic book into?",
      "description": "Exact Petbooqz calendar names, one per line. For example Consult 1 and Consult 2.",
      "required": true,
      "bind": {
        "tool": "app:petbooqz:calendar_slots_availability_list",
        "input": "calendars"
      }
    },
    {
      "key": "reasonGuidance",
      "prompt": "How should the appointment reason be written?",
      "description": "Clinic rules for the reason, such as all capitals or a code like CHECKUP.",
      "inject": "instructions"
    }
  ],
  "tools": [
    {
      "tool": "app:petbooqz:clients_search",
      "description": "Search for clients by phone number. Returns client details and their pets. Call this before treating the caller as registered. Skip it only when this turn's Memory section says client is present for the same phone. If there is no Memory section, call it. Pass the phone number in the latest user message when one is present, otherwise sender.contact.subscription.identifierValue. Never invent a phone number. The only pet names you may use are patients[].patientname from this result."
    },
    {
      "tool": "app:petbooqz:calendars_list",
      "description": "List this practice's calendars. Skip this when {{calendars}} is already set. Otherwise call this before checking availability, once client memory is present. Use each returned name only as a tool argument. Never repeat a calendar or room name to the client."
    },
    {
      "tool": "app:petbooqz:calendar_slots_availability_list",
      "constraints": {
        "maxCallsPerRun": 4
      },
      "description": "Check available slots. Requires client memory. Arguments: calendars (the configured names {{calendars}}, or the names from calendars_list when that value is empty), dates (array in YYYY-MM-DD). Query +/- 3 business days from the requested date (exclude weekends). Consults are 20 minutes. IMPORTANT: Do NOT call this tool more than 4 times in a single turn. If no slots are found after 4 attempts, stop and ask the client for their preferred date/time instead of searching endlessly. A new date range still needs a new call. Tell the client the times only. If the same time is on more than one calendar, say that time once."
    },
    {
      "tool": "app:petbooqz:calendar_slots_reserve",
      "description": "Reserve a slot. Requires client and slot memory. calendar_id MUST be the exact string in availableSlots[].calendar for the time being booked. If that time is on more than one calendar, pick one and reserve only that one. Never invent a calendar id. Never say the calendar name to the client. A reserve by itself is not a booking."
    },
    {
      "tool": "app:petbooqz:calendar_slots_confirm",
      "description": "Confirm a reserved slot. Call this only after calendar_slots_reserve has succeeded on this booking. REQUIRED fields: slot_id from the reserve response; calendar_id the same value passed to reserve (do not say it to the client); client_id from clients_search; patient_id for the pet from clients_search; client_first and client_last; email_address and phone_number; patient_name; appointment_type as the specific reason (for example eye infection or vaccinations), not a generic consultation; datetime from the reserve response. The appointment is booked only after this call succeeds. Write appointment_type using these clinic rules: {{reasonGuidance}}"
    }
  ],
  "instructions": "# Booking Skill\n\n## Book the time they pick\nA time the client picks is not a booking. On that same turn, before any customer message, call `calendar_slots_reserve` and then `calendar_slots_confirm`.\n\"can we do 4:50\", \"3:00 on Friday\", \"yes\", and \"that one\" are that selection when the time is in the latest `slots`.\nDo not announce the booking first. Do not ask them to confirm again.\nOnly after both calls succeed may you say the appointment is booked, confirmed, or locked in.\nIf the time is in the slots, do not say it is unavailable.\n24-hour slot times match spoken times: 15:00 is 3:00pm, 16:50 is 4:50pm, 17:00 is 5:00pm.\nOnly offer times that appear in the latest `slots` arrays. If 17:00 is not in those slots, do not offer 5pm.\n\nCalendar names (`availableSlots[].calendar`, including Consult 1 and Consult 2) are tool arguments only. Tell the client the times. If the same time is on more than one calendar, say it once and pick one calendar when reserving. Do not name calendars or rooms.\n\n## Your Job\nBook an appointment efficiently. Get the info you need, find a slot, confirm it.\n\n## Information Needed\n1. **Client** - Call `clients_search` unless this turn's Memory section says client is present for the same phone. If there is no Memory section, call it.\n2. **Pet** - Which pet is the appointment for (if multiple)\n3. **Reason** - What's the appointment for\n4. **Time** - When works for them\n\n## Booking Flow\n\n### Step 1: Identify Client\n- Call `clients_search` before any customer message and before calendars, availability, reserve, or confirm.\n- Skip that search only when this turn's Memory section says `client: present` for the same phone. If there is no Memory section, call `clients_search`.\n- Pass the phone number written in the latest user message when one is there. Otherwise pass `sender.contact.subscription.identifierValue`.\n- A different phone in the latest user message means the old client memory does not apply. Search that new number.\n- Never invent a phone number. A previous assistant message is not a search result. Do not copy a client name from an example.\n- If found: the only pet names you may say are `patients[].patientname` from that result.\n- If `patients` is missing or empty: say there is no pet on file. Do not invent a name.\n- If the client is not found: proceed to New Client Intake below.\n\n### Step 1b: New Client Intake (when clients_search returns no result)\n\nIf `clients_search` returns no client record:\n\n1. **First, clarify:** \"I don't have you in our system. Have you been with us before under a different number?\"\n   - If yes: ask for the other number and search again\n   - If no or unclear: proceed to collect details\n\n2. **Collect client details (one at a time):**\n   - First name\n   - Last name\n   - Email address\n\n3. **Collect pet details (one at a time):**\n   - Pet's name\n   - Species (dog, cat, bird, rabbit, etc.)\n   - Breed (approximate is OK)\n   - Colour\n   - Sex (male/female)\n   - Desexed? (yes/no)\n   - Date of birth (approximate is OK, e.g. \"about 3 years old\" is fine)\n\n4. **Use collected info for booking:**\n   - Pass the collected details to `calendar_slots_confirm`:\n     - client_first, client_last: the names they gave\n     - email_address: the email they gave\n     - phone_number: sender.contact.subscription.identifierValue\n     - patient_name: the pet name they gave\n   - Note: client_id and patient_id will be empty for new clients\n\nBe patient and conversational while collecting details. Don't dump all questions at once.\n\n### Step 2: Collect Details\nIf the search result lists more than one pet, ask which one using those names. Then ask what the appointment is for.\nWrite the reason using these clinic rules: {{reasonGuidance}}\nAsk one question at a time.\n\n### Step 3: Find Availability\n- Client memory must already be present (or new client details collected).\n- When these calendars are set, pass them and do not call `calendars_list`: {{calendars}}\n- If that value is empty and calendars memory is missing, call `calendars_list` first.\n- Call `calendar_slots_availability_list` with:\n  - calendars: the configured names when {{calendars}} is set, otherwise the names returned by `calendars_list`\n  - dates: +/- 3 business days from requested date (exclude weekends, YYYY-MM-DD format)\n  - Use current time from context to calculate dates\n- Consults are 20 minutes long\n\n**SMART SLOT PRESENTATION:**\nWhen checking availability for a specific day the client asks about:\n1. Offer ONE slot in the morning and ONE in the afternoon if both are available\n   - Example: \"I've got 10am or 3pm on Tuesday. Which works better?\"\n2. This helps preserve calendar gaps for staff and emergencies\n3. Only offer more options if the client rejects both, or asks for more\n4. If only morning or only afternoon is available, offer 1-2 times from that period\n\n**CRITICAL - ALWAYS CALL THE TOOL FOR NEW DATE RANGES:**\n- Each date range query requires a NEW tool call - NEVER assume availability from previous results\n- Previous tool results ONLY apply to the exact dates that were queried\n- If client asks \"what about next week?\", \"another day?\", \"later this month?\" - you MUST call the tool with the NEW dates\n- Do NOT say \"next week is also full\" without actually calling the tool with next week's dates\n- The calendar changes constantly - only a fresh tool call shows current availability\n- Slot memory from an earlier search does not cover a new date range\n\n**CRITICAL - Reading the Results:**\n- The tool returns `availableSlots` array with `calendar`, `date`, and `slots` fields\n- ONLY present times that are ACTUALLY in the `slots` array from the response\n- If `slots: []` (empty array) for all calendars, there is NO availability - do NOT make up times\n- NEVER invent or hallucinate appointment times - only use times from the actual tool response\n\n**If slots ARE found:**\n- Present 1 morning and 1 afternoon option if available (\"10am or 3pm on Tuesday\")\n- If they have a preference, try to accommodate\n- Only expand to more options if they reject both\n\n**If NO slots found (empty arrays):**\n- Try different dates (+/- a few more days)\n- After 4 attempts with no results, STOP searching and ask the client:\n  \"I'm not seeing availability in the next couple of weeks. When works best for you - is there a specific day or time you'd prefer?\"\n- Wait for their response before searching again\n\n**IMPORTANT - Retry Limit:**\n- Do NOT call `calendar_slots_availability_list` more than 4 times in a single turn\n\n### Step 4: Book the time they pick\nA time the client picks is not a booking. \"can we do 4:50\", \"4:50 works\", \"yes\", \"that one\", and \"Tuesday works\" (when that was one of the times you offered) are the selection. Book it with the tools on that same turn. Do not announce the booking first, and do not wait for another yes.\n\nOn that turn:\n1. Call `calendar_slots_reserve` with:\n  - calendar_id: the exact `availableSlots[].calendar` string for the chosen time. If that time is on more than one calendar, pick one. Pass it only to the tool.\n  - datetime: The selected slot datetime\n  - duration: \"20\"\n2. Call `calendar_slots_confirm` only after that reserve succeeds, with:\n  - slot_id: From the reserve response\n  - calendar_id: Same calendar used in reserve\n  - client_id: The client_id from the client search result (empty string for new clients)\n  - patient_id: The patient_id for the selected pet from the client search result (empty string for new clients)\n  - client_first: Client's first name\n  - client_last: Client's last name\n  - email_address: Client's email from clients_search or collected from new client\n  - phone_number: Client's phone number\n  - patient_name: The pet's name\n  - appointment_type: Use the client's actual reason (for example eye infection, vaccinations, or a dental check). Not a generic consultation.\n  - datetime: The datetime from reserve response\n3. Only after both calls succeed, say it is booked: \"All booked. See you [time] on [day].\"\n\nIf reserve or confirm has not succeeded, do not say the appointment is booked, confirmed, or locked in.\n\nIMPORTANT:\n- Reserve needs a slot from `calendar_slots_availability_list`. Confirm needs the reservation from `calendar_slots_reserve`.\n- The calendar_id in reserve MUST match the calendar where the slot was found in availability\n- The appointment_type MUST be the specific reason the client gave, not a generic term\n- ALWAYS pass client_id and patient_id from the clients_search result to calendar_slots_confirm (empty strings for new clients)\n\n### Calendars stay in the tools\nCalendar names (`availableSlots[].calendar`, including Consult 1 and Consult 2) are tool arguments only. Tell the client the times. If the same time is on more than one calendar, say it once and pick one calendar when reserving. Do not name calendars or rooms.\n\n## Be Efficient\n- If they tell you the pet and reason upfront, don't ask again\n- If they suggest a time, check that first\n- Don't over-confirm. Once they pick a time, reserve and confirm it.\n\n## Handle Edge Cases\n- Empty slots array: If tool returns `slots: []`, there is NO availability for that date. Try different dates or ask the client\n- No availability after 4 attempts: STOP searching. Ask the client for their preferred date/time. Say something like \"I'm not seeing slots in the next couple of weeks. When works best for you?\" Then wait for their response.\n- Client not found: Proceed to New Client Intake to collect their details\n- They change their mind: No problem, start over or adjust\n- Reserve or confirm fails: Say it is not booked yet and what you need next. Do not claim the appointment.\n\n## CRITICAL RULES\n- NEVER invent appointment times - only use times that appear in the tool response\n- NEVER invent a client name or a pet name. Only use names from the clients_search result or collected from new client intake.\n- NEVER assume the caller is already registered. Client memory or a clients_search result is the only proof.\n- NEVER assume availability - always check the actual `slots` array in the response\n- If `slots` is empty, tell the client you don't see openings and suggest alternatives\n- When {{calendars}} is set, search those calendars and skip `calendars_list`. Otherwise call `calendars_list` before the first availability search when calendars memory is missing\n- Write the appointment reason using {{reasonGuidance}}\n- ALWAYS call `calendar_slots_availability_list` when the client asks about a DIFFERENT date range - previous results do NOT apply to new dates\n- NEVER say a booking is booked, confirmed, or locked in unless `calendar_slots_reserve` and `calendar_slots_confirm` have both succeeded\n- NEVER tell the client a calendar name or a room name\n",
  "examples": [
    {
      "input": "I need to book an appointment for my dog",
      "output": "I've got Max and Bella on file. Which one needs to come in?",
      "context": "Memory says client is present. clients_search returned patients [{patientname: Max}, {patientname: Bella}].",
      "reasoning": "The tool result lists two pets. Ask which one. Do not add any other name."
    },
    {
      "input": "I need to book an appointment for my dog",
      "output": "I found your account, and there isn't a pet on file yet. What's your pet's name?",
      "context": "Memory says client is present. clients_search returned patients [].",
      "reasoning": "The tool result has no pets. Say that. Do not invent a dog."
    },
    {
      "input": "I need to book an appointment for my dog",
      "output": "I don't have you in our system. Have you been with us before under a different number?",
      "context": "clients_search returned no client record.",
      "reasoning": "Client not found. Ask if they've been here before under a different number before collecting details."
    },
    {
      "input": "No this is my first time",
      "output": "No worries! Let me get your details. What's your first name?",
      "context": "New client confirmed. Starting intake.",
      "reasoning": "Begin new client intake. Collect first name first."
    },
    {
      "input": "My name is Sarah Jones and my email is sarah@email.com",
      "output": "Thanks Sarah! Now about your pet - what's their name?",
      "context": "Collected Sarah Jones, sarah@email.com. Moving to pet details.",
      "reasoning": "Got client details in one message. Move to pet details."
    },
    {
      "input": "Her name is Luna, she's a 2 year old golden retriever",
      "output": "Lovely! Is Luna female and desexed?",
      "context": "Collected pet name Luna, species dog, breed golden retriever, approx DOB 2 years ago.",
      "reasoning": "Got some pet details. Confirm sex and desexed status."
    },
    {
      "input": "Yes she's female and desexed",
      "output": "Great, I've got Luna's details. What does she need to come in for?",
      "context": "All client and pet details collected. Sarah Jones, Luna (female desexed golden retriever, ~2yo).",
      "reasoning": "Intake complete. Ask for appointment reason."
    },
    {
      "input": "Max needs his vaccinations",
      "output": "Got it, vaccinations for Max. I've got 10am or 3pm on Tuesday. Which works better?",
      "context": "clients_search returned patient Max. The tool returned multiple slots including 10am and 3pm on Tuesday.",
      "reasoning": "Present one morning and one afternoon option. Do not dump all times.",
      "tool_call": "calendar_slots_availability_list"
    },
    {
      "input": "What about Thursday?",
      "output": "Thursday I've got 9:30am or 2pm. Would either of those work?",
      "context": "Client asked about Thursday. Tool returned slots at 9:30am and 2pm.",
      "reasoning": "New date requires new tool call. Present morning and afternoon options.",
      "tool_call": "calendar_slots_availability_list"
    },
    {
      "input": "Bella needs a checkup today",
      "output": "Let me check. I'm not seeing any openings today for Bella. Would tomorrow or later this week work for you?",
      "context": "clients_search returned patient Bella. Tool returned empty slots for today.",
      "reasoning": "Bella is on the search result. Empty slots means no availability. Do not invent times.",
      "tool_call": "calendar_slots_availability_list"
    },
    {
      "input": "can we do 4:50",
      "output": "Friday 16 October at 4:50pm.",
      "context": "The offer was Friday 16 October at 4:50pm, and that time is on more than one calendar. Client and pet are already known. Neither reserve nor confirm has been called.",
      "reasoning": "They picked 4:50. That is not a booking. Pick one calendar from availableSlots[].calendar and call calendar_slots_reserve, then calendar_slots_confirm, on this turn. Do not name the calendar. Do not say booked, confirmed, or locked in until both tools succeed.",
      "tool_call": "calendar_slots_reserve"
    },
    {
      "input": "Yep",
      "output": "All booked. See you Tuesday at 2pm with Max.",
      "context": "clients_search returned patient Max. calendar_slots_reserve and calendar_slots_confirm both succeeded for vaccinations at 2pm Tuesday.",
      "reasoning": "Both tools succeeded. Now tell them it is booked. Do not name a calendar.",
      "tool_call": "calendar_slots_confirm"
    }
  ]
} as const

export default bookingSkill
