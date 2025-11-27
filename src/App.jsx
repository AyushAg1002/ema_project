import { useState, useEffect } from 'react'
import IntakeForm from './components/IntakeForm'
import ProcessingView from './components/ProcessingView'
import ClaimBrief from './components/ClaimBrief'
import VoiceIntake from './components/VoiceIntake'
import CustomerDashboard from './components/CustomerDashboard'
import CompanyDashboard from './components/CompanyDashboard'
import { analyzeClaim } from './utils/triageEngine'
import { supabase } from './services/supabase'

function App() {
  const [step, setStep] = useState('intake') // intake, processing, brief
  const [claimData, setClaimData] = useState(null)
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || '')
  const [intakeMode, setIntakeMode] = useState('form') // form, voice

  const [claims, setClaims] = useState([])
  const [role, setRole] = useState('customer') // customer, company
  const [view, setView] = useState('dashboard') // dashboard, intake, workspace

  // Fetch claims on load
  useEffect(() => {
    fetchClaims()
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

    // Agent 2: Triage Decision Agent
    const triageResult = analyzeClaim(baseClaim)

    // Agent 3: Report & Next-Step Agent (Simulated by combining data)
    const processedClaim = {
      ...baseClaim,
      ...triageResult,
      // Ensure these fields are top-level for the dashboard
      status: triageResult.status,
      nextSteps: triageResult.nextSteps,
      fraudSignal: triageResult.fraudSignal
    }

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
        })
      }

      const triageResult = analyzeClaim(updatedClaimData)

      const finalClaim = {
        ...updatedClaimData,
        ...triageResult,
        status: triageResult.status,
        nextSteps: triageResult.nextSteps,
        // Add mismatch flags if any
        mismatchFlags: evaluation.mismatches?.map(m => m.type) || []
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
      <header style={{ marginBottom: '2rem', textAlign: 'center', position: 'relative' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(var(--color-primary))' }}>
          Ema Claims Triage Agent
        </h1>
        <div style={{ position: 'absolute', right: role === 'company' ? '2rem' : 0, top: 0, display: 'flex', gap: '0.5rem' }}>
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
                onNewClaim={() => { setStep('intake'); setView('intake'); }}
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
