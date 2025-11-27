import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// Enable CORS for your frontend
app.use(cors({
    origin: 'http://localhost:5173'
}));

app.use(express.json());

// Proxy endpoint for OpenAI chat completions
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, apiKey } = req.body;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: messages,
                response_format: { type: "json_object" },
                temperature: 0.7
            })
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy endpoint for OpenAI report generation
app.post('/api/report', async (req, res) => {
    try {
        const { messages, apiKey } = req.body;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: messages,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Backend server running on http://localhost:${PORT}`);
    console.log(`Frontend can now make API calls through this server`);
});
