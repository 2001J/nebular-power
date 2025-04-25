import axios from 'axios';

// Create axios instance with base URL
// Use relative URL instead of absolute to go through Next.js proxy
const apiClient = axios.create({
  baseURL: '', // Empty baseURL to use relative URLs that go through Next.js proxy
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Define the API test function
const testLogsAPI = async () => {
  try {
    // Get the token - this is important for authenticated requests
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    if (!token) {
      console.error("No token available for logs API test");
      return;
    }
    
    console.log("Starting logs API test with token:", token.substring(0, 10) + "...");
    
    // Set up date range for the last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    console.log("Test date range:", {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });
    
    // Make request to the logs time range endpoint
    const response = await apiClient.get('/api/service/logs/time-range', {
      params: { 
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        page: 0,
        size: 20
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
    
    console.log("API Test Response Status:", response.status);
    console.log("API Test Response Type:", typeof response.data);
    
    if (Array.isArray(response.data)) {
      console.log(`API returned an array with ${response.data.length} items`);
      console.log("First item sample:", response.data[0]);
    } else if (response.data && typeof response.data === 'object') {
      if (response.data.content && Array.isArray(response.data.content)) {
        console.log(`API returned paginated data with ${response.data.content.length} items`);
        console.log("Content sample:", response.data.content[0]);
      } else {
        console.log("API returned object without content array:", response.data);
      }
    } else {
      console.log("API returned unexpected data format:", response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error("API Test Error:", error);
    
    if (error.response) {
      console.error("Error Status:", error.response.status);
      console.error("Error Data:", error.response.data);
    }
    
    return null;
  }
};

// Test function for logs with the ISO date format (which works)
const testFormattedDates = async () => {
  try {
    // Get the token
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    if (!token) {
      console.error("No token available for formatted dates test");
      return;
    }
    
    console.log("Starting formatted dates test with token:", token.substring(0, 10) + "...");
    
    // Test with today specifically, using ISO format (this works)
    const todayDate = new Date();
    
    // Format: ISO format (2025-04-25T00:00:00.000Z)
    const format1Start = new Date(todayDate);
    format1Start.setHours(0, 0, 0, 0);
    const format1End = new Date(todayDate);
    format1End.setHours(23, 59, 59, 999);
    
    console.log(`Testing with ISO format:`, {
      start: format1Start.toISOString(),
      end: format1End.toISOString()
    });
    
    try {
      const response = await apiClient.get('/api/service/logs/time-range', {
        params: { 
          start: format1Start.toISOString(),
          end: format1End.toISOString(),
          page: 0,
          size: 50
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });
      
      console.log(`ISO format - Response Status:`, response.status);
      
      if (Array.isArray(response.data)) {
        console.log(`ISO format - Found ${response.data.length} logs`);
        if (response.data.length > 0) {
          console.log(`ISO format - Sample:`, response.data[0]);
          return { name: "ISO", start: format1Start.toISOString(), end: format1End.toISOString() };
        }
      } else if (response.data && response.data.content && Array.isArray(response.data.content)) {
        console.log(`ISO format - Found ${response.data.content.length} logs`);
        if (response.data.content.length > 0) {
          console.log(`ISO format - Sample:`, response.data.content[0]);
          return { name: "ISO", start: format1Start.toISOString(), end: format1End.toISOString() };
        }
      } else {
        console.log(`ISO format - No logs found`);
      }
    } catch (error) {
      console.error(`ISO format - Error:`, error.message);
      if (error.response) {
        console.error(`ISO format - Status:`, error.response.status);
      }
    }
    
    console.log("Could not find logs with ISO format");
    return null;
  } catch (error) {
    console.error("Overall test error:", error);
    return null;
  }
};

// Export the test functions
export { testLogsAPI, testFormattedDates };