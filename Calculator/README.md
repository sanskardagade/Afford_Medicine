# Average Calculator Microservice

This microservice calculates averages of different types of numbers (prime, Fibonacci, even, and random) while maintaining a sliding window of unique numbers.

## Features

- Maintains a window of unique numbers (window size: 10)
- Supports multiple number types:
  - Prime numbers (p)
  - Fibonacci numbers (f)
  - Even numbers (e)
  - Random numbers (r)
- Handles timeouts and errors gracefully
- Returns previous and current window states with averages

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on http://localhost:9876

## API Usage

### Endpoint
```
GET /numbers/{type}
```

Where `{type}` can be:
- `p` for prime numbers
- `f` for Fibonacci numbers
- `e` for even numbers
- `r` for random numbers

### Example Request
```
GET http://localhost:9876/numbers/e
```

### Example Response
```json
{
    "windowPrevState": [],
    "windowCurrState": [2, 4, 6, 8],
    "numbers": [2, 4, 6, 8],
    "avg": "5.00"
}
```

## Response Format

- `windowPrevState`: Array of numbers in the window before the current request
- `windowCurrState`: Array of numbers in the window after the current request
- `numbers`: Array of numbers received from the test server
- `avg`: Average of the current window numbers (formatted to 2 decimal places) 