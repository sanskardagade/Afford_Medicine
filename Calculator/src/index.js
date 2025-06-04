const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 9876;
const MAX_WINDOW = 10;
const TIMEOUT_MS = 500;
app.use(cors());
app.use(express.json());

// Data structures for maintaining number window
const uniqueNumbers = new Set();
const numberWindow = [];

// Helper function to compute mean
const computeMean = (arr) => {
    if (!arr.length) return 0;
    const total = arr.reduce((sum, val) => sum + val, 0);
    return (total / arr.length).toFixed(2);
};

// API configuration
const apiConfig = {
    'p': 'http://20.244.56.144/evaluation-service/primes',
    'f': 'http://20.244.56.144/evaluation-service/fibo',
    'e': 'http://20.244.56.144/evaluation-service/even',
    'r': 'http://20.244.56.144/evaluation-service/rand'
};

// Function to retrieve numbers from external API
const getNumbersFromAPI = async (numberType, token) => {
    try {
        const result = await axios({
            method: 'get',
            url: apiConfig[numberType],
            timeout: TIMEOUT_MS,
            headers: {
                'Authorization': token,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        return result.data?.numbers || [];
    } catch (err) {
        console.error(`API Error for ${numberType}:`, err.message);
        return [];
    }
};

// Function to update number window
const updateNumberWindow = (newNumbers) => {
    for (const num of newNumbers) {
        if (!uniqueNumbers.has(num)) {
            uniqueNumbers.add(num);
            numberWindow.push(num);
            
            if (numberWindow.length > MAX_WINDOW) {
                const oldest = numberWindow.shift();
                uniqueNumbers.delete(oldest);
            }
        }
    }
};

// Main API endpoint
app.get('/numbers/:type', async (req, res) => {
    const numberType = req.params.type;
    const authToken = req.headers.authorization;
    
    if (!authToken) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!Object.keys(apiConfig).includes(numberType)) {
        return res.status(400).json({ error: 'Invalid number type' });
    }

    const previousWindow = [...numberWindow];
    const apiNumbers = await getNumbersFromAPI(numberType, authToken);
    updateNumberWindow(apiNumbers);

    const response = {
        windowPrevState: previousWindow,
        windowCurrState: [...numberWindow],
        numbers: apiNumbers,
        avg: computeMean(numberWindow)
    };

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 