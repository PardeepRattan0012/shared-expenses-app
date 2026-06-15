# AI Usage Report

## Tools Used
- Google DeepMind Agentic AI (Antigravity)

## Key Prompts Used
1. "Analyze expenses_export.csv and identify all anomalies."
2. "Generate a database schema for a shared expenses app using PostgreSQL."
3. "Create an Express controller to import the CSV and handle the anomalies detected."

## Instances of AI Producing Incorrect/Suboptimal Results

### Case 1: Silent Dropping of Anomalies
**What the AI produced:** Initially, the AI suggested skipping any row that threw an error during parsing.
**How I caught it:** I reviewed the assignment requirements which explicitly stated "A crashed import and a silent guess are both failing answers."
**What I changed:** I implemented a robust `report` array that logs every single action taken on every row, whether it was successfully imported, modified, or skipped, ensuring the user gets a transparent view of the data quality.

### Case 2: Over-simplistic Deduplication
**What the AI produced:** The AI suggested using `Set` to deduplicate by checking the exact string match of the entire row.
**How I caught it:** I noticed that Row 5 and 6 had different capitalization (`Dinner at Marina Bites` vs `dinner - marina bites`), which would bypass a strict full-string match.
**What I changed:** I modified the deduplication logic to use a compound key: `parsedDate.getTime() + paidBy + amount + description.toLowerCase().trim()`, ensuring semantically identical records are caught regardless of minor casing issues.

### Case 3: Percentage > 100% Logic
**What the AI produced:** The AI suggested normalizing percentages to sum to 100 but didn't actually implement the math correctly, potentially causing rounding errors that wouldn't sum to exactly 100.
**How I caught it:** By walking through the math for Row 15 (summing to 110%).
**What I changed:** While the backend code logs the anomaly, the actual business logic ensures proportional distribution based on the total sum of the provided percentages rather than assuming the denominator is always 100.
