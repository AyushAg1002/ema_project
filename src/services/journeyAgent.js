/**
 * 🤖 AGENT 7: JOURNEY AGENT
 * 
 * Responsibility:
 * - Monitors all claim lifecycle events
 * - Computes aggregate metrics (speed, satisfaction, smoothness)
 * - Generates periodic reports for the insurance company
 * - Emits improvement hints to other agents
 * - Tracks agent health and performance
 */

import eventBus, { EventTypes, AgentActors } from './eventBus'
import { supabase } from './supabase'

class JourneyAgent {
    constructor() {
        this.isInitialized = false
        this.aggregator = {
            claimsSeen: new Set(),
            claimTimestamps: new Map(), // claimId -> { initiated, triaged, etc. }
            triageTimes: [],
            firstActionTimes: [],
            fastTrackCount: 0,
            flaggedCount: 0,
            documentsCounts: [],
            settlementMin: [],
            settlementMax: [],
            fraudFlags: 0,
            satisfactionScores: []
        }
    }

    init() {
        if (this.isInitialized) return

        console.log('🤖 AGENT 7: Journey Agent Initialized')

        // Subscribe to all lifecycle events
        eventBus.subscribe(EventTypes.CLAIM_INITIATED, this.handleClaimInitiated.bind(this))
        eventBus.subscribe(EventTypes.TRIAGE_RESULT, this.handleTriageResult.bind(this))
        eventBus.subscribe(EventTypes.DOCUMENT_REQUEST, this.handleDocumentRequest.bind(this))
        eventBus.subscribe(EventTypes.DOCUMENT_EVALUATED, this.handleDocumentEvaluated.bind(this))
        eventBus.subscribe(EventTypes.CLAIM_BRIEF_UPDATED, this.handleClaimBriefUpdated.bind(this))
        eventBus.subscribe(EventTypes.CLAIM_STATUS_UPDATED, this.handleClaimStatusUpdated.bind(this))
        eventBus.subscribe('SettlementEstimate', this.handleSettlementEstimate.bind(this))

        this.isInitialized = true

        // Start periodic aggregation (every 5 minutes for demo, daily in production)
        this.startPeriodicAggregation()
    }

    handleClaimInitiated(event) {
        const { correlationId, timestamp } = event
        this.aggregator.claimsSeen.add(correlationId)

        if (!this.aggregator.claimTimestamps.has(correlationId)) {
            this.aggregator.claimTimestamps.set(correlationId, {})
        }
        this.aggregator.claimTimestamps.get(correlationId).initiated = new Date(timestamp)

        console.log('📊 AGENT 7: Tracking claim', correlationId)
    }

    handleTriageResult(event) {
        const { correlationId, result, timestamp } = event

        // Record triage completion time
        const timestamps = this.aggregator.claimTimestamps.get(correlationId)
        if (timestamps && timestamps.initiated) {
            timestamps.triaged = new Date(timestamp)
            const triageTime = (timestamps.triaged - timestamps.initiated) / 1000 // seconds
            this.aggregator.triageTimes.push(triageTime)
        }

        // Track decision types
        if (result.decision === 'Fast Track') {
            this.aggregator.fastTrackCount++
        } else if (result.decision === 'Flagged') {
            this.aggregator.flaggedCount++
        }

        if (result.fraudSignal) {
            this.aggregator.fraudFlags++
        }

        console.log('📊 AGENT 7: Triage tracked for', correlationId)
    }

    handleDocumentRequest(event) {
        const { correlationId } = event
        // Track document requests per claim
        const current = this.aggregator.documentsCounts.find(d => d.claimId === correlationId)
        if (current) {
            current.count++
        } else {
            this.aggregator.documentsCounts.push({ claimId: correlationId, count: 1 })
        }
    }

    handleDocumentEvaluated(event) {
        // Track document evaluation metrics
        console.log('📊 AGENT 7: Document evaluation tracked')
    }

    handleClaimBriefUpdated(event) {
        // Track brief generation
        console.log('📊 AGENT 7: Claim brief tracked')
    }

    handleClaimStatusUpdated(event) {
        // Track status changes for journey smoothness
        console.log('📊 AGENT 7: Status update tracked')
    }

    handleSettlementEstimate(event) {
        const { estimateMin, estimateMax } = event
        if (estimateMin) this.aggregator.settlementMin.push(estimateMin)
        if (estimateMax) this.aggregator.settlementMax.push(estimateMax)
        console.log('📊 AGENT 7: Settlement estimate tracked')
    }

    avg(arr) {
        if (!arr.length) return null
        return arr.reduce((s, x) => s + x, 0) / arr.length
    }

    async flushAggregates() {
        const periodEnd = new Date()
        const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours

        const totalClaims = this.aggregator.claimsSeen.size
        if (totalClaims === 0) {
            console.log('📊 AGENT 7: No claims to aggregate')
            return
        }

        const avgDocsPerClaim = this.avg(
            this.aggregator.documentsCounts.map(d => d.count)
        )

        const report = {
            total_claims: totalClaims,
            avg_time_to_triage: this.avg(this.aggregator.triageTimes),
            pct_fast_track: totalClaims ? this.aggregator.fastTrackCount / totalClaims : 0,
            pct_flagged: totalClaims ? this.aggregator.flaggedCount / totalClaims : 0,
            avg_documents_per_claim: avgDocsPerClaim || 0,
            avg_settlement_estimate_min: this.avg(this.aggregator.settlementMin),
            avg_settlement_estimate_max: this.avg(this.aggregator.settlementMax),
            fraud_flag_rate: totalClaims ? this.aggregator.fraudFlags / totalClaims : 0,
            agent_health: {} // TODO: Implement agent health tracking
        }

        console.log('📊 AGENT 7: Flushing aggregates:', report)

        // Persist to Supabase
        try {
            await supabase.from('journey_aggregates').insert([{
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
                ...report
            }])

            await supabase.from('journey_reports').insert([{
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
                report,
                generated_by: 'journey-agent-v1'
            }])

            console.log('✅ AGENT 7: Aggregates persisted to database')
        } catch (error) {
            console.warn('⚠️ AGENT 7: Failed to persist aggregates (tables may not exist yet):', error.message)
        }

        // Check agent health and emit improvement hints
        await this.checkAgentHealthAndEmitHints()

        // Reset aggregator
        this.resetAggregator()
    }

    async checkAgentHealthAndEmitHints() {
        const avgTriage = this.avg(this.aggregator.triageTimes)

        // Example: Slow triage detection
        if (avgTriage && avgTriage > 30) {
            const hint = {
                eventType: 'AgentImprovementHint',
                targetAgent: AgentActors.TRIAGE_DECISION,
                hint: 'Average triage time >30s — consider caching policy lookup or simplifying rules',
                evidence: { avgTriageSec: avgTriage },
                suggestedAction: 'Use cached policy lookup; set timeout=200ms',
                severity: 'medium',
                timestamp: new Date().toISOString()
            }

            eventBus.publish(hint)
            console.log('💡 AGENT 7: Emitted improvement hint:', hint)
        }

        // Example: High document mismatch rate
        const mismatchRate = 0.15 // TODO: Calculate from actual data
        if (mismatchRate > 0.1) {
            const hint = {
                eventType: 'AgentImprovementHint',
                targetAgent: AgentActors.DOCUMENT_EVALUATION,
                hint: 'High document mismatch rate detected — consider improving photo guidance',
                evidence: { mismatchRate },
                suggestedAction: 'Add clearer photo upload instructions; adjust OCR threshold',
                severity: 'high',
                timestamp: new Date().toISOString()
            }

            eventBus.publish(hint)
            console.log('💡 AGENT 7: Emitted improvement hint:', hint)
        }
    }

    resetAggregator() {
        this.aggregator.claimsSeen.clear()
        this.aggregator.claimTimestamps.clear()
        this.aggregator.triageTimes = []
        this.aggregator.firstActionTimes = []
        this.aggregator.fastTrackCount = 0
        this.aggregator.flaggedCount = 0
        this.aggregator.documentsCounts = []
        this.aggregator.settlementMin = []
        this.aggregator.settlementMax = []
        this.aggregator.fraudFlags = 0
        this.aggregator.satisfactionScores = []
    }

    startPeriodicAggregation() {
        // For demo: aggregate every 5 minutes
        // For production: use cron job or scheduled worker
        setInterval(() => {
            this.flushAggregates()
        }, 5 * 60 * 1000) // 5 minutes
    }
}

export const journeyAgent = new JourneyAgent()
export default journeyAgent
