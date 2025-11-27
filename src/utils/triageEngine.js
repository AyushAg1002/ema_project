/**
 * 🤖 AGENT 2: TRIAGE DECISION AGENT
 * Autonomous claim classification and routing
 * Emits ClaimStatusUpdated events when triage is complete
 */

import eventBus, { EventTypes, ClaimStatus, AgentActors, createStatusUpdateEvent } from '../services/eventBus'

export function analyzeClaim(claim) {
    console.log('🤖 AGENT 2: Starting triage analysis for claim:', claim.id)
    // Agent 2: Triage Decision Logic
    // Inputs: claim (from FNOL Agent) containing AI extracted fields

    const claimData = claim // Alias for compatibility with existing logic

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

    // Rule: Re-request documents if mismatches found (Agent 5 Feedback Loop)
    if (claimData.mismatchFlags && claimData.mismatchFlags.length > 0) {
        console.log('🤖 AGENT 2: Mismatch detected by Agent 5. Triggering re-request.')
        claimData.mismatchFlags.forEach(docType => {
            if (!missingInfo.includes(docType)) {
                missingInfo.push(docType)
            }
        })
    }

    // 2. Determine Triage Decision (Fast Track / Standard / Flagged)

    // Mock History Check
    const suspiciousUsers = ['user_123', 'repeat_offender']
    if (suspiciousUsers.includes(claimData.userId)) {
        fraudSignal = true
        claimData.fraudReasoning = 'User flagged in historical claims database.'
    }

    // Priority: Fraud Signals -> Heavy Damage -> Injuries -> Fast Track
    if (fraudSignal) {
        decision = 'Flagged'
        rationale = `🚨 ALARM: Risk Detected - ${claimData.fraudReasoning || 'Inconsistencies found.'}`
        estimate = 'Under Investigation'
    } else if (claimData.severity === 'Heavy' || claimData.severity === 'heavy') {
        decision = 'Flagged'
        rationale = '🚨 ALARM: Heavy damage reported. Potential total loss.'
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
    let eventStatus = ClaimStatus.UNDER_REVIEW

    if (fraudSignal) {
        eventStatus = ClaimStatus.UNDER_SIU_REVIEW
        status = 'Under SIU Review'
    } else if (missingInfo.length > 0) {
        status = 'Waiting for Info'
        eventStatus = ClaimStatus.AWAITING_DOCUMENTS

        // Add specific next steps for missing docs
        missingInfo.forEach(doc => {
            const docName = doc.replace('_', ' ')
            if (!nextSteps.includes(`Request ${docName}`)) {
                nextSteps.unshift(`Request ${docName}`)

                // Emit DocumentRequest Event (Agent 4)
                eventBus.publish({
                    eventType: EventTypes.DOCUMENT_REQUEST,
                    correlationId: claim.id,
                    documentType: doc,
                    timestamp: new Date().toISOString(),
                    actor: AgentActors.DOCUMENT_REQUEST
                })
                console.log(`📤 AGENT 4: Requested document: ${doc}`)
            }
        })
    } else if (decision === 'Fast Track') {
        status = 'Approved'
        eventStatus = ClaimStatus.FAST_TRACK_RECOMMENDED
    } else {
        status = 'Under Review'
        eventStatus = ClaimStatus.UNDER_REVIEW
    }

    const result = {
        decision,
        rationale,
        estimate,
        status,
        missingInfo,
        fraudSignal,
        nextSteps
    }

    // Emit TriageResult Event
    eventBus.publish({
        eventType: EventTypes.TRIAGE_RESULT,
        correlationId: claim.id,
        result,
        timestamp: new Date().toISOString(),
        actor: AgentActors.TRIAGE_DECISION
    })

    // Emit ClaimStatusUpdated Event
    const statusEvent = createStatusUpdateEvent(
        claim.id,
        eventStatus,
        fraudSignal ? AgentActors.FRAUD_SIGNAL : AgentActors.TRIAGE_DECISION,
        rationale,
        { decision, missingInfo }
    )
    eventBus.publish(statusEvent)
    console.log('📤 AGENT 2: Emitted status update:', statusEvent)

    return result
}
