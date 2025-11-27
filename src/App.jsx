import { useState, useEffect } from 'react'
import IntakeForm from './components/IntakeForm'
import ProcessingView from './components/ProcessingView'
import ClaimBrief from './components/ClaimBrief'
import VoiceIntake from './components/VoiceIntake'
import CustomerDashboard from './components/CustomerDashboard'
import CompanyDashboard from './components/CompanyDashboard'
import { analyzeClaim } from './utils/triageEngine'
import { supabase } from './services/supabase'
import eventBus, { EventTypes } from './services/eventBus'

import { customerUpdateAgent } from './services/customerUpdateAgent'
import { journeyAgent } from './services/journeyAgent'

function App() {
  const [step, setStep] = useState('intake') // intake, processing, brief
  const [claimData, setClaimData] = useState(null)
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || '')
  const [intakeMode, setIntakeMode] = useState('form') // form, voice

  const [claims, setClaims] = useState([])
  const [role, setRole] = useState('customer') // customer, company
  const [view, setView] = useState('dashboard') // dashboard, intake, workspace
  const [selectedClaimId, setSelectedClaimId] = useState(null) // For customer sidebar navigation

  // Fetch claims on load
  useEffect(() => {
    fetchClaims()
    customerUpdateAgent.init()
    journeyAgent.init()
  }, [])

  // Subscribe to claim status updates
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EventTypes.CLAIM_STATUS_UPDATED, (event) => {
      console.log('📥 Received ClaimStatusUpdated event:', event)

      // Update claim in state
      setClaims(prevClaims => {
        const claimIndex = prevClaims.findIndex(c => c.id === event.correlationId)
        if (claimIndex === -1) return prevClaims

        const updatedClaims = [...prevClaims]
        const currentClaim = updatedClaims[claimIndex]

        const newHistoryItem = {
          status: event.status,
          actor: event.actor,
          timestamp: event.timestamp,
          reason: event.reason
        }

        updatedClaims[claimIndex] = {
          ...currentClaim,
          status: event.status,
          lastUpdatedBy: event.actor,
          lastUpdatedAt: event.timestamp,
          statusReason: event.reason,
          statusHistory: [newHistoryItem, ...(currentClaim.statusHistory || [])]
        }

        return updatedClaims
      })

      // Also update in Supabase
      supabase
        .from('claims')
        .update({
          status: event.status,
          last_updated_by: event.actor,
          last_updated_at: event.timestamp,
          status_reason: event.reason
        })
        .eq('id', event.correlationId)
        .then(({ error }) => {
          if (error) console.error('Error updating claim status in Supabase:', error)
        })
    })

    return unsubscribe
  }, [])

  const fetchClaims = async () => {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching claims:', error)
    else setClaims(data || [])
  }

  // Handlers
  const handleNewClaim = async (data) => {
    // Agent 1 (FNOL) has finished. Now triggering Agent 2 (Triage).

    const newClaimId = `CLM-${Math.floor(Math.random() * 10000)}`

    const baseClaim = {
      ...data, // Contains AI extracted fields
      id: newClaimId,
      date: new Date().toISOString(),
      documents: [],
      transcript: data.transcript || []
    }

    // Agent 2: Triage Decision (with historical lookup)
    const triageResult = analyzeClaim(baseClaim, claims)

    // Agent 3: Report & Next-Step Agent (Simulated by combining data)
    // Also calculates Settlement Estimate
    const settlementEstimate = calculateSettlementEstimate(baseClaim, triageResult)

    const processedClaim = {
      ...baseClaim,
      ...triageResult,
      // Ensure these fields are top-level for the dashboard
      status: triageResult.status,
      nextSteps: triageResult.nextSteps,
      fraudSignal: triageResult.fraudSignal,
      settlementEstimate
    }

    // Emit SettlementEstimate event (Agent 3)
    eventBus.publish({
      eventType: 'SettlementEstimate',
      correlationId: processedClaim.id,
      estimateMin: settlementEstimate.min,
      estimateMax: settlementEstimate.max,
      currency: 'USD',
      method: 'rule-based',
      confidence: settlementEstimate.confidence,
      inputs: {
        inferredDamageSeverity: baseClaim.severity || 'unknown',
        incidentType: baseClaim.incidentType
      },
      timestamp: new Date().toISOString(),
      agentVersion: 'brief-v1.0'
    })
    console.log('📤 AGENT 3: Emitted SettlementEstimate:', settlementEstimate)

    // Persist to Supabase
    const { error } = await supabase.from('claims').insert([{
      id: processedClaim.id,
      status: processedClaim.status,
      decision: processedClaim.decision,
      incident_type: processedClaim.incidentType,
      description: processedClaim.description, // Assuming this field exists or mapped
      transcript: processedClaim.transcript,
      extracted_data: processedClaim, // Store full object as JSONB for flexibility
      documents: processedClaim.documents,
      missing_info: processedClaim.missingInfo,
      fraud_risk: processedClaim.fraudRisk, // Mapped from fraudSignal/fraudRisk
      fraud_reasoning: processedClaim.rationale, // Mapped
      recommended_action: processedClaim.nextSteps?.[0] || 'Review', // Simplified
      official_report: processedClaim.officialReport || ''
    }])

    if (error) {
      console.error('Error saving claim:', error)
      alert('Failed to save claim to database.')
    } else {
      setClaims(prev => [processedClaim, ...prev]) // Optimistic update or re-fetch
      setClaimData(processedClaim) // For processing view
      setStep('processing')
      setView('intake') // Stay in intake flow to show processing
    }
  }

  // Settlement Estimate Calculator (Agent 3 helper)
  function calculateSettlementEstimate(claim, triageResult) {
    let min = 200
    let max = 1000
    let confidence = 0.7

    // Base range by severity
    const severity = claim.severity?.toLowerCase() || 'minor'
    if (severity === 'minor') {
      min = 200
      max = 1000
    } else if (severity === 'moderate') {
      min = 1000
      max = 3000
    } else if (severity === 'heavy' || severity === 'severe') {
      min = 3000
      max = 10000
    }

    // Adjust for injuries
    if (claim.injuries === 'Yes' || claim.injuries === 'yes') {
      min *= 1.5
      max *= 2
      confidence -= 0.1
    }

    // Adjust for missing documents
    if (triageResult.missingInfo && triageResult.missingInfo.length > 0) {
      confidence -= 0.2
    }

    // Adjust for fraud signal
    if (triageResult.fraudSignal) {
      confidence = 0.3 // Low confidence for flagged claims
    }

    return {
      min: Math.round(min),
      max: Math.round(max),
      confidence: Math.max(0.1, Math.min(1.0, confidence))
    }
  }

  const handleDocUpload = async (claimId, docType, file) => {
    const claim = claims.find(c => c.id === claimId)
    if (!claim) return

    try {
      // Agent 5: Document Evaluation Agent
      const { evaluateDocument } = await import('./services/documentEvaluator')
      const evaluation = await evaluateDocument(file, docType, claim, apiKey)

      console.log('Document evaluation result:', evaluation)

      // Update claim with document and evaluation
      const updatedDocs = [...(claim.documents || []), docType]
      const updatedEvaluations = [...(claim.documentEvaluations || []), evaluation]

      // Agent 4: Document Request Agent -> Triggers Re-evaluation
      const updatedClaimData = {
        ...claim,
        documents: updatedDocs,
        documentEvaluations: updatedEvaluations,
        // If AI detected different severity, use it for re-triage
        ...(evaluation.aiAnalysis?.detectedSeverity && {
          aiDetectedSeverity: evaluation.aiAnalysis.detectedSeverity
        }),
        // Pass mismatch flags to Triage Engine so Agent 2/4 can re-request
        mismatchFlags: evaluation.mismatches?.map(m => m.type) || []
      }

      const triageResult = analyzeClaim(updatedClaimData, claims)

      const finalClaim = {
        ...updatedClaimData,
        ...triageResult,
        status: triageResult.status,
        nextSteps: triageResult.nextSteps
      }

      // Update Supabase
      const { error } = await supabase
        .from('claims')
        .update({
          documents: updatedDocs,
          document_evaluations: updatedEvaluations,
          ai_detected_severity: evaluation.aiAnalysis?.detectedSeverity || null,
          mismatch_flags: finalClaim.mismatchFlags,
          status: finalClaim.status,
          missing_info: finalClaim.missingInfo
        })
        .eq('id', claimId)

      if (error) {
        console.error('Error updating claim:', error)
        alert('Failed to save document evaluation')
      } else {
        setClaims(prev => prev.map(c => c.id === claimId ? finalClaim : c))
        alert(evaluation.status === 'validated' ? 'Document validated successfully!' :
          evaluation.status === 'mismatch' ? 'Document uploaded but mismatches detected' :
            'Document uploaded')
      }
    } catch (error) {
      console.error('Error evaluating document:', error)
      alert('Failed to evaluate document. Please try again.')
    }
  }

  return (
    <div className={role === 'company' ? '' : 'container'} style={role === 'company' ? { padding: '2rem', height: '100vh', overflow: 'hidden' } : {}}>
      <header style={{ marginBottom: '2rem', textAlign: 'center', position: 'relative', paddingRight: '16rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(var(--color-primary))' }}>
          Ema Claims Triage Agent
        </h1>
        <div style={{ position: 'absolute', right: '0', top: 0, display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${role === 'customer' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
            onClick={() => { setRole('customer'); setView('dashboard'); }}
          >
            Customer View
          </button>
          <button
            className={`btn ${role === 'company' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
            onClick={() => { setRole('company'); setView('dashboard'); }}
          >
            Company View
          </button>
        </div>
      </header>

      <main>
        {/* CUSTOMER ROLE */}
        {role === 'customer' && (
          <>
            {view === 'dashboard' && (
              <CustomerDashboard
                claims={claims}
                onUploadDoc={handleDocUpload}
                onNewClaim={() => {
                  setSelectedClaimId(null)
                  setStep('intake')
                  setView('intake')
                }}
                selectedClaimId={selectedClaimId}
                onSelectClaim={(claim) => {
                  setSelectedClaimId(claim.id)
                  setClaimData(claim)
                }}
                intakeMode={intakeMode}
                setIntakeMode={setIntakeMode}
                apiKey={apiKey}
                setApiKey={setApiKey}
                handleNewClaim={handleNewClaim}
              />
            )}

            {view === 'intake' && (
              <>
                {step === 'intake' && (
                  <div className="card fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2>FNOL Intake Agent</h2>
                      <button className="btn btn-secondary" onClick={() => setView('dashboard')} style={{ fontSize: '0.875rem' }}>
                        Cancel
                      </button>
                    </div>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                      <button
                        className={`btn ${intakeMode === 'form' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setIntakeMode('form')}
                      >
                        Form Intake
                      </button>
                      <button
                        className={`btn ${intakeMode === 'voice' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setIntakeMode('voice')}
                      >
                        Voice Assistant
                      </button>
                    </div>

                    {intakeMode === 'voice' && !apiKey && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label">OpenAI API Key (Required for Voice)</label>
                        <input
                          type="password"
                          className="input"
                          placeholder="sk-..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                      </div>
                    )}

                    {intakeMode === 'form' ? (
                      <IntakeForm onSubmit={handleNewClaim} />
                    ) : (
                      apiKey ? (
                        <VoiceIntake
                          apiKey={apiKey}
                          onComplete={handleNewClaim}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--color-text-muted))' }}>
                          Please enter an OpenAI API Key to use the Voice Assistant.
                        </div>
                      )
                    )}
                  </div>
                )}

                {step === 'processing' && (
                  <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
                    <ProcessingView
                      claimData={claimData}
                      onComplete={() => {
                        setStep('intake')
                        setView('dashboard')
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* COMPANY ROLE */}
        {role === 'company' && (
          <CompanyDashboard claims={claims} />
        )}
      </main>
    </div>
  )
}

export default App
