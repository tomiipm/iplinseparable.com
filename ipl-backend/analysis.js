const axios = require("axios");

// Pobranie danych rynkowych
async function getMarketData(symbol) {
    try {
        const response = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=50`);
        return response.data.map(candle => ({
            time: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));
    } catch (error) {
        console.error("❌ Błąd pobierania danych rynkowych:", error);
        return [];
    }
}

// Analiza sygnałów kupna/sprzedaży
async function analyzeMarket(symbol) {
    const data = await getMarketData(symbol);
    if (data.length < 20) return { signal: "neutral", tp1: null, tp2: null, sl: null };

    const lastClose = data[data.length - 1].close;
    const previousClose = data[data.length - 2].close;

    let signal = "neutral";
    let tp1 = null;
    let tp2 = null;
    let sl = null;

    if (lastClose > previousClose * 1.002) {
        signal = "buy";
        tp1 = lastClose * 1.004;
        tp2 = lastClose * 1.008;
        sl = lastClose * 0.996;
    } else if (lastClose < previousClose * 0.998) {
        signal = "sell";
        tp1 = lastClose * 0.996;
        tp2 = lastClose * 0.992;
        sl = lastClose * 1.002;
    }

    return { signal, tp1, tp2, sl, price: lastClose, timestamp: new Date().toISOString() };
}

// Test analizy
async function testAnalysis() {
    const result = await analyzeMarket("BTCUSDT");
    console.log("📊 Analiza rynku:", result);
}

testAnalysis();

module.exports = { analyzeMarket };

