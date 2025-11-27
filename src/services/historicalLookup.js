// Historical Claims Lookup Service
// Provides rule-based matching of similar past claims for agents to use

import { supabase } from './supabase'

/**
 * Find similar claims based on vehicle and incident details
 * @param {Object} queryParams - { vehicle_make, vehicle_model, vehicle_year, incident_type, severity }
 * @param {number} topK - Number of top matches to return
 * @returns {Promise<Object>} - { count, avg_settlement_min, avg_settlement_max, top_matches, fraud_rate }
 */
export async function findSimilarClaims(queryParams, topK = 10) {
    const { vehicle_make, vehicle_model, vehicle_year, incident_type, severity } = queryParams

    try {
        // Query Supabase for similar claims
        let query = supabase
            .from('claims')
            .select('id, extracted_data, fraud_risk, status, decision')
            .neq('status', 'Closed') // Exclude closed claims for now (or include for history)
            .order('created_at', { ascending: false })
            .limit(500)

        // Apply filters if provided
        if (incident_type) {
            query = query.eq('incident_type', incident_type)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error querying similar claims:', error)
            return {
                count: 0,
                avg_settlement_min: 0,
                avg_settlement_max: 0,
                top_matches: [],
                fraud_rate: 0
            }
        }

        if (!data || data.length === 0) {
            return {
                count: 0,
                avg_settlement_min: 0,
                avg_settlement_max: 0,
                top_matches: [],
                fraud_rate: 0
            }
        }

        // Score matches based on similarity
        const scored = data.map(claim => {
            let score = 0
            const claimData = claim.extracted_data || {}

            // Vehicle make/model match (if available)
            if (vehicle_make && claimData.vehicleMake?.toLowerCase() === vehicle_make.toLowerCase()) {
                score += 0.4
            }
            if (vehicle_model && claimData.vehicleModel?.toLowerCase() === vehicle_model.toLowerCase()) {
                score += 0.3
            }

            // Vehicle year match (±1 year)
            if (vehicle_year && claimData.vehicleYear) {
                const yearDiff = Math.abs(claimData.vehicleYear - vehicle_year)
                if (yearDiff <= 1) score += 0.2
            }

            // Incident type match (already filtered in query)
            if (incident_type) score += 0.3

            // Severity match
            if (severity && claimData.severity?.toLowerCase() === severity.toLowerCase()) {
                score += 0.2
            }

            // Recency bonus (claims from last 30 days)
            const daysAgo = (new Date() - new Date(claim.created_at || Date.now())) / (1000 * 60 * 60 * 24)
            if (daysAgo < 30) score += 0.15

            return {
                ...claim,
                score,
                settlementEstimate: claimData.settlementEstimate || { min: 0, max: 0 }
            }
        })

        // Sort by score and take top K
        scored.sort((a, b) => b.score - a.score)
        const topMatches = scored.slice(0, topK)

        // Compute aggregates
        const validEstimates = topMatches.filter(m => m.settlementEstimate.min > 0)
        const avgMin = validEstimates.length > 0
            ? validEstimates.reduce((sum, m) => sum + m.settlementEstimate.min, 0) / validEstimates.length
            : 0
        const avgMax = validEstimates.length > 0
            ? validEstimates.reduce((sum, m) => sum + m.settlementEstimate.max, 0) / validEstimates.length
            : 0

        // Fraud rate (% of flagged claims)
        const fraudCount = topMatches.filter(m => m.decision === 'Flagged' || m.fraud_risk === true).length
        const fraudRate = topMatches.length > 0 ? fraudCount / topMatches.length : 0

        return {
            count: topMatches.length,
            avg_settlement_min: Math.round(avgMin),
            avg_settlement_max: Math.round(avgMax),
            fraud_rate: fraudRate,
            top_matches: topMatches.map(m => ({
                claimId: m.id,
                score: m.score,
                decision: m.decision,
                settlementEstimate: m.settlementEstimate
            }))
        }
    } catch (err) {
        console.error('Error in findSimilarClaims:', err)
        return {
            count: 0,
            avg_settlement_min: 0,
            avg_settlement_max: 0,
            top_matches: [],
            fraud_rate: 0
        }
    }
}

/**
 * Check if a user has suspicious claim history
 * @param {string} userId - User identifier (could be email, phone, pseudonym)
 * @param {Array} allClaims - All claims from database
 * @returns {Object} - { isSuspicious, reason, pastClaimCount }
 */
export function checkUserHistory(userId, allClaims) {
    if (!userId || !allClaims) {
        return { isSuspicious: false, reason: '', pastClaimCount: 0 }
    }

    // Find claims by this user (simplified - in production, use proper user matching)
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
