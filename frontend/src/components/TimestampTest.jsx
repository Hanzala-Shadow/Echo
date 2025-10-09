import React, { useState, useEffect } from 'react';
import { testTimestampParsing, testMessageSorting, validateTimestamps } from '../utils/timestampTest';

const TimestampTest = () => {
  const [testResults, setTestResults] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  const runTimestampTest = () => {
    setIsTesting(true);
    
    // Simulate different timestamp formats that might come from the backend
    const testMessages = [
      {
        id: 1,
        content: 'Test message 1',
        timestamp: '2025-10-08T10:30:00.000Z', // ISO format
        sender: 'User1'
      },
      {
        id: 2,
        content: 'Test message 2',
        timestamp: '2025-10-08T10:31:00.000Z', // ISO format
        sender: 'User2'
      },
      {
        id: 3,
        content: 'Test message 3',
        timestamp: new Date().toISOString(), // Current time in ISO format
        sender: 'User3'
      },
      {
        id: 4,
        content: 'Test message 4',
        timestamp: Date.now(), // Timestamp number
        sender: 'User4'
      }
    ];

    // Test timestamp parsing
    const parsingResults = testMessages.map(msg => ({
      ...msg,
      parsedTimestamp: testTimestampParsing(msg.timestamp)
    }));

    // Test message sorting
    const sortedMessages = testMessageSorting(testMessages);

    // Validate timestamps
    const validationResults = validateTimestamps(testMessages);

    setTestResults({
      parsingResults,
      sortedMessages,
      validationResults
    });
    
    setIsTesting(false);
  };

  useEffect(() => {
    // Run test automatically when component mounts
    runTimestampTest();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Timestamp Format Test</h2>
      
      <button 
        onClick={runTimestampTest}
        disabled={isTesting}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        {isTesting ? 'Testing...' : 'Run Timestamp Test'}
      </button>
      
      {testResults && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Validation Results</h3>
            <pre className="bg-gray-100 p-2 rounded">
              {JSON.stringify(testResults.validationResults, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">Parsed Timestamps</h3>
            <div className="space-y-2">
              {testResults.parsingResults.map(result => (
                <div key={result.id} className="bg-gray-100 p-2 rounded">
                  <p><strong>Message:</strong> {result.content}</p>
                  <p><strong>Original:</strong> {String(result.timestamp)}</p>
                  <p><strong>Parsed:</strong> {result.parsedTimestamp.toISOString()}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">Sorted Messages</h3>
            <div className="space-y-2">
              {testResults.sortedMessages.map((msg, index) => (
                <div key={msg.id} className="bg-green-100 p-2 rounded">
                  <p><strong>Order:</strong> {index + 1}</p>
                  <p><strong>Message:</strong> {msg.content}</p>
                  <p><strong>Timestamp:</strong> {testTimestampParsing(msg.timestamp).toISOString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimestampTest;