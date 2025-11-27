// api/openai-proxy.js
// Vercel Serverless Function for OpenAI API proxy

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { endpoint, apiKey, body } = req.body

    if (!apiKey || !endpoint || !body) {
        return res.status(400).json({ error: 'Missing required fields: endpoint, apiKey, body' })
    }

    try {
        const response = await fetch(`https://api.openai.com/v1${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        })

        const data = await response.json()

        if (!response.ok) {
            return res.status(response.status).json(data)
        }

        res.status(200).json(data)
    } catch (error) {
        console.error('OpenAI API Error:', error)
        res.status(500).json({ error: 'Internal server error', details: error.message })
    }
}
