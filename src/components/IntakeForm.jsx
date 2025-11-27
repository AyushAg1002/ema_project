import { useState } from 'react'

export default function IntakeForm({ onSubmit }) {
    const [formData, setFormData] = useState({
        description: '',
        drivable: '',
        injuries: '',
        severity: ''
    })
    const [errors, setErrors] = useState({})

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }))
        }
    }

    const validate = () => {
        const newErrors = {}
        if (!formData.description.trim()) newErrors.description = 'Please describe the incident.'
        if (!formData.drivable) newErrors.drivable = 'Please select drivable status.'
        if (!formData.injuries) newErrors.injuries = 'Please select injury status.'
        if (!formData.severity) newErrors.severity = 'Please select damage severity.'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (validate()) {
            onSubmit(formData)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="input-group">
                <label className="label" htmlFor="description">Incident Description</label>
                <textarea
                    id="description"
                    name="description"
                    className="textarea"
                    rows="4"
                    placeholder="Describe what happened..."
                    value={formData.description}
                    onChange={handleChange}
                    style={{ borderColor: errors.description ? 'hsl(var(--color-danger))' : undefined }}
                />
                {errors.description && <span style={{ color: 'hsl(var(--color-danger))', fontSize: '0.875rem' }}>{errors.description}</span>}
            </div>

            <div className="input-group">
                <label className="label">Is the vehicle drivable?</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="drivable"
                            value="yes"
                            checked={formData.drivable === 'yes'}
                            onChange={handleChange}
                        />
                        Yes
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="drivable"
                            value="no"
                            checked={formData.drivable === 'no'}
                            onChange={handleChange}
                        />
                        No
                    </label>
                </div>
                {errors.drivable && <span style={{ color: 'hsl(var(--color-danger))', fontSize: '0.875rem' }}>{errors.drivable}</span>}
            </div>

            <div className="input-group">
                <label className="label">Are there any injuries?</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="injuries"
                            value="yes"
                            checked={formData.injuries === 'yes'}
                            onChange={handleChange}
                        />
                        Yes
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="injuries"
                            value="no"
                            checked={formData.injuries === 'no'}
                            onChange={handleChange}
                        />
                        No
                    </label>
                </div>
                {errors.injuries && <span style={{ color: 'hsl(var(--color-danger))', fontSize: '0.875rem' }}>{errors.injuries}</span>}
            </div>

            <div className="input-group">
                <label className="label" htmlFor="severity">Damage Severity (Visual Estimate)</label>
                <select
                    id="severity"
                    name="severity"
                    className="select"
                    value={formData.severity}
                    onChange={handleChange}
                    style={{ borderColor: errors.severity ? 'hsl(var(--color-danger))' : undefined }}
                >
                    <option value="">Select severity...</option>
                    <option value="minor">Minor (Scratches, Dents)</option>
                    <option value="moderate">Moderate (Bumper, Light/Glass)</option>
                    <option value="heavy">Heavy (Structural, Airbags)</option>
                </select>
                {errors.severity && <span style={{ color: 'hsl(var(--color-danger))', fontSize: '0.875rem' }}>{errors.severity}</span>}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Analyze Claim
            </button>
        </form>
    )
}
