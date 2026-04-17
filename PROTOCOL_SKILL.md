# Skill: Patient Protocol Management (Cuidar-me)

Guidelines and best practices for managing automated patient care protocols, message scheduling, and administrative UI components within the Cuidar-me platform.

## 📅 The "Tomorrow" Scheduling Rule

To ensure data integrity and avoid logic conflicts (like double-checking for weight on Day 1), all automated protocols must be scheduled to start on the day following their activation.

-   **Logic**: `startDate` = Today + 1 day, at 00:00:00.
-   **Implementation Pattern**:
    ```typescript
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(0, 0, 0, 0);
    ```
-   **Files Affected**: `src/ai/actions/protocols.ts` (specifically inside `assignProtocolToPatient`).

## 🛠️ UI: Rescheduling Messages

When implementing or modifying UI components for message rescheduling (like `ScheduledMessagesPanel`):

### 1. Pre-fill Logic
Always evaluate the current `sendAt` relative to the current time.
-   **Rule**: If the message is scheduled for the future, pre-fill the input with that time. If it's in the past or imminent, default to `now + 11 minutes`.
-   **Safety**: Use `.getTime()` for all comparisons to avoid object reference pitfalls.

### 2. Contextual Labels
Always provide a reference label so the user knows what the current status is before they overwrite it.
-   **Example**: "Atual: 18/04 às 07:00"

## 💾 Data Standards

### Naming Conventions
-   **Database (Supabase)**: Use `snake_case` (e.g., `send_at`, `message_content`).
-   **Application (Frontend/Types)**: Use `camelCase` (e.g., `sendAt`, `messageContent`).
-   **MAPPING**: Ensure every `Server Action` fetches raw data and maps it to the `ScheduledMessage` type before returning to the UI to avoid `undefined` properties.

### Validation
-   Messages must be scheduled at least **10 minutes in the future** to allow the cron job/queue to pick them up without racing conditions.

## 🔍 Verification Checklist

When testing changes to this flow:
1.  [ ] Check the database (`scheduled_messages`) to verify the calculated `send_at` for Dia 1.
2.  [ ] Verify the message time on the UI labels matches the database.
3.  [ ] Attempt to reschedule for less than 10 minutes from now (should be blocked).
4.  [ ] Verify the grouping (Hoje, Amanhã, etc.) in the `ScheduledMessagesPanel`.
