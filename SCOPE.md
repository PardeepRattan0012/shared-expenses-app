# Project Scope and Anomaly Log

## Overview
This document outlines the anomalies detected in the `expenses_export.csv` file, the policies chosen to handle them, and the proposed database schema for the shared expenses application.

## Anomalies and Handling Policies

| Row | Anomaly | Handling Policy |
| :--- | :--- | :--- |
| 5 & 6 | **Duplicate Entry:** "Dinner at Marina Bites" and "dinner - marina bites" have identical date, amount, payer, and split. | **Policy:** Deduplication. The importer will flag identical records (ignoring case in description) on the same date with the same amount and payer, and only import the first occurrence. |
| 7 | **Amount Format Issue:** "1,200" instead of 1200. | **Policy:** Data Cleaning. Strip commas from the amount string before parsing as a float. |
| 9 | **Capitalization Inconsistency:** "priya" instead of "Priya" in `paid_by`. | **Policy:** Data Normalization. Trim whitespace and capitalize the first letter of user names to match existing records. |
| 10 | **Floating Point Precision:** "899.995". | **Policy:** Rounding. Amounts will be rounded to 2 decimal places using standard financial rounding (half up). |
| 11 | **Name Inconsistency:** "Priya S" instead of "Priya". | **Policy:** Alias Mapping. Create a predefined map or fuzzy matching algorithm to map "Priya S" to the canonical user "Priya". |
| 13 | **Missing Payer:** `paid_by` is empty for "House cleaning supplies". | **Policy:** Validation Failure / Default Assignment. Since it's unclear, this expense will be flagged as "Requires Review" or assigned to a "System/Unknown" user until manually resolved. For this import, we will skip the row and log it as a failed import item. |
| 14 | **Settlement Logged as Expense:** "Rohan paid Aisha back", empty split_type, empty split_with. | **Policy:** Contextual Parsing. Detect if `split_with` has a single user and `split_type` is empty. Treat this as a `settlement` rather than an expense. |
| 15 & 32 | **Percentage > 100%:** Percentages sum to 110% (30+30+30+20). | **Policy:** Proportional Normalization. Since they sum to 110, we will normalize them to 100% (e.g., 30/110, 20/110) so the mathematical distribution remains sound, and flag a warning. |
| 16+ | **Inconsistent Date Format:** Changes from YYYY-MM-DD to DD/MM/YYYY. | **Policy:** Multi-format Parsing. Use a robust date parser (like `date-fns` or `moment` with multiple allowed formats) or try to parse `DD/MM/YYYY` if `YYYY-MM-DD` fails. |
| 20 & 21 | **Multi-Currency (USD instead of INR):** | **Policy:** Currency Conversion. We will normalize all expenses to a base currency (INR) using a fixed exchange rate for the trip (e.g., 1 USD = 83 INR) or store multi-currency balances if required by requirements. For simplicity, we will assume a fixed exchange rate for import. |
| 23 | **Unknown User in Split:** "Dev's friend Kabir". | **Policy:** Guest User Creation. Treat "Kabir" as a guest user for the specific expense, or create a temporary profile that isn't part of the main group. Alternatively, allocate Kabir's share to the person who brought him (Dev). We will allocate to Dev. |
| 24 & 25 | **Conflicting Duplicate/Disputed Amount:** Same dinner at Thalassa logged by Aisha (2400) and Rohan (2450). | **Policy:** Conflict Flagging. Import both but flag them as a "Potential Conflict" for manual review. For this assignment, we will import both. |
| 26 | **Negative Amount:** "-30" for a refund. | **Policy:** Refund Handling. Treat negative amounts as income/refunds. It will reduce the balance of the payer (Dev) and reduce the owed amount of the split users. |
| 27 | **Date Format / Trailing Space:** "Mar 14" and "rohan ". | **Policy:** String Cleaning. Trim all string inputs. Parse "MMM DD" by appending the current year of the surrounding entries (2026). |
| 28 | **Missing Currency:** "2105" with empty currency. | **Policy:** Default Fallback. If currency is missing, default to the group's primary currency (INR). |
| 29 | **Trailing Spaces in Amount:** " 1450 ". | **Policy:** String Cleaning. Trim whitespace before parsing numbers. |
| 31 | **Zero Amount:** "0". | **Policy:** Skip. Ignore expenses with an amount of 0 as they do not affect balances. |
| 34 | **Ambiguous Date Format:** "04/05/2026" (April 5 vs May 4). | **Policy:** Contextual Inference. Based on surrounding dates (Mar 28 before, Apr 1 after), assume MM/DD/YYYY if DD/MM/YYYY breaks chronological order. We'll treat it as May 4 as it's the standard parsing, but based on context it's April 5. We will parse it as April 5th based on sequential ordering. |
| 36 | **User included after moving out:** "Meera" included in April but she moved out end of March. | **Policy:** Historical Membership Validation. The system will check if a user was an active member on the expense date. If not, their share will be redistributed equally among the remaining active members, and a warning will be logged. |
| 42 | **Conflicting Split Type/Details:** `split_type` is equal, but `split_details` has shares. | **Policy:** Details Precedence. If `split_details` exists and provides a valid parseable alternative (like shares), we prioritize the explicit details over the generic `split_type`.

## Database Schema (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    left_at DATE, -- Null means still active
    UNIQUE(group_id, user_id)
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    date DATE NOT NULL,
    split_type VARCHAR(50) NOT NULL, -- 'equal', 'unequal', 'percentage', 'share', 'settlement'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL, -- The exact calculated amount this user owes for this expense
    UNIQUE(expense_id, user_id)
);

CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    paid_by UUID REFERENCES users(id) ON DELETE CASCADE,
    paid_to UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
