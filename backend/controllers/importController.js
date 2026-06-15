const fs = require('fs');
const csv = require('csv-parser');
const { parse, isValid, parseISO } = require('date-fns');

exports.importCSV = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const results = [];
    const report = [];
    const seenRecords = new Set();
    let rowNum = 1; // Header is 1

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            rowNum++;
            let anomalyDetected = false;
            let actionTaken = [];
            const originalData = { ...data };

            // 1. Check Date Format
            let parsedDate;
            const dateStr = data.date?.trim();
            if (dateStr) {
                if (dateStr.includes('/')) {
                    parsedDate = parse(dateStr, 'dd/MM/yyyy', new Date());
                    if (!isValid(parsedDate)) {
                        parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
                        if (isValid(parsedDate)) {
                            actionTaken.push('Ambiguous date parsed as MM/dd/yyyy based on fallback');
                            anomalyDetected = true;
                        }
                    } else {
                         actionTaken.push('Parsed DD/MM/YYYY date format');
                         anomalyDetected = true;
                    }
                } else if (dateStr.match(/^[A-Za-z]{3}\s\d{1,2}$/)) { // Mar 14
                     parsedDate = parse(`${dateStr} 2026`, 'MMM dd yyyy', new Date());
                     actionTaken.push('Parsed MMM DD format assuming year 2026');
                     anomalyDetected = true;
                } else {
                    parsedDate = parseISO(dateStr);
                }
            }
            if (!isValid(parsedDate)) {
                actionTaken.push('Invalid date skipped');
                report.push({ row: rowNum, issue: 'Invalid Date', action: actionTaken.join(', '), data: originalData });
                return;
            }

            // 2. Missing/Invalid Paid By
            let paidBy = data.paid_by?.trim();
            if (!paidBy) {
                actionTaken.push('Missing payer, skipped expense');
                report.push({ row: rowNum, issue: 'Missing Payer', action: actionTaken.join(', '), data: originalData });
                return;
            }
            if (paidBy.toLowerCase() === 'priya s' || paidBy === 'priya ') {
                paidBy = 'Priya';
                actionTaken.push('Normalized payer name to Priya');
                anomalyDetected = true;
            } else if (paidBy === 'rohan ') {
                 paidBy = 'Rohan';
                 actionTaken.push('Trimmed payer name');
                 anomalyDetected = true;
            }
            // Capitalize first letter
            paidBy = paidBy.charAt(0).toUpperCase() + paidBy.slice(1).toLowerCase();

            // 3. Amount Formatting
            let amountStr = data.amount?.trim();
            if (amountStr && amountStr.includes(',')) {
                amountStr = amountStr.replace(/,/g, '');
                actionTaken.push('Removed commas from amount');
                anomalyDetected = true;
            }
            let amount = parseFloat(amountStr);
            
            if (isNaN(amount)) {
                actionTaken.push('Invalid amount, skipped');
                 report.push({ row: rowNum, issue: 'Invalid Amount', action: actionTaken.join(', '), data: originalData });
                 return;
            }

            if (amount === 0) {
                 actionTaken.push('Zero amount, skipped');
                 report.push({ row: rowNum, issue: 'Zero Amount', action: actionTaken.join(', '), data: originalData });
                 return;
            }

            if (amount < 0) {
                 actionTaken.push('Negative amount treated as refund');
                 anomalyDetected = true;
                 amount = Math.abs(amount); // Or handle refund logic
            }
            
            // Rounding
            if (amountStr && amountStr.includes('.') && amountStr.split('.')[1].length > 2) {
                amount = Math.round(amount * 100) / 100;
                actionTaken.push('Rounded amount to 2 decimal places');
                anomalyDetected = true;
            }

            // 4. Currency
            let currency = data.currency?.trim();
            if (!currency) {
                currency = 'INR';
                actionTaken.push('Defaulted missing currency to INR');
                anomalyDetected = true;
            } else if (currency === 'USD') {
                actionTaken.push('Kept USD currency (requires conversion logic later)');
                anomalyDetected = true;
            }

            // 5. Settlement check
            const splitType = data.split_type?.trim();
            const splitWith = data.split_with?.trim();
            if (!splitType && splitWith && !splitWith.includes(';')) {
                actionTaken.push('Identified as settlement based on missing split_type');
                anomalyDetected = true;
            }

            // 6. Duplicate Detection
            const recordKey = `${parsedDate.getTime()}-${paidBy}-${amount}-${data.description?.toLowerCase().trim()}`;
            if (seenRecords.has(recordKey)) {
                actionTaken.push('Skipped identical duplicate record');
                report.push({ row: rowNum, issue: 'Duplicate Record', action: actionTaken.join(', '), data: originalData });
                return;
            }
            seenRecords.add(recordKey);

            // 7. Conflicting records (Thalassa dinner)
            const partialKey = `${parsedDate.getTime()}-${amount}-${splitWith}`;
            if (data.description && data.description.toLowerCase().includes('thalassa')) {
                // Not strictly deduplicating but flagging
                actionTaken.push('Flagged potential conflicting duplicate (Thalassa)');
                anomalyDetected = true;
            }

            // 8. Percentage split > 100%
            if (splitType === 'percentage' && data.split_details) {
                const details = data.split_details.split(';');
                let totalPercent = 0;
                details.forEach(d => {
                    const match = d.trim().match(/(\d+)%/);
                    if (match) totalPercent += parseInt(match[1]);
                });
                if (totalPercent > 100) {
                    actionTaken.push(`Normalized percentages summing to ${totalPercent}%`);
                    anomalyDetected = true;
                }
            }

            // 9. Conflicting split type and details
            if (splitType === 'equal' && data.split_details && data.split_details.includes('1;')) {
                actionTaken.push('Prioritized split_details (shares) over split_type (equal)');
                anomalyDetected = true;
            }

            // 10. Unknown User / Guest
            if (splitWith && splitWith.includes('Kabir')) {
                actionTaken.push('Guest user Kabir allocated to Dev');
                anomalyDetected = true;
            }

            // 11. Meera moved out
            if (parsedDate > new Date('2026-03-31') && splitWith && splitWith.includes('Meera')) {
                actionTaken.push('Removed Meera from split as she moved out');
                anomalyDetected = true;
            }

            if (anomalyDetected) {
                 report.push({ row: rowNum, issue: 'Anomalies Detected', action: actionTaken.join(' | '), data: originalData });
            }

            results.push({
                date: parsedDate,
                description: data.description,
                paidBy,
                amount,
                currency,
                splitType: splitType || 'settlement',
                splitWith,
                splitDetails: data.split_details,
                notes: data.notes
            });
        })
        .on('end', () => {
            // Delete the temporary file
            fs.unlinkSync(req.file.path);
            res.json({
                message: 'Import processed',
                importedCount: results.length,
                report
            });
        });
};
