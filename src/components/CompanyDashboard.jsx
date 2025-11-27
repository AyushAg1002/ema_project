import Sidebar from './Sidebar'
import { useState } from 'react'
import ClaimBrief from './ClaimBrief'

export default function CompanyDashboard({ claims }) {
    const [activeView, setActiveView] = useState('dashboard')

    const totalClaims = claims.length
    const pendingInfoCount = claims.filter(c => c.status === 'Pending Info').length

    const triageStats = claims.reduce((acc, claim) => {
        const key = claim.decision
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    const getStatusBadge = (status, decision, claim) => {
        let color = 'hsl(var(--color-text-muted))'
        let bg = 'hsl(var(--color-text-light) / 0.1)'
        let label = status

        if (status === 'Pending Info') {
            color = 'hsl(var(--color-warning))'
            bg = 'hsl(var(--color-warning) / 0.1)'
        } else if (decision === 'Fast Track') {
            color = 'hsl(var(--color-success))'
            bg = 'hsl(var(--color-success) / 0.1)'
            label = 'Fast Track'
        } else if (decision === 'Flagged') {
            color = 'hsl(var(--color-danger))'
            bg = 'hsl(var(--color-danger) / 0.1)'
            label = 'Flagged'
        } else {
            color = 'hsl(var(--color-primary))'
            bg = 'hsl(var(--color-primary) / 0.1)'
            label = 'Standard'
        }

        const tooltip = claim?.lastUpdatedBy
            ? `Updated by ${claim.lastUpdatedBy}\n${new Date(claim.lastUpdatedAt).toLocaleString()}\n${claim.statusReason || ''}`
            : ''

        return (
            <span
                title={tooltip}
                style={{
                    backgroundColor: bg,
                    color: color,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    border: `1px solid ${color}`,
                    cursor: 'help'
                }}>
                {label}
            </span>
        )
    }

    const [selectedClaim, setSelectedClaim] = useState(null)

    // Agent Details Data
    const agentDetails = {
        agent1: {
            name: 'FNOL Intake Agent',
            role: 'First Notice of Loss Intake',
            desc: 'Handles the initial conversation with the customer, extracting key incident details (Date, Time, Description, Injuries) from voice or text input.',
            responsibilities: [
                'Conducts natural language interview',
                'Multilingual Support (English, Spanish, French)',
                'Extracts structured data (JSON) from conversation',
                'Validates critical fields (Drivable, Injuries)',
                'Emits "ClaimInitiated" event'
            ],
            status: 'Listening for new claims...',
            color: 'hsl(var(--color-primary))'
        },
        agent2: {
            name: 'Triage Decision Agent',
            role: 'Complexity Analysis & Routing',
            desc: 'Analyzes the structured claim data to determine the complexity (Fast Track vs Standard) and detects potential fraud risks.',
            responsibilities: [
                'Evaluates damage severity and injury status',
                'Historical Claims Analysis (User History Check)',
                'Determines claim path: Fast Track, Standard, or Flagged',
                'Detects missing critical information',
                'Emits "TriageResult" event'
            ],
            status: 'Active',
            color: 'hsl(var(--color-success))'
        },
        agent3: {
            name: 'Report & Next-Step Agent',
            role: 'Summary Generation',
            desc: 'Compiles all gathered information into a comprehensive Claim Brief and recommends the next best action for the adjuster.',
            responsibilities: [
                'Generates human-readable "Official Report"',
                'Suggests next steps (e.g., "Approve Payment", "Assign Adjuster")',
                'Updates Claim Brief UI',
                'Emits "ClaimBriefUpdated" event'
            ],
            status: 'Active',
            color: 'hsl(var(--color-warning))'
        },
        agent4: {
            name: 'Document Request Agent',
            role: 'Evidence Collection',
            desc: 'Identifies missing evidence based on the claim type and proactively requests it from the customer via the dashboard.',
            responsibilities: [
                'Identifies missing photos, police reports, etc.',
                'Triggers "Action Required" on Customer Dashboard',
                'Monitors upload status',
                'Emits "DocumentRequest" event'
            ],
            status: 'Monitoring active claims...',
            color: 'hsl(var(--color-danger))'
        },
        agent5: {
            name: 'Document Evaluation Agent',
            role: 'Computer Vision Analysis',
            desc: 'Analyzes uploaded documents (images, PDFs) to validate them against the claim details (e.g., verifying damage location in photos).',
            responsibilities: [
                'Performs image analysis on uploaded photos',
                'Validates document type matches request',
                'Detects inconsistencies (e.g., damage mismatch)',
                'Emits "DocumentEvaluated" event'
            ],
            status: 'Ready for uploads...',
            color: 'hsl(var(--color-primary))'
        },
        agent6: {
            name: 'Customer Update Agent',
            role: 'Communication & Notifications',
            desc: 'Listens to internal system events and translates them into user-friendly notifications for the customer.',
            responsibilities: [
                'Listens to Triage, Document, and Status events',
                'Generates human-readable status messages',
                'Persists notifications to database',
                'Triggers Realtime UI updates and TTS'
            ],
            status: 'Listening to Event Bus...',
            color: 'hsl(var(--color-success))'
        },
        agent7: {
            name: 'Journey Analytics Agent',
            role: 'System Intelligence & Optimization',
            desc: 'Monitors the entire claims journey, tracking speed, satisfaction, and smoothness. Generates aggregate reports for the insurer and emits improvement hints to other agents.',
            responsibilities: [
                'Tracks claim lifecycle metrics (speed, satisfaction)',
                'Generates periodic aggregate reports',
                'Computes settlement estimate averages',
                'Emits AgentImprovementHint events',
                'Monitors agent health and performance'
            ],
            status: 'Aggregating metrics...',
            color: 'hsl(var(--color-warning))'
        }
    }

    if (activeView.startsWith('agent')) {
        const agent = agentDetails[activeView]
        return (
            <div style={{ display: 'flex', height: 'calc(100vh - 80px)', margin: '-2rem -2rem -2rem -2rem' }}>
                <Sidebar activeView={activeView} onViewChange={setActiveView} />
                <div style={{ flex: 1, padding: '3rem', overflowY: 'auto', backgroundColor: 'hsl(var(--color-background))' }}>
                    <div className="card fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{
                                width: '64px', height: '64px',
                                backgroundColor: agent.color,
                                borderRadius: '16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2.5rem', color: 'white'
                            }}>
                                🤖
                            </div>
                            <div>
                                <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>{agent.name}</h2>
                                <div style={{ fontSize: '1.1rem', color: 'hsl(var(--color-text-muted))' }}>{agent.role}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ borderBottom: '1px solid hsl(var(--color-border))', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Description</h3>
                            <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>{agent.desc}</p>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ borderBottom: '1px solid hsl(var(--color-border))', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Key Responsibilities</h3>
                            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {agent.responsibilities.map((resp, i) => (
                                    <li key={i} style={{ fontSize: '1rem' }}>{resp}</li>
                                ))}
                            </ul>
                        </div>

                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: 'hsl(var(--color-surface))',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid hsl(var(--color-border))',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-muted))', marginBottom: '0.25rem' }}>Current Status</div>
                                <div style={{ fontWeight: '600', color: 'hsl(var(--color-success))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ width: '8px', height: '8px', backgroundColor: 'currentColor', borderRadius: '50%', display: 'inline-block' }}></span>
                                    {agent.status}
                                </div>
                            </div>
                            <div style={{ fontSize: '3rem', opacity: '0.2' }}>
                                📡
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (selectedClaim) {
        return (
            <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
                <ClaimBrief claimData={selectedClaim} onReset={() => setSelectedClaim(null)} />
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', margin: '-2rem -2rem -2rem -2rem' }}>
            <Sidebar activeView={activeView} onViewChange={setActiveView} />

            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', backgroundColor: 'hsl(var(--color-background))' }}>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Claims Overview</h2>
                        <p style={{ color: 'hsl(var(--color-text-muted))' }}>Monitoring Agent Active • {new Date().toLocaleDateString()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))' }}>TOTAL CLAIMS</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{totalClaims}</div>
                        </div>
                        <div style={{ width: '1px', backgroundColor: 'hsl(var(--color-text-light) / 0.2)' }}></div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))' }}>PENDING ACTION</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: pendingInfoCount > 0 ? 'hsl(var(--color-warning))' : 'inherit' }}>{pendingInfoCount}</div>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <select className="input" style={{ width: 'auto' }}>
                        <option>Filter by Status</option>
                        <option>Fast Track</option>
                        <option>Standard</option>
                        <option>Flagged</option>
                        <option>Pending Info</option>
                    </select>
                    <select className="input" style={{ width: 'auto' }}>
                        <option>Assigned Adjuster</option>
                        <option>Unassigned</option>
                        <option>Me (Senior Adjuster)</option>
                    </select>
                    <select className="input" style={{ width: 'auto' }}>
                        <option>Date Range</option>
                        <option>Today</option>
                        <option>Last 7 Days</option>
                    </select>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                    {['Fast Track', 'Standard', 'Flagged'].map(type => (
                        <div key={type} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--color-text-muted))', marginBottom: '0.25rem' }}>{type}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{triageStats[type] || 0}</div>
                            </div>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                backgroundColor: type === 'Fast Track' ? 'hsl(var(--color-success) / 0.1)' : type === 'Flagged' ? 'hsl(var(--color-danger) / 0.1)' : 'hsl(var(--color-primary) / 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.25rem'
                            }}>
                                {type === 'Fast Track' ? '⚡' : type === 'Flagged' ? '🚩' : '📋'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Claims Table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid hsl(var(--color-text-light) / 0.1)', backgroundColor: 'hsl(var(--color-surface))' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Active Claims</h3>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid hsl(var(--color-text-light) / 0.1)', backgroundColor: 'hsl(var(--color-background))' }}>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase' }}>Claim ID</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase' }}>Claimant / Patient</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase' }}>Next Steps (Agent)</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase' }}>Assigned User</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase' }}>Last Update</th>
                            </tr>
                        </thead>
                        <tbody>
                            {claims.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--color-text-muted))' }}>No claims found.</td>
                                </tr>
                            ) : (
                                [...claims].reverse().map((claim, idx) => (
                                    <tr
                                        key={idx}
                                        style={{ borderBottom: '1px solid hsl(var(--color-text-light) / 0.1)', cursor: 'pointer' }}
                                        className="hover-row"
                                        onClick={() => setSelectedClaim(claim)}
                                    >
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'hsl(var(--color-primary))' }}>
                                            {claim.id}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ fontWeight: '600' }}>{claim.name || 'Unknown User'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))' }}>Policy Holder</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {getStatusBadge(claim.status, claim.decision, claim)}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ fontSize: '0.875rem' }}>
                                                {claim.status === 'Pending Info' ?
                                                    <span style={{ color: 'hsl(var(--color-warning))' }}>⚠️ Awaiting {claim.missingInfo?.join(', ')}</span> :
                                                    claim.decision === 'Fast Track' ? 'Approve Payment' :
                                                        claim.decision === 'Flagged' ? 'Review SIU Report' : 'Assign Adjuster'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                                            Auto-Assigned
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: 'hsl(var(--color-text-muted))' }}>
                                            {claim.lastUpdatedAt ? new Date(claim.lastUpdatedAt).toLocaleString() : 'Just now'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
