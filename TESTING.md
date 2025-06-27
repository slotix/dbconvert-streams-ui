# Testing Setup

## Playwright Tests

### Prerequisites

1. **Set up API key**: Run the app manually first and enter your API key:
   ```bash
   yarn dev
   # Open http://localhost:5173 and enter your API key
   # This creates tests/.auth/user.json with your API key
   ```

2. **The tests will automatically read the API key from the stored auth file**

### Running Tests

```bash
# Start the development server
yarn dev

# In another terminal, run tests (no API key setup needed!)
yarn test
```

### Test Commands

- `yarn test` - Run all tests (headless)
- `yarn test:headed` - Run with visible browser
- `yarn test:ui` - Interactive test UI
- `yarn test:debug` - Debug mode with inspector

### How It Works

- Tests automatically read your API key from `tests/.auth/user.json`
- This file is created when you log in manually to the app
- The file is excluded from git for security
- No environment variables needed!

### Security

- API key is never committed to git
- Authentication state is reused from manual login
- The `.auth/` directory is excluded from version control 