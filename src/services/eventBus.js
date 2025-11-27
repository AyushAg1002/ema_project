/**
 * Event Bus for Claims Processing
 * Enables pub/sub pattern for agent-driven status updates
 */

class EventBus {
    constructor() {
        this.subscribers = new Map()
        this.eventHistory = []
    }

    /**
     * Subscribe to an event type
     * @param {string} eventType - Type of event to listen for
     * @param {function} callback - Function to call when event is published
     * @returns {function} Unsubscribe function
     */
    subscribe(eventType, callback) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, [])
        }

        this.subscribers.get(eventType).push(callback)

        // Return unsubscribe function
        return () => {
            const callbacks = this.subscribers.get(eventType)
            const index = callbacks.indexOf(callback)
            if (index > -1) {
                callbacks.splice(index, 1)
            }
        }
    }

    /**
     * Publish an event to all subscribers
     * @param {object} event - Event object to publish
     */
    publish(event) {
        // Validate event structure
        if (!event.eventType) {
            console.error('Event must have eventType property', event)
            return
        }

        // Add timestamp if not present
        if (!event.timestamp) {
            event.timestamp = new Date().toISOString()
        }

        // Store in history
        this.eventHistory.push(event)

        // Notify subscribers
        const callbacks = this.subscribers.get(event.eventType) || []
        callbacks.forEach(callback => {
            try {
                callback(event)
            } catch (error) {
                console.error(`Error in event handler for ${event.eventType}:`, error)
            }
        })

        // Also notify wildcard subscribers
        const wildcardCallbacks = this.subscribers.get('*') || []
        wildcardCallbacks.forEach(callback => {
            try {
                callback(event)
            } catch (error) {
                console.error('Error in wildcard event handler:', error)
            }
        })
    }

    /**
     * Get event history for a specific claim
     * @param {string} correlationId - Claim ID to filter by
     * @returns {array} Array of events for this claim
     */
    getClaimHistory(correlationId) {
        return this.eventHistory.filter(e => e.correlationId === correlationId)
    }

    /**
     * Get all events of a specific type
     * @param {string} eventType - Type of events to retrieve
     * @returns {array} Array of events of this type
     */
    getEventsByType(eventType) {
        return this.eventHistory.filter(e => e.eventType === eventType)
    }

    /**
     * Clear event history (useful for testing)
     */
    clearHistory() {
        this.eventHistory = []
    }
}

// Create singleton instance
const eventBus = new EventBus()

/**
 * Event Type Constants
 */
export const EventTypes = {
    CLAIM_INITIATED: 'ClaimInitiated',
    CLAIM_STATUS_UPDATED: 'ClaimStatusUpdated',
    TRIAGE_RESULT: 'TriageResult',
    CLAIM_BRIEF_UPDATED: 'ClaimBriefUpdated',
    DOCUMENT_REQUEST: 'DocumentRequest',
    DOCUMENT_UPLOADED: 'DocumentUploaded',
    DOCUMENT_EVALUATED: 'DocumentEvaluated',
    FRAUD_FLAG_RAISED: 'FraudFlagRaised'
}

/**
 * Status Constants
 */
export const ClaimStatus = {
    SUBMITTED: 'Submitted',
    FAST_TRACK_RECOMMENDED: 'FastTrackRecommended',
    UNDER_REVIEW: 'UnderReview',
    AWAITING_DOCUMENTS: 'AwaitingDocuments',
    DOCUMENT_RECEIVED: 'DocumentReceived',
    UNDER_SIU_REVIEW: 'UnderSIUReview',
    PENDING_ADJUSTER_REVIEW: 'PendingAdjusterReview',
    READY_FOR_PAYOUT: 'ReadyForPayout',
    COMPLETED: 'Completed',
    ACTION_REQUIRED: 'ActionRequired'
}

/**
 * Agent Actor Constants
 */
export const AgentActors = {
    FNOL_INTAKE: 'FNOL Intake Agent',
    TRIAGE_DECISION: 'Triage Decision Agent',
    CLAIM_BRIEF: 'Claim Brief Agent',
    DOCUMENT_REQUEST: 'Document Request Agent',
    DOCUMENT_EVALUATION: 'Document Evaluation Agent',
    FRAUD_SIGNAL: 'Fraud Signal Agent',
    AUTO_NOTIFY: 'Auto-Notify Agent',
    CUSTOMER_UPDATE: 'Customer Update Agent'
}

/**
 * Helper function to create ClaimStatusUpdated event
 */
export function createStatusUpdateEvent(correlationId, status, actor, reason, meta = {}) {
    return {
        eventType: EventTypes.CLAIM_STATUS_UPDATED,
        schemaVersion: '1.0',
        correlationId,
        status,
        actor,
        reason,
        timestamp: new Date().toISOString(),
        meta
    }
}

/**
 * Helper function to create ClaimInitiated event
 */
export function createClaimInitiatedEvent(correlationId, extractedData, transcript) {
    return {
        eventType: EventTypes.CLAIM_INITIATED,
        schemaVersion: '1.0',
        correlationId,
        extractedData,
        transcript,
        timestamp: new Date().toISOString()
    }
}

export default eventBus
