
// Завантаження змінних середовища для тестів
dotenv.config({ path: '.env.test' });

// Глобальні моки для тестів
global.fetch = jest.fn();

// Налаштування timeouts для тестів
jest.setTimeout(30000);

// Mock консолі для чистих тестів
const originalConsole = global.console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});
