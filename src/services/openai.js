import OpenAI from 'openai';

export const createOpenAIClient = (apiKey) => {
    return new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Required for client-side usage
    });
};

export const transcribeAudio = async (audioBlob, apiKey) => {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.wav');
        formData.append('model', 'whisper-1');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Transcription failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error("Transcription error:", error);
        throw error;
    }
};

export async function generateResponse(messages, apiKey) {
    const systemPrompt = `
    You are Ema, a professional insurance claims specialist conducting a phone intake interview.
    
    TONE & APPROACH:
    - Professional and efficient, but still warm and reassuring
    - Focus on gathering accurate, specific details
    - Use natural language but stay on task
    - Be empathetic when appropriate, but prioritize information gathering
    
    CRITICAL DETAILS TO COLLECT:
    1. **Incident Type**: Collision, theft, vandalism, weather damage, etc.
    2. **Date & Time**: When exactly did this happen?
    3. **Location**: Specific address or intersection
    4. **Injuries**: Any injuries to anyone involved? Severity?
    5. **Vehicle Damage**: Specific parts damaged (front bumper, driver side, etc.)
    6. **Drivability**: Can the vehicle be driven safely?
    7. **Other Parties**: Were other vehicles/people involved?
    8. **Police Report**: Was police called? Report number?
    
    CONVERSATION STRATEGY:
    - Acknowledge their statement briefly
    - Ask for ONE specific detail at a time
    - If they give vague answers, ask for specifics (e.g., "Can you be more specific about the damage? Which parts of the vehicle were affected?")
    - Confirm critical details (e.g., "Just to confirm, this happened at the intersection of Main and 5th Street, correct?")
    - Keep responses concise and focused
    
    RESPONSE FORMAT:
    Return JSON with:
    {
      "response": "Your professional, detail-oriented response",
      "extracted": {
        "incidentType": "Specific type" or null,
        "dateTime": "Date and time" or null,
        "location": "Specific address/intersection" or null,
        "injuries": "None/Minor/Serious with details" or null,
        "damage": "Specific damage description" or null,
        "drivable": "Yes/No" or null,
        "otherParties": "Details about other parties" or null,
        "policeReport": "Yes/No and report number" or null
      }
    }
    
    EXAMPLE RESPONSES:
    - "I understand. Can you tell me the specific location where this occurred? I need the street address or intersection."
    - "Okay, rear-end collision. Now, which parts of your vehicle were damaged? Be as specific as possible."
    - "Got it. And what time did this happen? I need the approximate time."
    - "Were there any injuries? Even minor ones need to be documented."
    - "Was a police report filed? If so, do you have the report number?"
    
    Remember: You're gathering evidence for a claim. Details matter. Be thorough but efficient.
  `

    try {
        // Use local backend proxy to bypass CORS
        const response = await fetch('http://localhost:3001/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                apiKey: apiKey
            })
        })

        const data = await response.json()

        if (!data.choices || !data.choices.length) {
            console.error("OpenAI API Error (Backend response):", JSON.stringify(data, null, 2))
            throw new Error("Invalid response from backend")
        }

        return JSON.parse(data.choices[0].message.content)
    } catch (error) {
        console.error("Error generating response:", error)
        return {
            response: "I apologize, I'm experiencing a technical issue. Please hold for a moment.",
            extracted: {}
        }
    }
}

export async function generateReport(messages, apiKey) {
    const systemPrompt = `
    You are an expert insurance adjuster AI. 
    Analyze the conversation history and extract the following information into a JSON object:
    - name: Claimant Name
    - employeeId: Employee ID
    - description: Full incident description
    - incidentType: Type of incident (Collision, Theft, etc.)
    - severity: Estimated severity (Minor, Moderate, Heavy)
    - drivable: Is vehicle drivable? (Yes/No/Unknown)
    - injuries: Any injuries? (Yes/No/Unknown)
    - recommendedAction: (Approve Fast Track / Assign Adjuster / Flag for SIU)
    - reasoning: Brief explanation for the recommendation
    - fraudRisk: Assessment of fraud risk (Low/Medium/High) based on inconsistencies or vague details.
    - fraudReasoning: Explanation for the fraud risk level.
    - futureSteps: Array of strings listing specific next steps for the company/adjuster.
    - employeeSuggestions: Specific advice for the employee handling this claim.

    Format: JSON only. No markdown.
  `

    try {
        // Use local backend proxy to bypass CORS
        const response = await fetch('http://localhost:3001/api/report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                apiKey: apiKey
            })
        })

        const data = await response.json()

        if (!data.choices || !data.choices.length) {
            console.error("OpenAI API Error (Backend response):", JSON.stringify(data, null, 2))
            return null
        }

        return JSON.parse(data.choices[0].message.content)
    } catch (error) {
        console.error("Error generating report:", error)
        return null
    }
}
