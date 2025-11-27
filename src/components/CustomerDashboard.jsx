import { useState } from 'react'
import VoiceIntake from './VoiceIntake'
import CustomerNotifications from './CustomerNotifications'
import Sidebar from './Sidebar'

export default function CustomerDashboard({ claims, onUploadDoc, onNewClaim, intakeMode, setIntakeMode, apiKey, setApiKey, handleNewClaim, selectedClaimId, onSelectClaim }) {
    // Use selectedClaimId from props, or find first active claim
    const activeClaim = selectedClaimId
        ? claims.find(c => c.id === selectedClaimId)
        : claims.find(c => c.status !== 'Closed')

    const pendingActions = activeClaim?.status === 'Pending Info' ? activeClaim.missingInfo : []

    const getStepStatus = (step) => {
        if (!activeClaim) return 'pending'
        const status = activeClaim.status
        if (status === 'Pending Info' && step === 'docs') return 'active'
        if (status === 'Processing' && step === 'review') return 'active'
        if (step === 'submitted') return 'completed'
        return 'pending'
    }

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', margin: '-2rem' }}>
            <Sidebar
                activeView={activeClaim?.id || 'new'}
                onViewChange={() => { }}
                role="customer"
                claims={claims}
                onSelectClaim={onSelectClaim}
                onNewClaim={onNewClaim}
            />

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                {activeClaim && <CustomerNotifications customerPseudonym={`cust-${activeClaim.id}`} />}

                {/* Active Claim Status Tracker */}
                {activeClaim && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Status Card */}
                            <div className="card fade-in" aria-live="polite">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 0.5rem 0' }}>Claim #{activeClaim.id}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ color: 'hsl(var(--color-text-muted))', fontSize: '0.9rem' }}>Status:</span>
                                            <span className={`badge ${activeClaim.status === 'Approved' ? 'badge-success' : activeClaim.status === 'Flagged' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '1rem' }}>
                                                {activeClaim.status}
                                            </span>
                                        </div>
                                    </div>
                                    {activeClaim.lastUpdatedBy && (
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))' }}>Updated by</span>
                                                <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', backgroundColor: 'hsl(var(--color-primary))', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>
                                                    🤖 {activeClaim.lastUpdatedBy.replace(' Agent', '').toUpperCase()}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))' }}>
                                                {new Date(activeClaim.lastUpdatedAt).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {activeClaim.statusReason && (
                                    <div style={{
                                        padding: '0.75rem',
                                        backgroundColor: 'hsl(var(--color-background))',
                                        borderRadius: 'var(--radius-sm)',
                                        borderLeft: '3px solid hsl(var(--color-primary))',
                                        marginBottom: '1.5rem'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'hsl(var(--color-text))' }}>
                                            {activeClaim.statusReason}
                                        </p>
                                    </div>
                                )}

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
                                backgroundColor: activeClaim.missingInfo?.length > 0 ? 'hsl(var(--color-warning) / 0.05)' : 'hsl(var(--color-surface))',
                                border: activeClaim.missingInfo?.length > 0 ? '2px solid hsl(var(--color-warning))' : '1px solid hsl(var(--color-text-light) / 0.1)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    {activeClaim.missingInfo?.length > 0 && <span style={{ fontSize: '1.5rem' }}>⚠️</span>}
                                    <h3 style={{ margin: 0 }}>Document Upload Center</h3>
                                    <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', backgroundColor: 'hsl(var(--color-success))', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>🤖 AGENT 4</span>
                                </div>

                                {activeClaim.missingInfo && activeClaim.missingInfo.length > 0 ? (
                                    <>
                                        <p style={{ marginBottom: '1.5rem', color: 'hsl(var(--color-warning))' }}>
                                            <strong>Action Required:</strong> Please upload the following documents to proceed with your claim.
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {activeClaim.missingInfo.map((docType, idx) => {
                                                const isUploaded = activeClaim.documents?.includes(docType)
                                                const evaluation = activeClaim.documentEvaluations?.find(e => e.docType === docType)

                                                return (
                                                    <div key={idx} style={{
                                                        padding: '1rem',
                                                        backgroundColor: 'hsl(var(--color-background))',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: `1px solid ${isUploaded ? 'hsl(var(--color-success))' : 'hsl(var(--color-text-light) / 0.2)'}`
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                            <span style={{ fontWeight: '600' }}>{docType}</span>
                                                            {isUploaded && (
                                                                <span style={{
                                                                    fontSize: '0.75rem',
                                                                    padding: '0.25rem 0.75rem',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    backgroundColor: evaluation?.status === 'validated' ? 'hsl(var(--color-success))' :
                                                                        evaluation?.status === 'mismatch' ? 'hsl(var(--color-warning))' :
                                                                            'hsl(var(--color-primary))',
                                                                    color: 'white',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {evaluation?.status === 'validated' ? '✓ Validated' :
                                                                        evaluation?.status === 'mismatch' ? '⚠ Mismatch' :
                                                                            '✓ Uploaded'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {evaluation && evaluation.mismatches && evaluation.mismatches.length > 0 && (
                                                            <div style={{
                                                                padding: '0.75rem',
                                                                backgroundColor: 'hsl(var(--color-warning) / 0.1)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                marginBottom: '0.75rem'
                                                            }}>
                                                                <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: 'hsl(var(--color-warning))' }}>
                                                                    ⚠ Issues Detected:
                                                                </div>
                                                                {evaluation.mismatches.map((m, i) => (
                                                                    <div key={i} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                                                        • {m.type.replace(/_/g, ' ')}: {m.claimed} vs {m.detected}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {!isUploaded && (
                                                            <input
                                                                type="file"
                                                                accept="image/*,application/pdf"
                                                                onChange={(e) => {
                                                                    if (e.target.files && e.target.files[0]) {
                                                                        onUploadDoc(activeClaim.id, docType, e.target.files[0])
                                                                    }
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.5rem',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    border: '1px solid hsl(var(--color-text-light) / 0.3)',
                                                                    cursor: 'pointer'
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <p style={{ color: 'hsl(var(--color-text-muted))' }}>
                                        ✓ All required documents have been submitted.
                                    </p>
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

            function DetailRow({label, value}) {
    return (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid hsl(var(--color-border))', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'hsl(var(--color-text-muted))' }}>{label}</span>
                <span style={{ fontWeight: '500', textAlign: 'right' }}>{value || '—'}</span>
            </div>
            )
}
