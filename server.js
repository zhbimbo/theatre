const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const app = express();

app.use(express.json());

// Читаем секретный ключ из файла
const YOOKASSA_SECRET = fs.readFileSync('/etc/secrets/YOOKASSA_SECRET', 'utf8').trim();

// Создание платежа
app.post('/create-payment', async (req, res) => {
    try {
        const response = await fetch('https://api.yookassa.ru/v3/payments', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(YOOKASSA_SECRET).toString('base64'),
                'Content-Type': 'application/json',
                'Idempotence-Key': 'key_' + Date.now()
            },
            body: JSON.stringify({
                amount: { 
                    value: req.body.amount || "500.00", 
                    currency: "RUB" 
                },
                capture: true,
                description: req.body.description || "Билет в Театр Историй",
                confirmation: { 
                    type: "embedded" 
                }
            })
        });
        
        const paymentData = await response.json();
        res.json(paymentData);
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Пингинг для пробуждения
app.get('/ping', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Health check для Render
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'Theatre Payment API' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Payment server running on port ${PORT}`);
});
