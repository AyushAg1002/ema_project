export default function Sidebar({ activeView, onViewChange }) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'claims', label: 'All Claims', icon: '📑' },
        { id: 'documents', label: 'Document Centre', icon: '📁' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ]

    return (
        <div style={{
            width: '250px',
            backgroundColor: 'hsl(var(--color-surface))',
            borderRight: '1px solid hsl(var(--color-text-light) / 0.1)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            height: '100%'
        }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: 'hsl(var(--color-primary))',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                }}>E</div>
                <span style={{ fontWeight: '700', fontSize: '1.25rem' }}>Ema Agent</span>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            backgroundColor: activeView === item.id ? 'hsl(var(--color-primary) / 0.1)' : 'transparent',
                            color: activeView === item.id ? 'hsl(var(--color-primary))' : 'hsl(var(--color-text-main))',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontWeight: activeView === item.id ? '600' : '400',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span>{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid hsl(var(--color-text-light) / 0.1)' }}>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))' }}>
                    Logged in as<br />
                    <strong>Senior Adjuster</strong>
                </div>
            </div>
        </div>
    )
}
