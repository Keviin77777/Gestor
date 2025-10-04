import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
export const hasGemini = Boolean(geminiApiKey);

export const ai = genkit({
  plugins: hasGemini ? [googleAI({ apiKey: geminiApiKey })] : [],
  ...(hasGemini ? { model: 'googleai/gemini-2.5-flash' } : {}),
});

if (!hasGemini) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Genkit] GEMINI_API_KEY/GOOGLE_API_KEY not set. AI features will use local fallbacks.'
  );
}
