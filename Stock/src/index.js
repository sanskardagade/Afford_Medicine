const axios = require('axios');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 9876;
const HOST = 'localhost';
const stockData = {};

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

function getLastMinsData(data, m) {
    const now = new Date();
    return data.filter(entry => {
        const entryTime = new Date(entry.lastUpdatedAt);
        const diffMinutes = (now.getTime() - entryTime.getTime()) / 60000;
        return diffMinutes <= m;
    });
}

function calculatePearsonCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const avgX = x.reduce((a, b) => a + b, 0) / n;
    const avgY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0, denomX = 0, denomY = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - avgX;
        const dy = y[i] - avgY;
        numerator += dx * dy;
        denomX += dx ** 2;
        denomY += dy ** 2;
    }

    return denomX && denomY ? numerator / Math.sqrt(denomX * denomY) : 0;
}

async function fetchStockPrices(ticker, minutes) {
    try {
        const url = `http://20.244.56.144/evaluation-service/stocks/${ticker}?minutes=${minutes}`;
        const response = await axios.get(url, { timeout: 5000 }); // Add timeout
        const data = response.data;

        if (!data || !data.priceHistory) {
            throw new Error('Invalid response format from stock service');
        }

        stockData[ticker] = data.priceHistory.map(entry => ({
            price: entry.price,
            lastUpdatedAt: entry.lastUpdatedAt,
        }));
    } catch (error) {
        console.error(`Error fetching stock prices for ${ticker}:`, error.message);
        throw error;
    }
}

app.get('/stocks/:ticker', async (req, res) => {
    const ticker = req.params.ticker;
    const m = parseInt(req.query.minutes);
    const aggregation = req.query.aggregation;

    if (!ticker || isNaN(m) || aggregation !== 'average') {
        res.status(400).json({ error: 'Invalid parameters' });
        return;
    }

    try {
        await fetchStockPrices(ticker, m);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stock data' });
        return;
    }

    const data = getLastMinsData(stockData[ticker] || [], m);
    const avg = data.reduce((sum, p) => sum + p.price, 0) / (data.length || 1);

    const response = {
        averageStockPrice: parseFloat(avg.toFixed(6)),
        priceHistory: data,
    };

    res.json(response);
});

app.get('/stockcorrelation', async (req, res) => {
    const m = parseInt(req.query.minutes);
    const tickersRaw = req.query.ticker;

    if (!tickersRaw) {
        res.status(400).json({ error: 'Missing ticker parameters' });
        return;
    }

    const tickers = Array.isArray(tickersRaw)
        ? tickersRaw.map(t => String(t))
        : [String(tickersRaw)];

    if (isNaN(m) || !tickers || tickers.length !== 2 || tickers.includes("string")) {
        res.status(400).json({ error: 'Invalid parameters' });
        return;
    }

    const [t1, t2] = tickers;

    try {
        await Promise.all([
            fetchStockPrices(t1, m),
            fetchStockPrices(t2, m),
        ]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stock data' });
        return;
    }

    const d1 = getLastMinsData(stockData[t1] || [], m);
    const d2 = getLastMinsData(stockData[t2] || [], m);

    const avg1 = d1.reduce((sum, p) => sum + p.price, 0) / (d1.length || 1);
    const avg2 = d2.reduce((sum, p) => sum + p.price, 0) / (d2.length || 1);

    const corr = calculatePearsonCorrelation(d1.map(p => p.price), d2.map(p => p.price));

    const response = {
        correlation: parseFloat(corr.toFixed(4)),
        stocks: {
            [t1]: { averagePrice: parseFloat(avg1.toFixed(6)), priceHistory: d1 },
            [t2]: { averagePrice: parseFloat(avg2.toFixed(6)), priceHistory: d2 },
        },
    };

    res.json(response);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
    console.log('Available endpoints:');
    console.log('- GET /health');
    console.log('- GET /stocks/:ticker?minutes=<number>&aggregation=average');
    console.log('- GET /stockcorrelation?minutes=<number>&ticker=<ticker1>&ticker=<ticker2>');
});