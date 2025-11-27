/**
 * 🤖 AGENT 6: CUSTOMER UPDATE AGENT
 * 
 * Responsibility:
 * - Listens to internal analysis events (TriageResult, DocumentEvaluated, etc.)
 * - Translates technical outcomes into user-friendly status updates
 * - Emits ClaimStatusUpdated events for the UI
 * - Acts as the single source of truth for user-facing communications
 */

import eventBus, { EventTypes, ClaimStatus, AgentActors, createStatusUpdateEvent } from './eventBus'
import { supabase } from './supabase'

class CustomerUpdateAgent {
    constructor() {
        this.isInitialized = false
    }

    init() {
        if (this.isInitialized) return

        console.log('🤖 AGENT 6: Customer Update Agent Initialized')

        // Subscribe to Triage Results (Agent 2)
        eventBus.subscribe(EventTypes.TRIAGE_RESULT, this.handleTriageResult.bind(this))

        // Subscribe to Document Evaluation Results (Agent 5)
        eventBus.subscribe(EventTypes.DOCUMENT_EVALUATED, this.handleDocumentEvaluation.bind(this))

        // Subscribe to Document Requests (Agent 4)
        eventBus.subscribe(EventTypes.DOCUMENT_REQUEST, this.handleDocumentRequest.bind(this))

        this.isInitialized = true
    }

    /**
     * Persist notification to Supabase (Mimics Edge Function behavior)
     */
    async persistNotification(correlationId, status, message, detail) {
        try {
            // Use claim ID as pseudonym for MVP
            const customerPseudonym = `cust-${correlationId}`

            const { error } = await supabase
                .from('customer_notifications')
                .insert([{
                    correlation_id: correlationId,
                    customer_pseudonym: customerPseudonym,
                    notif_type: 'StatusUpdate',
                    status,
                    message,
                    detail
                }])

            if (error) {
                console.warn('Failed to persist notification (Table might not exist yet):', error.message)
            } else {
                console.log('💾 AGENT 6: Persisted notification to DB')
            }
        } catch (err) {
            console.error('Error persisting notification:', err)
        }
    }

    /**
     * Handle Triage Result from Agent 2
     */
    handleTriageResult(event) {
        console.log('🤖 AGENT 6: Processing Triage Result for User Update')
        const { result, correlationId } = event

        let status = ClaimStatus.UNDER_REVIEW
        let message = 'Your claim is under review.'

        if (result.fraudSignal) {
            status = ClaimStatus.UNDER_SIU_REVIEW
            message = 'We need to review some details a bit more closely. A specialist will contact you.'
        } else if (result.missingInfo && result.missingInfo.length > 0) {
            status = ClaimStatus.AWAITING_DOCUMENTS
            message = `Action Required: We need ${result.missingInfo.length} additional document(s) to proceed.`
        } else if (result.decision === 'Fast Track') {
            status = ClaimStatus.FAST_TRACK_RECOMMENDED
            message = 'Great news! Your claim qualifies for Fast Track processing.'
        } else {
            status = ClaimStatus.UNDER_REVIEW
            message = 'Your claim has been received and is being reviewed by our standard claims team.'
        }

        const updateEvent = createStatusUpdateEvent(
            correlationId,
            status,
            AgentActors.CUSTOMER_UPDATE,
            message,
            { originalActor: event.actor }
        )

        // 1. Publish to Event Bus (for internal tracking)
        eventBus.publish(updateEvent)

        // 2. Persist to DB (for Customer UI Realtime)
        this.persistNotification(correlationId, status, message, {
            actor: AgentActors.CUSTOMER_UPDATE,
            reason: message,
            originalActor: event.actor
        })

        console.log('📤 AGENT 6: Emitted User Update:', updateEvent)
    }

    /**
     * Handle Document Evaluation from Agent 5
     */
    handleDocumentEvaluation(event) {
        console.log('🤖 AGENT 6: Processing Document Evaluation for User Update')
        const { evaluation, correlationId, documentType } = event

        let status = ClaimStatus.DOCUMENT_RECEIVED
        let message = `We've received your ${documentType.replace('_', ' ')}.`

        if (evaluation.status === 'mismatch') {
            status = ClaimStatus.UNDER_REVIEW
            message = `We noticed some discrepancies in the uploaded ${documentType.replace('_', ' ')}. An adjuster will review it shortly.`
        } else if (evaluation.status === 'validated') {
            status = ClaimStatus.DOCUMENT_RECEIVED
            message = `Your ${documentType.replace('_', ' ')} has been verified successfully.`
        }

        const updateEvent = createStatusUpdateEvent(
            correlationId,
            status,
            AgentActors.CUSTOMER_UPDATE,
            message,
            { originalActor: event.actor }
        )

        eventBus.publish(updateEvent)
        this.persistNotification(correlationId, status, message, {
            actor: AgentActors.CUSTOMER_UPDATE,
            reason: message,
            originalActor: event.actor
        })
        console.log('📤 AGENT 6: Emitted User Update:', updateEvent)
    }

    /**
     * Handle Document Request from Agent 4
     */
    handleDocumentRequest(event) {
        console.log('🤖 AGENT 6: Processing Document Request for User Update')
        const { documentType, correlationId } = event

        const message = `Please upload a copy of your ${documentType.replace('_', ' ')}.`

        const updateEvent = createStatusUpdateEvent(
            correlationId,
            ClaimStatus.AWAITING_DOCUMENTS,
            AgentActors.CUSTOMER_UPDATE,
            message,
            { originalActor: event.actor }
        )

        eventBus.publish(updateEvent)
        this.persistNotification(correlationId, ClaimStatus.AWAITING_DOCUMENTS, message, {
            actor: AgentActors.CUSTOMER_UPDATE,
            reason: message,
            originalActor: event.actor
        })
        console.log('📤 AGENT 6: Emitted User Update:', updateEvent)
    }
}

export const customerUpdateAgent = new CustomerUpdateAgent()
export default customerUpdateAgent
