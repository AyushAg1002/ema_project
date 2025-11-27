/**
 * Agent 5: Document Evaluation Agent
 * 
 * Validates, classifies, and evaluates uploaded documents using AI vision.
 * Detects mismatches between claimed damage and photographic evidence.
 */

/**
 * Evaluate an uploaded document using AI vision
 * @param {File|string} file - File object or base64 data URL
 * @param {string} docType - Expected document type (damage_photo, license, police_report)
 * @param {object} claimData - Existing claim data for comparison
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<object>} Evaluation results
 */
export async function evaluateDocument(file, docType, claimData, apiKey) {
    try {
        // Step 1: Validate file
        const validation = validateFile(file, docType)
        if (!validation.valid) {
            return {
                valid: false,
                error: validation.error,
                docType: docType,
                status: 'rejected'
            }
        }

        // Step 2: Convert to base64 if needed
        const base64Image = await fileToBase64(file)

        // Step 3: AI Vision Analysis
        const aiAnalysis = await analyzeWithVision(base64Image, docType, claimData, apiKey)

        // Step 4: Detect mismatches
        const mismatches = detectMismatches(aiAnalysis, claimData, docType)

        // Step 5: Return comprehensive evaluation
        return {
            valid: true,
            docType: aiAnalysis.classifiedType || docType,
            status: mismatches.length > 0 ? 'mismatch' : 'validated',
            aiAnalysis: aiAnalysis,
            mismatches: mismatches,
            timestamp: new Date().toISOString()
        }

    } catch (error) {
        console.error('Document evaluation error:', error)
        return {
            valid: false,
            error: error.message,
            docType: docType,
            status: 'error'
        }
    }
}

/**
 * Validate file type and size
 */
function validateFile(file, docType) {
    // Handle base64 data URLs
    if (typeof file === 'string' && file.startsWith('data:')) {
        return { valid: true }
    }

    // Handle File objects
    if (file instanceof File) {
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            return { valid: false, error: 'File too large (max 10MB)' }
        }

        const validTypes = {
            'damage_photo': ['image/jpeg', 'image/png', 'image/webp'],
            'license': ['image/jpeg', 'image/png'],
            'police_report': ['application/pdf', 'image/jpeg', 'image/png']
        }

        if (!validTypes[docType]?.includes(file.type)) {
            return { valid: false, error: `Invalid file type for ${docType}` }
        }

        return { valid: true }
    }

    return { valid: false, error: 'Invalid file format' }
}

/**
 * Convert File to base64 data URL
 */
function fileToBase64(file) {
    if (typeof file === 'string' && file.startsWith('data:')) {
        return Promise.resolve(file)
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

/**
 * Analyze document using OpenAI Vision API
 */
async function analyzeWithVision(base64Image, docType, claimData, apiKey) {
    const prompts = {
        damage_photo: `You are an expert insurance claims adjuster analyzing a vehicle damage photo.

Analyze this image and provide:
1. Damage severity: none | minor | moderate | severe
2. Damage location: front | rear | side | multiple | roof | undercarriage
3. Specific damage description
4. Is the vehicle drivable based on visible damage? yes | no | unclear
5. Any red flags or inconsistencies

Claimed damage: ${claimData.description || 'Not specified'}
Claimed severity: ${claimData.severity || 'Not specified'}
Claimed drivable: ${claimData.drivable || 'Not specified'}

Return JSON:
{
  "classifiedType": "damage_photo",
  "detectedSeverity": "minor|moderate|severe|none",
  "damageLocation": "front|rear|side|multiple",
  "damageDescription": "detailed description",
  "isDrivable": "yes|no|unclear",
  "redFlags": ["flag1", "flag2"],
  "confidence": 0.0-1.0
}`,

        license: `Analyze this ID/license image and extract:
1. Is it readable? yes | no
2. Document type: drivers_license | state_id | passport | other
3. Is it expired? yes | no | unclear
4. Any red flags (blurry, tampered, etc.)

Return JSON:
{
  "classifiedType": "license",
  "readable": true|false,
  "documentType": "drivers_license|state_id|passport|other",
  "expired": true|false|null,
  "redFlags": [],
  "confidence": 0.0-1.0
}`,

        police_report: `Analyze this police report document:
1. Is it a valid police report? yes | no
2. Can you extract the incident date?
3. Can you extract the report number?
4. Any red flags?

Claimed incident date: ${claimData.dateTime || 'Not specified'}

Return JSON:
{
  "classifiedType": "police_report",
  "validReport": true|false,
  "incidentDate": "date or null",
  "reportNumber": "number or null",
  "redFlags": [],
  "confidence": 0.0-1.0
}`
    }

    try {
        const response = await fetch('http://localhost:3001/api/vision', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64Image,
                prompt: prompts[docType] || prompts.damage_photo,
                apiKey: apiKey
            })
        })

        const data = await response.json()

        if (!data.choices || !data.choices.length) {
            throw new Error('Invalid vision API response')
        }

        return JSON.parse(data.choices[0].message.content)

    } catch (error) {
        console.error('Vision API error:', error)
        // Return safe default
        return {
            classifiedType: docType,
            detectedSeverity: 'unclear',
            redFlags: ['AI analysis failed'],
            confidence: 0
        }
    }
}

/**
 * Detect mismatches between AI analysis and claim data
 */
function detectMismatches(aiAnalysis, claimData, docType) {
    const mismatches = []

    if (docType === 'damage_photo') {
        // Severity mismatch
        const claimedSeverity = claimData.severity?.toLowerCase()
        const detectedSeverity = aiAnalysis.detectedSeverity?.toLowerCase()

        if (claimedSeverity && detectedSeverity) {
            const severityMap = { 'none': 0, 'minor': 1, 'moderate': 2, 'severe': 3 }
            const claimedLevel = severityMap[claimedSeverity] || 1
            const detectedLevel = severityMap[detectedSeverity] || 1

            if (Math.abs(claimedLevel - detectedLevel) >= 2) {
                mismatches.push({
                    type: 'severity_mismatch',
                    claimed: claimedSeverity,
                    detected: detectedSeverity,
                    severity: 'high'
                })
            }
        }

        // Drivable mismatch
        if (claimData.drivable && aiAnalysis.isDrivable) {
            const claimedDrivable = claimData.drivable.toLowerCase()
            const detectedDrivable = aiAnalysis.isDrivable.toLowerCase()

            if (claimedDrivable === 'yes' && detectedDrivable === 'no') {
                mismatches.push({
                    type: 'drivable_mismatch',
                    claimed: 'drivable',
                    detected: 'not drivable',
                    severity: 'medium'
                })
            }
        }

        // No damage visible when damage claimed
        if (detectedSeverity === 'none' && claimData.description?.toLowerCase().includes('damage')) {
            mismatches.push({
                type: 'no_visible_damage',
                claimed: 'damage reported',
                detected: 'no damage visible',
                severity: 'high'
            })
        }
    }

    // Add AI-detected red flags as mismatches
    if (aiAnalysis.redFlags && aiAnalysis.redFlags.length > 0) {
        aiAnalysis.redFlags.forEach(flag => {
            mismatches.push({
                type: 'ai_red_flag',
                flag: flag,
                severity: 'medium'
            })
        })
    }

    return mismatches
}
