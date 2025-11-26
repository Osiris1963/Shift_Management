/**
 * Cloud Function to securely proxy requests to the Gemini API.
 * This hides the API key from the client-side code (index.html).
 */
const functions = require('firebase-functions');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors')({ origin: true });

// NOTE: The Gemini API Key is retrieved securely from the environment variables (config)
// You must set this variable in your Firebase project using the command:
// firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"
const GEMINI_API_KEY = functions.config().gemini.key;
const ai = new GoogleGenAI(GEMINI_API_KEY);

exports.generateHandoverSummary = functions.https.onRequest((request, response) => {
    // 1. Handle CORS Preflight Requests
    cors(request, response, async () => {
        
        if (request.method !== 'POST') {
            return response.status(405).send('Method Not Allowed');
        }

        const { systemPrompt, userQuery } = request.body;
        
        if (!userQuery) {
            return response.status(400).send('Missing userQuery in request body.');
        }

        const modelName = 'gemini-2.5-flash-preview-09-2025';

        try {
            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                config: {
                    // System instructions are critical for persona and format
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    // Optional: Set temperature or max tokens if desired
                }
            };
            
            // 2. Call the Gemini API securely using the Node.js SDK
            const result = await ai.models.generateContent({
                model: modelName,
                ...payload
            });
            
            const summaryText = result.candidates?.[0]?.content?.parts?.[0]?.text || 
                                "Error: AI returned an empty response.";

            // 3. Send the result back to the client
            response.status(200).json({ summary: summaryText });

        } catch (error) {
            console.error("Gemini API Error:", error);
            response.status(500).json({ 
                error: 'Failed to generate summary via Cloud Function.',
                details: error.message 
            });
        }
    });
});