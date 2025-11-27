export default function Dashboard({ claimHistory }) {
    const totalClaims = claimHistory.length

    const triageStats = claimHistory.reduce((acc, claim) => {
        acc[claim.decision] = (acc[claim.decision] || 0) + 1
        return acc
    }, {})

    const getStatColor = (type) => {
        switch (type) {
            case 'Fast Track': return 'hsl(var(--color-success))'
            case 'Flagged': return 'hsl(var(--color-danger))'
            default: return 'hsl(var(--color-primary))'
        }
    }

    return (
        <div className="card fade-in">
            <div style={{ marginBottom: '2rem', borderBottom: '1px solid hsl(var(--color-text-light) / 0.2)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Monitoring Agent</h2>
                <p style={{ color: 'hsl(var(--color-text-muted))' }}>Real-time Operational Insights</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div style={{ padding: '1.5rem', backgroundColor: 'hsl(var(--color-background))', borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'hsl(var(--color-text-muted))', marginBottom: '0.5rem' }}>Total Claims</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: '700' }}>{totalClaims}</p>
                </div>

                {['Fast Track', 'Standard', 'Flagged'].map(type => (
                    <div key={type} style={{ padding: '1.5rem', backgroundColor: 'hsl(var(--color-background))', borderRadius: 'var(--radius-lg)' }}>
                        <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: 'hsl(var(--color-text-muted))', marginBottom: '0.5rem' }}>{type}</h3>
                        <p style={{ fontSize: '2.5rem', fontWeight: '700', color: getStatColor(type) }}>
                            {triageStats[type] || 0}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-muted))' }}>
                            {totalClaims > 0 ? Math.round(((triageStats[type] || 0) / totalClaims) * 100) : 0}%
                        </p>
                    </div>
                ))}
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Recent Claims Stream</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {claimHistory.length === 0 ? (
                    <p style={{ color: 'hsl(var(--color-text-muted))', fontStyle: 'italic' }}>No claims processed yet.</p>
                ) : (
                    [...claimHistory].reverse().map((claim, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem',
                            border: '1px solid hsl(var(--color-text-light) / 0.2)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <div>
                                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                    {claim.description.substring(0, 50)}{claim.description.length > 50 ? '...' : ''}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-muted))' }}>
                                    ID: {claim.id || 'N/A'} • {new Date().toLocaleDateString()}
                                </div>
                            </div>
                            <div style={{
                                backgroundColor: getStatColor(claim.decision),
                                color: 'white',
                                padding: '0.25rem 0.75rem',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.875rem',
                                fontWeight: '600'
                            }}>
                                {claim.decision}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
