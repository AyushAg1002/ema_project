
import { useState, useRef, useEffect } from 'react'
import { transcribeAudio, generateResponse, generateReport } from '../services/openai'

export default function VoiceIntake({ apiKey, onComplete }) {
    const [isRecording, setIsRecording] = useState(false)
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello, this is Ema from Claims Processing. I'm here to help you file your claim. Can you please describe what happened?" }
    ])
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [textInput, setTextInput] = useState('')
    const [interimTranscript, setInterimTranscript] = useState('') // Show what's being captured
    const [extractedData, setExtractedData] = useState({
        incidentType: null,
        dateTime: null,
        location: null,
        injuries: null,
        damage: null,
        drivable: null,
        otherParties: null,
        policeReport: null
    })
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const messagesEndRef = useRef(null)
    const recognitionRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const speak = (text) => {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel()

            const utterance = new SpeechSynthesisUtterance(text)
            utterance.onstart = () => setIsSpeaking(true)
            utterance.onend = () => setIsSpeaking(false)
            utterance.onerror = (e) => {
                console.error("TTS Error:", e)
                setIsSpeaking(false)
            }

            window.speechSynthesis.speak(utterance)
        } else {
            console.warn("Text-to-Speech not supported in this browser.")
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleTextSubmit = async () => {
        if (!textInput.trim()) return

        setIsProcessing(true)
        const userText = textInput.trim()
        setTextInput('')

        const newMessages = [...messages, { role: 'user', content: userText }]
        setMessages(newMessages)

        try {
            // Get AI Response (bypassing audio transcription)
            const result = await generateResponse(newMessages, apiKey)

            // Handle JSON response
            const aiResponse = result.response || "I'm having trouble connecting."
            const newExtracted = result.extracted
            const isComplete = result.is_complete || false

            if (newExtracted) {
                setExtractedData(prev => ({ ...prev, ...newExtracted }))
            }

            const updatedMessages = [...newMessages, { role: 'assistant', content: aiResponse }]
            setMessages(updatedMessages)

            // Speak Response
            speak(aiResponse)

            // Auto-trigger report if AI signals completion
            if (isComplete) {
                setTimeout(() => handleGenerateReport(updatedMessages), 2000)
            }

            setIsProcessing(false)
        } catch (error) {
            console.error("Error in chat loop:", error)
            alert("Error processing message. Please check your API Key.")
            setIsProcessing(false)
        }
    }

    const startRecording = async () => {
        try {
            // Speak initial greeting on first interaction (browsers require user interaction for TTS)
            if (messages.length === 1 && messages[0].role === 'assistant') {
                speak(messages[0].content)
            }

            // Use Web Speech API for on-device transcription
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

            if (!SpeechRecognition) {
                alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.")
                return
            }

            const recognition = new SpeechRecognition()
            recognition.continuous = true
            recognition.interimResults = true // Show interim results
            recognition.lang = 'en-US'

            let finalTranscript = ''

            recognition.onstart = () => {
                setIsRecording(true)
                setInterimTranscript('')
                console.log("Speech recognition started - speak now!")
            }

            recognition.onresult = (event) => {
                let interim = ''

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' '
                        console.log("Final:", transcript)
                    } else {
                        interim += transcript
                    }
                }

                // Show what's being captured in real-time
                setInterimTranscript(interim || finalTranscript)
            }

            recognition.onend = async () => {
                console.log("Speech recognition ended")
                setIsRecording(false)
                setInterimTranscript('')

                if (finalTranscript.trim()) {
                    setIsProcessing(true)

                    // Process the transcribed text
                    const newMessages = [...messages, { role: 'user', content: finalTranscript.trim() }]
                    setMessages(newMessages)

                    try {
                        // Get AI Response
                        const result = await generateResponse(newMessages, apiKey)

                        // Handle JSON response
                        const aiResponse = result.response || "I'm having trouble connecting."
                        const newExtracted = result.extracted
                        const isComplete = result.is_complete || false

                        if (newExtracted) {
                            setExtractedData(prev => ({ ...prev, ...newExtracted }))
                        }

                        const updatedMessages = [...newMessages, { role: 'assistant', content: aiResponse }]
                        setMessages(updatedMessages)

                        // Speak Response
                        speak(aiResponse)

                        // Auto-trigger report if AI signals completion
                        if (isComplete) {
                            setTimeout(() => handleGenerateReport(updatedMessages), 2000)
                        }

                        setIsProcessing(false)
                    } catch (error) {
                        console.error("Error in chat loop:", error)
                        alert("Error processing voice. Please check your API Key.")
                        setIsProcessing(false)
                    }
                }
            }

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error)
                setIsRecording(false)
                setInterimTranscript('')
                if (event.error === 'no-speech') {
                    alert("No speech detected. Please try again and speak clearly.")
                } else if (event.error === 'not-allowed') {
                    alert("Microphone access denied. Please allow microphone access in your browser settings.")
                } else {
                    alert(`Speech recognition error: ${event.error}`)
                }
            }

            recognitionRef.current = recognition
            recognition.start()

        } catch (err) {
            console.error("Error starting speech recognition:", err)
            alert("Could not start speech recognition. Please ensure permissions are granted.")
        }
    }

    const stopRecording = () => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop()
            setIsRecording(false)
        }
    }

    const processAudio = async (audioBlob) => {
        try {
            // 1. Transcribe
            const userText = await transcribeAudio(audioBlob, apiKey)
            if (!userText.trim()) {
                setIsProcessing(false)
                return
            }

            const newMessages = [...messages, { role: 'user', content: userText }]
            setMessages(newMessages)

            // 2. Get AI Response (generateResponse already includes system prompt)
            const result = await generateResponse(newMessages, apiKey)

            // Handle JSON response
            const aiResponse = result.response || "I'm having trouble connecting."
            const newExtracted = result.extracted

            if (newExtracted) {
                setExtractedData(prev => ({ ...prev, ...newExtracted }))
            }

            const updatedMessages = [...newMessages, { role: 'assistant', content: aiResponse }]
            setMessages(updatedMessages)

            // 3. Speak Response
            speak(aiResponse)

            // 4. Check for completion phrase to auto-trigger report
            if (aiResponse.toLowerCase().includes("generating the report")) {
                setTimeout(() => handleGenerateReport(updatedMessages), 2000)
            }

            setIsProcessing(false)
        } catch (error) {
            console.error("Error in chat loop:", error)
            alert("Error processing voice. Please check your API Key.")
        } finally {
            setIsProcessing(false)
        }
    }

    const handleGenerateReport = async (currentMessages) => {
        setIsProcessing(true)
        // If called from button click, currentMessages is an event object. Use state 'messages' in that case.
        const msgsToUse = Array.isArray(currentMessages) ? currentMessages : messages

        try {
            const data = await generateReport(msgsToUse, apiKey)
            // Agent 1: FNOL Package = AI Report + Raw Transcript
            onComplete({
                ...data,
                transcript: msgsToUse
            })
        } catch (error) {
            console.error("Error generating report:", error)
            alert("Failed to generate report.")
            setIsProcessing(false)
        }
    }

    return (
        <div className="voice-intake-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            <h2 style={{ marginBottom: '1rem' }}>Voice Assistant</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}>

                {/* Left: Transcript */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Live Transcript</h3>
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        backgroundColor: 'hsl(var(--color-surface))',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid hsl(var(--color-text-light) / 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                                padding: '0.75rem 1rem',
                                borderRadius: '1rem',
                                backgroundColor: msg.role === 'user' ? 'hsl(var(--color-primary))' : 'hsl(var(--color-background))',
                                color: msg.role === 'user' ? 'white' : 'hsl(var(--color-text-main))',
                                border: msg.role === 'assistant' ? '1px solid hsl(var(--color-text-light) / 0.2)' : 'none',
                                fontSize: '0.9rem',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <strong>{msg.role === 'user' ? 'You' : 'Ema'}:</strong> {msg.content}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isProcessing || isSpeaking}
                            style={{ minWidth: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            {isRecording ? (
                                <><span>⏹</span> Stop Recording</>
                            ) : (
                                <><span>🎤</span> Start Speaking</>
                            )}
                        </button>

                        {isRecording && interimTranscript && (
                            <div style={{
                                color: 'hsl(var(--color-primary))',
                                fontStyle: 'italic',
                                padding: '0.5rem 1rem',
                                backgroundColor: 'hsl(var(--color-primary) / 0.1)',
                                borderRadius: 'var(--radius-md)',
                                flex: 1
                            }}>
                                Capturing: "{interimTranscript}"
                            </div>
                        )}

                        {isProcessing && (
                            <div style={{ color: 'hsl(var(--color-text-muted))', fontStyle: 'italic' }}>
                                Thinking...
                            </div>
                        )}
                        {isSpeaking && (
                            <div style={{ color: 'hsl(var(--color-primary))', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>🔊</span> Speaking...
                            </div>
                        )}
                    </div>

                    {/* Text Input Fallback */}
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                            placeholder="Or type your message here..."
                            disabled={isProcessing}
                            style={{
                                flex: 1,
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid hsl(var(--color-text-light) / 0.3)',
                                fontSize: '0.9rem',
                                backgroundColor: 'hsl(var(--color-surface))',
                                color: 'hsl(var(--color-text-main))'
                            }}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleTextSubmit}
                            disabled={isProcessing || !textInput.trim()}
                            style={{ minWidth: '100px' }}
                        >
                            Send
                        </button>
                    </div>
                </div>

                {/* Right: Live Summary */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Live Details Summary</h3>
                    <div className="card" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            {Object.entries(extractedData).map(([key, value]) => (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--color-text-light) / 0.1)', paddingBottom: '0.5rem' }}>
                                    <span style={{ textTransform: 'capitalize', color: 'hsl(var(--color-text-muted))' }}>
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <span style={{
                                        fontWeight: '600',
                                        color: value ? 'hsl(var(--color-success))' : 'hsl(var(--color-text-light))',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        {value || 'Pending...'}
                                        {value && <span>✅</span>}
                                    </span>
                                </div>
                            ))}

                        </div>

                        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'hsl(var(--color-primary) / 0.1)', borderRadius: 'var(--radius-md)' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'hsl(var(--color-primary))' }}>Agent Status</h4>
                            <p style={{ fontSize: '0.875rem' }}>
                                {isProcessing ? 'Analyzing conversation...' : 'Waiting for input...'}
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Hidden Generate Report Button (Auto-trigger logic can be added later, or keep manual for now) */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => handleGenerateReport(messages)}>
                    Generate Report Manually
                </button>
            </div>
        </div>
    )
}
