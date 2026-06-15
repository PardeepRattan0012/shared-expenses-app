# Product and Engineering Decisions

## 1. Database Choice: PostgreSQL
**Options Considered:** MongoDB, PostgreSQL, SQLite
**Decision:** PostgreSQL.
**Why:** The prompt explicitly states "Use relational DBs only". PostgreSQL is robust, handles decimals correctly (crucial for money), and scales well on Render.

## 2. Dealing with Dirty CSV Data
**Options Considered:** 
- Reject any bad row and fail the import.
- Try to fix everything silently.
- Import valid data, attempt to fix minor issues, and generate a transparent report.
**Decision:** Generate a transparent report. 
**Why:** A "crashed import" and a "silent guess" both fail the requirements. By parsing row-by-row, normalizing recoverable errors (like capitalization, commas in amounts), skipping unrecoverable ones (missing payer/amount), and documenting all actions, the user retains control and visibility.

## 3. Handling Multi-Currency (INR & USD)
**Options Considered:** 
- Maintain separate balances per currency.
- Convert everything to a base currency at import.
**Decision:** Convert to base currency (INR) / Assume base currency for simplicity unless complex tracking is requested. For the initial import demonstration, we flag USD and we can apply an exchange rate logic in the application layer.

## 4. Resolving Duplicate Records
**Options Considered:**
- Allow all duplicates.
- Deduplicate based on an exact match of Date + Payer + Amount + Description.
**Decision:** Exact match deduplication.
**Why:** Rows 5 & 6 are identical except for case in description. They represent a double entry. We flag it and ignore the second one to prevent double billing.

## 5. Settlements Logging
**Options Considered:** 
- Create a separate UI flow and API for settlements.
- Treat settlements as a special type of "expense" with no `split_type` and a single `split_with`.
**Decision:** Parse them from the CSV as a special type but store them in a dedicated `settlements` table (or logically treat them as transfers) to calculate balances correctly.

## 6. Meera's Moving Out
**Decision:** If Meera is included in an expense split after she moved out (March 31st), her share is redistributed among the remaining active members. This ensures historical accuracy and prevents charging people who are no longer in the flat.
