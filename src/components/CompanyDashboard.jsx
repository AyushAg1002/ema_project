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

    const getStatusBadge = (status, decision) => {
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

        return (
            <span style={{
                backgroundColor: bg,
                color: color,
                padding: '0.25rem 0.75rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                border: `1px solid ${color}`
            }}>
                {label}
            </span>
        )
    }

    const [selectedClaim, setSelectedClaim] = useState(null)

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
                                            {getStatusBadge(claim.status, claim.decision)}
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
                                            Just now
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
