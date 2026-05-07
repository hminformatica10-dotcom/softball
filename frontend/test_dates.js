const startDate = '';
const endDate = '';
const filterYear = '';
const singleDate = '2026-04-08';

const isDateInRange = (dateString) => {
    if (!startDate && !endDate && !filterYear && !singleDate) return true;

    let itemDate = new Date(dateString);
    if (dateString && dateString.includes('T00:00:00.000Z')) {
        itemDate = new Date(dateString.split('T')[0] + 'T00:00:00');
    } else if (dateString && dateString.length === 10 && dateString.includes('-')) {
        itemDate = new Date(dateString + 'T00:00:00');
    }
    
    if (isNaN(itemDate.getTime())) return false; // Fail gracefully on bad dates

    const itemYYYY = itemDate.getFullYear();
    const itemMM = String(itemDate.getMonth() + 1).padStart(2, '0');
    const itemDD = String(itemDate.getDate()).padStart(2, '0');
    const itemDateStr = `${itemYYYY}-${itemMM}-${itemDD}`;

    if (singleDate) {
      return itemDateStr === singleDate;
    }
    return false;
};

console.log("DB Date format 1:", isDateInRange("2026-04-08T14:30:00Z")); // Expected: true
console.log("DB Date format 2:", isDateInRange("2026-04-08T00:00:00.000Z")); // Expected: true
console.log("DB Date format 3:", isDateInRange("2026-04-08")); // Expected: true
