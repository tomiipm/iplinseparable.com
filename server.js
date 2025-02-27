require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Połączenie z MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Połączono z bazą danych MongoDB');
}).catch(err => {
    console.error('❌ Błąd połączenia z MongoDB:', err);
});

// Proste API
app.get('/api', (req, res) => {
    res.json({ message: '🔥 API IPL Inseparable działa poprawnie!' });
});


// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
