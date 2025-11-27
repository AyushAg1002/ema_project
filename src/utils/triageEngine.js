export function analyzeClaim(claimData) {
    // Agent 2: Triage Decision Logic
    // Inputs: claimData (from FNOL Agent) containing AI extracted fields

    let decision = 'Standard'
    let rationale = 'Claim requires standard adjuster review.'
    let estimate = '$500 - $1,500'
    let status = 'New'
    let missingInfo = []
    let fraudSignal = claimData.fraudRisk === 'High' || claimData.fraudRisk === 'Medium'
    let nextSteps = claimData.futureSteps || []

    // 1. Check for Missing Documents (Agent 4 Trigger)
    // Rule: All collisions need photos
    if (claimData.incidentType?.toLowerCase().includes('collision') && !claimData.documents?.includes('accident_photo')) {
        missingInfo.push('accident_photo')
    }
    // Rule: Theft needs police report
    if (claimData.incidentType?.toLowerCase().includes('theft') && !claimData.documents?.includes('police_report')) {
        missingInfo.push('police_report')
    }

    // 2. Determine Triage Decision (Fast Track / Standard / Flagged)

    // Priority: Fraud Signals -> Heavy Damage -> Injuries -> Fast Track
    if (fraudSignal) {
        decision = 'Flagged'
        rationale = `Risk Detected: ${claimData.fraudReasoning || 'Inconsistencies found in claim details.'}`
        estimate = 'Under Investigation'
    } else if (claimData.severity === 'Heavy' || claimData.severity === 'heavy') {
        decision = 'Flagged'
        rationale = 'Heavy damage reported. Potential total loss. Senior adjuster required.'
        estimate = '$5,000+'
    } else if (claimData.injuries === 'Yes' || claimData.injuries === 'yes') {
        decision = 'Standard'
        rationale = 'Injuries reported. Medical review required.'
        estimate = 'Pending Medical'
    } else if (claimData.drivable === 'Yes' && claimData.severity === 'Minor') {
        decision = 'Fast Track'
        rationale = 'Drivable vehicle with minor damage. Qualifies for automated processing.'
        estimate = '$300 - $800'
    } else {
        // AI Recommendation Fallback
        if (claimData.recommendedAction?.includes('Fast Track')) {
            decision = 'Fast Track'
            rationale = claimData.reasoning || 'AI recommended Fast Track based on low complexity.'
        } else {
            decision = 'Standard'
            rationale = claimData.reasoning || 'Standard claim complexity.'
        }
    }

    // 3. Status Update
    if (missingInfo.length > 0) {
        status = 'Waiting for Info'
        // Add specific next steps for missing docs
        missingInfo.forEach(doc => {
            const docName = doc.replace('_', ' ')
            if (!nextSteps.includes(`Request ${docName}`)) {
                nextSteps.unshift(`Request ${docName}`)
            }
        })
    } else {
        status = decision === 'Fast Track' ? 'Approved' : 'Under Review'
    }

    return {
        decision,
        rationale,
        estimate,
        status,
        missingInfo,
        fraudSignal,
        nextSteps
    }
}
