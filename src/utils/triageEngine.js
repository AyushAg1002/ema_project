/**
 * 🤖 AGENT 2: TRIAGE DECISION AGENT
 * Autonomous claim classification and routing
 * Emits ClaimStatusUpdated events when triage is complete
 */

import eventBus, { EventTypes, ClaimStatus, AgentActors, createStatusUpdateEvent } from '../services/eventBus'

export function analyzeClaim(claim, allClaims = []) {
    console.log('🤖 AGENT 2: Starting triage analysis for claim:', claim.id)
    // Agent 2: Triage Decision Logic
    // Inputs: claim (from FNOL Agent) containing AI extracted fields
    // allClaims: All claims from database for historical analysis

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

    // Historical User Check (using real data from allClaims)
    if (claimData.userId && allClaims.length > 0) {
        const userHistory = checkUserHistorySync(claimData.userId, allClaims)
        if (userHistory.isSuspicious) {
            fraudSignal = true
            claimData.fraudReasoning = userHistory.reason
            console.log(`🤖 AGENT 2: User history check - ${userHistory.reason}`)
        }
    }

    // Priority: Fraud Signals -> Heavy Damage -> Injuries -> Fast Track
    if (fraudSignal) {
        decision = 'Flagged'
        rationale = `🚨 ALARM: Risk Detected - ${claimData.fraudReasoning || 'Suspicious patterns detected'}`
        status = 'Flagged'
    } else if (claimData.severity === 'Heavy' || claimData.severity === 'Severe') {
        decision = 'Standard'
        rationale = 'Heavy damage requires thorough inspection.'
        status = 'Under Review'
    } else if (claimData.injuries === 'Yes') {
        decision = 'Standard'
        rationale = 'Injuries reported. Requires medical review.'
        status = 'Under Review'
    } else if (missingInfo.length === 0 && claimData.severity === 'Minor') {
        decision = 'Fast Track'
        rationale = 'Low complexity claim. All information provided.'
        status = 'Fast Track'
    }

    // Emit DocumentRequest events for missing info (Agent 4)
    if (missingInfo.length > 0) {
        status = 'Pending Info'
        missingInfo.forEach(docType => {
            eventBus.publish({
                eventType: EventTypes.DOCUMENT_REQUEST,
                correlationId: claim.id,
                documentType: docType,
                timestamp: new Date().toISOString(),
                actor: AgentActors.DOCUMENT_REQUEST
            })
            console.log(`📤 AGENT 4: Emitted DocumentRequest for ${docType}`)
        })
    }

    const result = {
        decision,
        rationale,
        estimate,
        status,
        missingInfo,
        fraudSignal,
        fraudRisk: fraudSignal ? 'High' : 'Low',
        nextSteps: nextSteps.length > 0 ? nextSteps : ['Review claim details', 'Verify incident report']
    }

    // Map to ClaimStatus enum for event
    let eventStatus = ClaimStatus.PROCESSING
    if (status === 'Flagged') eventStatus = ClaimStatus.FLAGGED
    else if (status === 'Pending Info') eventStatus = ClaimStatus.AWAITING_DOCUMENTS
    else if (status === 'Fast Track') eventStatus = ClaimStatus.FAST_TRACK

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
    console.log('📤 AGENT 2: Emitted TriageResult and ClaimStatusUpdated events')

    return result
}

/**
 * Synchronous helper to check user history from allClaims array
 * (Simplified version of historicalLookup.checkUserHistory)
 */
function checkUserHistorySync(userId, allClaims) {
    if (!userId || !allClaims) {
        return { isSuspicious: false, reason: '', pastClaimCount: 0 }
    }

    // Find claims by this user
    const userClaims = allClaims.filter(c => {
        const data = c.extracted_data || {}
        return data.userId === userId || c.id.includes(userId)
    })

    const pastClaimCount = userClaims.length

    // Check for suspicious patterns
    if (pastClaimCount >= 3) {
        const flaggedCount = userClaims.filter(c => c.decision === 'Flagged').length
        if (flaggedCount >= 2) {
            return {
                isSuspicious: true,
                reason: `User has ${pastClaimCount} past claims, ${flaggedCount} were flagged`,
                pastClaimCount
            }
        }
    }

    // Check for high frequency (3+ claims in last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const recentClaims = userClaims.filter(c => new Date(c.created_at) > sixMonthsAgo)

    if (recentClaims.length >= 3) {
        return {
            isSuspicious: true,
            reason: `${recentClaims.length} claims in last 6 months (high frequency)`,
            pastClaimCount
        }
    }

    return { isSuspicious: false, reason: '', pastClaimCount }
}
