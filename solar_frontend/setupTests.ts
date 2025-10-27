import '@testing-library/jest-dom';

// MSW server setup for API tests
import { server } from './test/mocks/server';

// Establish API mocking before all tests.
beforeAll(() => {
  // In case tests alter handlers, we enable once before all
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset any runtime request handlers we may add during the tests.
afterEach(() => {
  server.resetHandlers();
});

// Clean up after the tests are finished.
afterAll(() => {
  server.close();
});

