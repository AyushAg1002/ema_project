import { useState, useEffect } from 'react'
import { analyzeClaim } from '../utils/triageEngine'

export default function ProcessingView({ claimData, onComplete }) {
    const [currentStep, setCurrentStep] = useState(0)
    const steps = [
        'FNOL Intake Agent: Structuring data...',
        'Triage Decision Agent: Analyzing policy...',
        'Triage Decision Agent: Assessing severity...',
        'Triage Decision Agent: Determining routing...',
        'Claim Brief Assembly Agent: Finalizing...'
    ]

    useEffect(() => {
        if (currentStep < steps.length) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1)
            }, 800) // 800ms per step for effect
            return () => clearTimeout(timer)
        } else {
            // Finished
            const result = analyzeClaim(claimData)
            // Small delay before finishing
            const timer = setTimeout(() => {
                onComplete(result)
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [currentStep, claimData, onComplete])

    return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <div className="spinner" style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid hsl(var(--color-surface-hover))',
                    borderTop: '4px solid hsl(var(--color-primary))',
                    borderRadius: '50%',
                    margin: '0 auto',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Agents Working</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                {steps.map((step, index) => (
                    <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        opacity: index <= currentStep ? 1 : 0.3,
                        transition: 'opacity 0.3s',
                        color: index === currentStep ? 'hsl(var(--color-primary))' : 'hsl(var(--color-text-main))',
                        fontWeight: index === currentStep ? 600 : 400
                    }}>
                        {index < currentStep ? (
                            <span style={{ color: 'hsl(var(--color-success))' }}>✓</span>
                        ) : index === currentStep ? (
                            <span style={{ fontSize: '0.8rem' }}>➤</span>
                        ) : (
                            <span style={{ width: '1rem' }}></span>
                        )}
                        {step}
                    </div>
                ))}
            </div>
        </div>
    )
}
