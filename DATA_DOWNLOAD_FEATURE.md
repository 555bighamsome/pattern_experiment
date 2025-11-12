# Data Download Feature

## Overview
Added a comprehensive data download feature that appears when participants complete all experiment trials.

## What Was Added

### 1. Completion Modal (task.html)
A beautiful modal that displays when the experiment is complete, showing:
- Congratulatory message
- Final score (points earned / max points)
- Download button to save experiment data

### 2. CSS Styling (styles.css)
Modern, animated modal with:
- Smooth fade-in and slide-up animations
- Responsive design
- Professional blue gradient header
- Clear call-to-action button

### 3. Download Function (task.js)
`downloadExperimentData()` function that:
- Collects all trial data from `allTrialsData`
- Adds metadata (timestamp, browser info, screen size)
- Calculates summary statistics
- Downloads as formatted JSON file
- Filename includes timestamp: `pattern_experiment_data_2024-11-12T10-30-45.json`

## Data Structure

The downloaded JSON file contains:

```json
{
  "metadata": {
    "experimentName": "Pattern DSL Experiment",
    "completionTime": "2024-11-12T10:30:45.123Z",
    "totalPoints": 85,
    "maxPoints": 100,
    "trialsCompleted": 18,
    "browserInfo": {
      "userAgent": "Mozilla/5.0...",
      "language": "en-US",
      "screenWidth": 1920,
      "screenHeight": 1080
    }
  },
  "trials": [
    {
      "trialIndex": 0,
      "targetPattern": [...],
      "steps": [...],
      "operations": [...],
      "stepsCount": 5,
      "timeSpent": 45000,
      "success": true,
      "pointsEarned": 5,
      "intervalFromLast": 3456,
      "undoActions": [...],
      "favoriteActions": [...],
      "previewActions": [...],
      "workflowActions": [...]
    },
    ...
  ],
  "summary": {
    "totalSteps": 120,
    "successfulTrials": 16,
    "totalTimeSpent": 900000,
    "averageStepsPerTrial": "6.67"
  }
}
```

## User Experience Flow

1. **Complete All Trials** → Last trial submitted
2. **Completion Modal Appears** → Shows final score with celebration emoji 🎉
3. **Click Download Button** → JSON file downloads automatically
4. **Success Toast** → "Data downloaded successfully!" message appears

## Technical Details

### File Naming
- Format: `pattern_experiment_data_YYYY-MM-DDTHH-MM-SS.json`
- Example: `pattern_experiment_data_2024-11-12T10-30-45.json`
- Uses ISO timestamp with colons/dots replaced by dashes for compatibility

### Browser Compatibility
- Uses standard Blob API (supported in all modern browsers)
- Creates temporary object URL for download
- Cleans up URL after download to prevent memory leaks

### Data Included
All enhanced cognitive science data tracking:
- ✅ Step interval timing (`intervalFromLast`)
- ✅ Undo/reset actions (`undoActions`)
- ✅ Favorite interactions (`favoriteActions`)
- ✅ Preview decisions (`previewActions`)
- ✅ Workflow navigation (`workflowActions`)
- ✅ Trial metadata and patterns
- ✅ Browser and screen information
- ✅ Summary statistics

## Testing

To test the feature:

1. Start the experiment
2. Complete all trials (or modify `getTotalTrials()` to return 1 for quick testing)
3. Submit the last trial answer
4. Verify completion modal appears
5. Click "Download Your Data" button
6. Check Downloads folder for JSON file
7. Verify file content is valid JSON with all expected fields

## Future Enhancements (Optional)

### Server Upload
```javascript
async function uploadExperimentData(data) {
    const response = await fetch('/api/experiment-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}
```

### CSV Export
Add alternative download format for spreadsheet analysis:
```javascript
function downloadExperimentDataCSV() {
    const csvRows = [];
    // Convert trials to CSV format
    // ...
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    // ... download logic
}
```

### Email Option
Allow participants to email data to themselves:
```javascript
function emailDataToParticipant(email) {
    // Send data via email service
}
```

## Notes

- Modal cannot be closed by user (intentional design for data collection)
- Download can be triggered multiple times (no limit)
- All trial data is preserved in memory until page reload
- File size typically 50-500 KB depending on trials completed
- No server required - pure client-side download

## Styling Customization

The modal can be customized via CSS variables:
```css
.completion-header {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    /* Change gradient colors here */
}
```

Button colors use existing CSS variables from `styles.css`:
- `--color-primary` for button background
- `--color-primary-strong` for button hover

---

**Status**: ✅ Fully implemented and tested
**Files Modified**: 
- `routes/task.html` - Added completion modal HTML
- `css/styles.css` - Added modal styling
- `js/task.js` - Added download function
