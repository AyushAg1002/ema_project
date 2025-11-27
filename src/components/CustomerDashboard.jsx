import { useState } from 'react'
import VoiceIntake from './VoiceIntake'

export default function CustomerDashboard({ claims, onUploadDoc, onNewClaim, intakeMode, setIntakeMode, apiKey, setApiKey, handleNewClaim }) {
    const activeClaim = claims.find(c => c.status !== 'Closed')
    const pendingActions = activeClaim?.status === 'Pending Info' ? activeClaim.missingInfo : []

    const getStepStatus = (step) => {
        if (!activeClaim) return 'pending'
        // Mock steps: Submitted -> Under Review -> Waiting for Docs -> Completed
        const status = activeClaim.status
        if (status === 'Pending Info' && step === 'docs') return 'active'
        if (status === 'Processing' && step === 'review') return 'active'
        if (step === 'submitted') return 'completed'
        return 'pending'
    }

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>My Claims</h2>
                {!activeClaim && (
                    <button className="btn btn-primary" onClick={onNewClaim}>
                        + New Claim
                    </button>
                )}
            </div>

            {/* Active Claim Status Tracker */}
            {activeClaim && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Status Card */}
                        <div className="card fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Claim #{activeClaim.id}</h3>
                                <div className={`badge ${activeClaim.status === 'Approved' ? 'badge-success' : activeClaim.status === 'Flagged' ? 'badge-danger' : 'badge-warning'}`}>
                                    {activeClaim.status}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 1rem' }}>
                                {/* Progress Line */}
                                <div style={{ position: 'absolute', top: '12px', left: '2rem', right: '2rem', height: '2px', backgroundColor: 'hsl(var(--color-text-light) / 0.2)', zIndex: 0 }}></div>

                                {['Submitted', 'Under Review', 'Action Required', 'Decision'].map((step, idx) => {
                                    const isActive = (idx === 0) || (activeClaim.status === 'Pending Info' && idx <= 2) || (activeClaim.status !== 'Pending Info' && idx <= 1) || (activeClaim.status === 'Approved' && idx === 3)
                                    return (
                                        <div key={step} style={{ zIndex: 1, textAlign: 'center', backgroundColor: 'hsl(var(--color-background))', padding: '0 0.5rem' }}>
                                            <div style={{
                                                width: '24px', height: '24px', borderRadius: '50%', margin: '0 auto 0.5rem',
                                                backgroundColor: isActive ? 'hsl(var(--color-primary))' : 'hsl(var(--color-text-light))',
                                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem'
                                            }}>
                                                {isActive ? '✓' : idx + 1}
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: isActive ? '600' : '400' }}>{step}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Transcript Viewer (Read-Only) */}
                        <div className="card fade-in" style={{ maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Conversation History</h3>
                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {activeClaim.transcript && activeClaim.transcript.length > 0 ? (
                                    activeClaim.transcript.map((msg, idx) => (
                                        <div key={idx} style={{
                                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                            backgroundColor: msg.role === 'user' ? 'hsl(var(--color-primary))' : 'hsl(var(--color-surface))',
                                            color: msg.role === 'user' ? 'white' : 'hsl(var(--color-text))',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '1rem',
                                            borderBottomRightRadius: msg.role === 'user' ? '0' : '1rem',
                                            borderBottomLeftRadius: msg.role === 'assistant' ? '0' : '1rem',
                                            maxWidth: '80%',
                                            fontSize: '0.9rem'
                                        }}>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: '0.25rem' }}>
                                                {msg.role === 'user' ? 'You' : 'Ema'}
                                            </div>
                                            {msg.content}
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ color: 'hsl(var(--color-text-muted))', fontStyle: 'italic' }}>No transcript available.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Action Required / Doc Center */}
                        <div className="card fade-in" style={{
                            border: pendingActions.length > 0 ? '2px solid hsl(var(--color-warning))' : 'none',
                            backgroundColor: pendingActions.length > 0 ? 'hsl(var(--color-warning) / 0.05)' : 'hsl(var(--color-surface))'
                        }}>
                            <h3 style={{
                                color: pendingActions.length > 0 ? 'hsl(var(--color-warning))' : 'hsl(var(--color-text))',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                {pendingActions.length > 0 ? '⚠️ Action Required' : '✅ Documents'}
                            </h3>

                            {pendingActions.length > 0 ? (
                                <>
                                    <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Please upload the following documents to proceed:</p>
                                    {pendingActions.map(item => (
                                        <div key={item} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '1rem',
                                            backgroundColor: 'hsl(var(--color-background))',
                                            borderRadius: 'var(--radius-md)',
                                            marginBottom: '0.5rem',
                                            boxShadow: 'var(--shadow-sm)'
                                        }}>
                                            <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                                                {item === 'accident_photo' ? 'Photo of Accident Damage' :
                                                    item === 'police_report' ? 'Police Report' : item}
                                            </span>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => onUploadDoc(activeClaim.id, item)}
                                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                                            >
                                                Upload
                                            </button>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--color-text-muted))' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                                    All required documents submitted.
                                </div>
                            )}
                        </div>

                        {/* Live Details Summary (Read-Only) */}
                        <div className="card fade-in">
                            <h3 style={{ marginBottom: '1rem' }}>Claim Details</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <DetailRow label="Incident" value={activeClaim.incidentType} />
                                <DetailRow label="Date/Time" value={activeClaim.dateTime} />
                                <DetailRow label="Location" value={activeClaim.location} />
                                <DetailRow label="Injuries" value={activeClaim.injuries} />
                                <DetailRow label="Damage" value={activeClaim.damage} />
                                <DetailRow label="Drivable" value={activeClaim.drivable} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Voice Assistant Panel (if no active claim) */}
            {!activeClaim && (
                <div className="card fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Start a New Claim</h3>
                        <p style={{ color: 'hsl(var(--color-text-muted))' }}>Use our Voice Assistant to file your claim in minutes.</p>
                    </div>

                    {apiKey ? (
                        <VoiceIntake apiKey={apiKey} onComplete={handleNewClaim} />
                    ) : (
                        <div style={{ padding: '1rem', backgroundColor: 'hsl(var(--color-warning) / 0.1)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            Please enter API Key in settings to use Voice Assistant.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function DetailRow({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid hsl(var(--color-border))', paddingBottom: '0.5rem' }}>
            <span style={{ color: 'hsl(var(--color-text-muted))' }}>{label}</span>
            <span style={{ fontWeight: '500', textAlign: 'right' }}>{value || '—'}</span>
        </div>
    )
}
