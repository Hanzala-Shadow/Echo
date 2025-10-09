/**
 * Utility functions for testing timestamp consistency
 */

/**
 * Test timestamp parsing with various formats
 * @param {string|number|Date} timestamp - The timestamp to test
 * @returns {Date|null} Parsed date or null if invalid
 */
export function testTimestampParsing(timestamp) {
  try {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    if (typeof timestamp === 'string') {
      // Try parsing as ISO string first
      const isoDate = new Date(timestamp);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
      
      // Try parsing as timestamp string
      const numTimestamp = parseInt(timestamp, 10);
      if (!isNaN(numTimestamp)) {
        return new Date(numTimestamp);
      }
    }
    
    // Fallback to current time
    return new Date();
  } catch (error) {
    console.error('Error parsing timestamp:', timestamp, error);
    return new Date();
  }
}

/**
 * Test message sorting with various timestamp formats
 * @param {Array} messages - Array of message objects
 * @returns {Array} Sorted messages
 */
export function testMessageSorting(messages) {
  return [...messages].sort((a, b) => {
    const dateA = testTimestampParsing(a.timestamp);
    const dateB = testTimestampParsing(b.timestamp);
    return dateA - dateB;
  });
}

/**
 * Validate that all timestamps in messages are properly formatted
 * @param {Array} messages - Array of message objects
 * @returns {Object} Validation result
 */
export function validateTimestamps(messages) {
  const results = {
    total: messages.length,
    valid: 0,
    invalid: 0,
    formats: new Set()
  };
  
  messages.forEach(msg => {
    try {
      const parsed = testTimestampParsing(msg.timestamp);
      if (parsed && !isNaN(parsed.getTime())) {
        results.valid++;
        // Store the original format for analysis
        results.formats.add(typeof msg.timestamp);
      } else {
        results.invalid++;
      }
    } catch (error) {
      results.invalid++;
    }
  });
  
  return results;
}

// Example usage:
// const testMessages = [
//   { id: 1, timestamp: '2025-10-08T10:30:00.000Z' },
//   { id: 2, timestamp: '2025-10-08T10:31:00.000Z' },
//   { id: 3, timestamp: 1759949400000 },
//   { id: 4, timestamp: new Date() }
// ];
// 
// console.log('Validation:', validateTimestamps(testMessages));
// console.log('Sorted:', testMessageSorting(testMessages));