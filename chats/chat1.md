# Friends Workout Tracker App

_Started 2026-08-10 00:48 UTC_

---

## User

Design a mobile app for that i can use with friends without having to publish them to the apple store. we want to track our workouts, include videos for each exercise, have a way for us to track/log each day we completed the workout, and a way to include photos with each day for progress pictures. Make the color theme black and tea green

## Assistant



## User

Answered — group_size: Open group, any size; workout_structure: Freeform — log any workout any day; video_source: Stock/demo clips per exercise; screens: Exercise detail + video, Calendar/streak log; photo_view: Timeline/grid scroll; social_motivation: Streaks & accountability nudges; platform_feel: iOS-native

## User

Found issues — fixing…

## User

Found issues — fixing…

## Assistant

_[tool: copy_starter_component]_

_[tool: read_file]_

_[tool: copy_starter_component]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Built as a Design Component you can open on any phone browser and share the link with friends — no App Store needed. It has 5 tabs: Home (streak + accountability nudge), Train (freeform exercise picker with demo-video detail views), Calendar (streak/completion grid), Progress (photo timeline grid, drop-in photos), and Crew (friends' streaks). Black + tea green throughout. Group name, weekly goal, and nudges are tweakable.

## User

explain the crew activity section

## Assistant

The "Crew activity" row on the Home tab shows friends' avatars (initials on colored circles) with their current streak in days underneath — a quick glance at who in the group is active. It's static demo data (Ally, Jordan, Priya, Marcus) with no tap action; the Crew tab is the fuller version with names and status text.

## User

remove the ability to have a streak since we aren't working out everyday

## Assistant

_[tool: read_file]_

Replacing streaks with total-workout counts across Home, Calendar, and Crew.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Streaks replaced with total workout counts on Home, Calendar, and Crew.

## User

i want ot be able to see which exercises i'm doing for the day, log how many reps and have the ability to change it and have it show up in the logged section

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Selected exercises now show an editable reps/sets field on the Train tab, in the exercise detail view, and in the Home "logged" summary once you've selected exercises for the day.

## User

i should be able to see all the exercises i did for that day

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Tapping any completed day on the Calendar tab now opens a detail view listing the exercises logged that day with reps.

## User

how do i log a workout for the day

## Assistant

Go to the Train tab, tap "+" on each exercise you did (or tap the card to open its demo video/detail and tap "Add to Today"), adjust reps if needed, then tap the "Log N exercises" pill that appears at the bottom to save it as today's workout.

## User

add the ability to import a set of exercises from an excel sheet

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Added an "Import" button on the Train tab — accepts .xlsx/.xls/.csv with Name/Category/Reps columns and adds them to your exercise list.

## User

i have this excel sheet where i have each day in a different sheet with different exercises. i want a similar layout where i can see what exercises i need to do for that day

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Import now reads every sheet as a day, and Train shows day pills to switch between each day's exercise list.

## User

what if i want to be able to do 3 sets of different reps

## Assistant

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now updating the templates to match: home logged rows, train row, and detail view.

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Each exercise now has separate reps inputs per set (auto-sized from its default set count), editable in the exercise detail view, the Train list summary, and the Home logged section.

## User

let's say i have 4 days focused on different body parts and i want to be able to see the list of exercises based on that day to check off from

## Assistant

That's already supported: import your Excel workbook (Train tab → Import) with each sheet named after a day/body part (e.g. "Push Day", "Legs"), and day pills will appear letting you switch between each day's exercise list to check off. If you don't have a file, want me to pre-load a 4-day sample plan (e.g. Push/Pull/Legs/Core) instead?

## User

how do i know what day i did leg dy instead of arm day

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Now the day name (e.g. "Leg Day") shows next to "Workout logged" on Home and next to the date when you tap a completed day on the Calendar, so you can tell which day-plan you did each day.

## User

in the train section. i want a drop down of the different types of days i could day and the rest of the day should populate with the different type of exercise for that day

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Day pills replaced with a dropdown on the Train tab — picking a day type populates the exercise list below it.

## User

where are the day pills

## Assistant

Replaced with a dropdown per your last request — selecting a day type from that dropdown on the Train tab populates the exercise list below it.

## User

i dont see the dropdown

## Assistant

The dropdown only appears after you import an Excel plan (Train tab → Import) — without one, there's no "day types" to choose from, so it stays hidden. Import a workbook with each sheet named for a day, and the dropdown will show up above the exercise list.

## User

i imported and i see the dropdown but the exercises are not imported correctly

## Assistant

_[tool: read_file]_

My import assumes columns named exactly Name/Category/Reps (or Exercise/Sets etc.) — if your sheet uses different headers, or has header rows/extra columns, rows will parse blank or garbled. Can you tell me your actual column headers (or share the file), so I can match the parser to your sheet?

## User

i also want the ability to create different days of workouts and have it populate the dropdown so it doesn't require an import

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Added "+ Create a new day" on the Train tab — name it, check off exercises, save, and it appears in the day dropdown without needing an import.

## User

what if i want to create a new exercise instead of the prelisted ones

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Inside "Create a new day," added a "+ Add a new exercise" option to define name/category/reps on the fly — it gets checked and added to the day automatically.

## User

I want to create an MVP version of this app so let's start with the most basic features I want the ability for users to log in and to join group so they can share with each other I want them to be able to log a workout I want them to be able to track when they did the workout and I want them to be able to say what kind of workout they want how many reps how many sets with the exercises and be able to modify those they can create custom ones or import from an Excel sheet and they can put a title and a description for a workout

## Assistant

_[tool: dc_write]_

_[tool: ready_for_verification]_

Built **Workout MVP.dc.html** — a clean, scoped MVP separate from the earlier prototype:

- **Login** — name + join with an invite code or create a group (persists in browser storage, so sign-in sticks)
- **Workouts** — saved routines with title, description, exercises, and per-set reps; create, edit, delete, or import from Excel (one sheet per workout; Name/Sets/Reps columns, Reps can be `10,8,6` for varied sets)
- **Logging** — tap "Log today" on any workout, adjust reps per set, save
- **History** — month calendar of logged days plus a full entry list; tap any day to review or edit it
- **Group** — invite code to share, member list with counts

Note: it's a single-device prototype — the group/invite code is simulated, not a real shared backend. Photos and exercise videos from the earlier version aren't in this MVP; say the word and I'll add them back.

## User

after every log I want to be able to see a history of it and whenever I start a new workout I want to be able to take the sets and Reps from the last workout so I don't always have to change the Reps or the sets I can just modify it if I want to change it that day but by default it should be the number from the last workout

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Two additions:

- **Carry-over defaults** — starting a new log prefills every set/rep from that workout's last logged session, with a banner naming the date and a "Last: 10 / 8 / 6" line under each exercise so you can see what you're changing.
- **Per-workout history** — each workout card now shows how many times it's been logged, the last date, and its recent entries (tap one to review or edit).

