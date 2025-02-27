require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const paypal = require("paypal-rest-sdk");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Połączenie z MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ Połączono z MongoDB"))
  .catch(err => console.log("❌ Błąd MongoDB:", err));

// Model użytkownika
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    subscription: { type: String, default: "inactive" } // Domyślnie brak subskrypcji
});

const User = mongoose.model("User", UserSchema);

// Rejestracja użytkownika
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "❌ Użytkownik już istnieje" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        res.json({ message: "✅ Rejestracja zakończona sukcesem!" });
    } catch (error) {
        res.status(500).json({ error: "❌ Błąd rejestracji" });
    }
});

// Logowanie użytkownika
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "❌ Nieprawidłowy email lub hasło" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "❌ Nieprawidłowy email lub hasło" });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: "✅ Zalogowano pomyślnie!", token, subscription: user.subscription });
    } catch (error) {
        res.status(500).json({ error: "❌ Błąd logowania" });
    }
});

// Konfiguracja PayPal
paypal.configure({
    mode: "live", // "sandbox" dla testów
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET
});

// Obsługa płatności PayPal
app.post("/api/paypal", (req, res) => {
    const create_payment_json = {
        intent: "sale",
        payer: {
            payment_method: "paypal"
        },
        redirect_urls: {
            return_url: "https://iplinseparable.com/success",
            cancel_url: "https://iplinseparable.com/cancel"
        },
        transactions: [{
            amount: {
                currency: "USD",
                total: "10.00" // Kwota subskrypcji
            },
            description: "IPL Inseparable - 1 miesiąc subskrypcji"
        }]
    };

    paypal.payment.create(create_payment_json, (error, payment) => {
        if (error) {
            res.status(500).json({ error: "❌ Błąd płatności" });
        } else {
            for (let link of payment.links) {
                if (link.rel === "approval_url") {
                    res.json({ url: link.href });
                }
            }
        }
    });
});

app.get("/api/paypal/success", (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    const execute_payment_json = {
        payer_id: payerId,
        transactions: [{
            amount: {
                currency: "USD",
                total: "30.00"
            }
        }]
    };

    paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
        if (error) {
            res.status(500).json({ error: "❌ Błąd finalizacji płatności" });
        } else {
            // Dodanie subskrypcji do użytkownika
            const user = await User.findOne({ email: req.query.email });
            if (user) {
                user.subscription = "active";
                await user.save();
            }
            res.redirect("https://iplinseparable.com/subscription-success");
        }
    });
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`🚀 Backend działa na porcie ${PORT}`);
});

