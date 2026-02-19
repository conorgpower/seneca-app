import axios from 'axios';
import Constants from 'expo-constants';

const DEEPSEEK_API_KEY = Constants.expoConfig?.extra?.deepseekApiKey || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const SYSTEM_PROMPT = `You are Seneca, a wise philosophical guide drawing upon the wisdom of ancient and modern philosophy. You embody the teachings of Stoic philosophers like Marcus Aurelius, Epictetus, and Seneca the Younger, as well as insights from Nietzsche, Plato, Aristotle, and other great thinkers.

Your purpose is to:
- Help people navigate life's challenges with philosophical wisdom
- Provide practical, actionable advice grounded in philosophical principles
- Quote relevant passages from philosophical texts when appropriate
- Encourage self-reflection and the examined life
- Speak in a warm, accessible tone while maintaining philosophical depth

When responding:
- Be concise yet profound
- Use Socratic questioning to deepen understanding
- Relate ancient wisdom to modern challenges
- Encourage virtue, resilience, and rational thinking
- Acknowledge human struggles with compassion
- IMPORTANT: Never repeat the same quote or passage twice in a conversation. If you've already shared a quote, reference it in different words or use a completely different quote.`;

export class AIService {
  private conversationHistory: Message[] = [];
  private usedQuotes: Set<string> = new Set();
  private usedTexts: Set<string> = new Set();
  private personalizationHint: string | null = null;

  private buildSystemPrompt(): string {
    if (!this.personalizationHint) return SYSTEM_PROMPT;

    return `${SYSTEM_PROMPT}

Light personalization (optional, only when relevant to the user's current message):
${this.personalizationHint}

Do not force this context into every reply.`;
  }

  constructor() {
    this.conversationHistory.push({
      role: 'system',
      content: this.buildSystemPrompt(),
    });
  }

  /**
   * Extract quotes from text to track usage
   */
  private extractQuotes(text: string): string[] {
    const quotePatterns = [
      /"([^"]+)"/g,  // Double quotes
      /"([^"]+)"/g,  // Curly quotes
    ];
    
    const quotes: string[] = [];
    quotePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 20) { // Only track substantial quotes
          quotes.push(match[1].toLowerCase().trim());
        }
      }
    });
    
    return quotes;
  }

  /**
   * Check if context contains already used text
   */
  private isTextAlreadyUsed(contextText: string): boolean {
    const normalizedText = contextText.toLowerCase().trim();
    return this.usedTexts.has(normalizedText);
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(userMessage: string, context?: string): Promise<string> {
    try {
      // Skip context if we've already used this exact text
      if (context && this.isTextAlreadyUsed(context)) {
        context = undefined;
      }

      // Build context message with instruction to avoid repetition
      let messageContent = userMessage;
      if (context) {
        this.usedTexts.add(context.toLowerCase().trim());
        messageContent = `Context: ${context}\n\nUser: ${userMessage}`;
      }

      // Add reminder about used quotes if any exist
      if (this.usedQuotes.size > 0) {
        const quotesReminder = `\n\n[System: You have already shared these quotes in this conversation - do not repeat them: ${Array.from(this.usedQuotes).slice(0, 3).join('; ')}...]`;
        messageContent += quotesReminder;
      }

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: messageContent,
      });

      // Call DeepSeek API
      const response = await axios.post<DeepSeekResponse>(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: this.conversationHistory,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
        }
      );

      const aiResponse = response.data.choices[0].message.content;

      // Track quotes used in this response
      const newQuotes = this.extractQuotes(aiResponse);
      newQuotes.forEach(quote => this.usedQuotes.add(quote));

      // Add AI response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiResponse,
      });

      return aiResponse;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw new Error('Failed to get response from AI. Please try again.');
    }
  }

  /**
   * Clear conversation history (but keep system prompt)
   */
  clearHistory() {
    this.conversationHistory = [
      {
        role: 'system',
        content: this.buildSystemPrompt(),
      },
    ];
    this.usedQuotes.clear();
    this.usedTexts.clear();
  }

  /**
   * Set lightweight personalization context from onboarding answers.
   * This is intentionally low-priority guidance.
   */
  setPersonalizationHint(hint: string | null) {
    this.personalizationHint = hint;

    if (this.conversationHistory.length > 0 && this.conversationHistory[0].role === 'system') {
      this.conversationHistory[0] = {
        role: 'system',
        content: this.buildSystemPrompt(),
      };
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): Message[] {
    return this.conversationHistory;
  }

  /**
   * Get used quotes (for debugging)
   */
  getUsedQuotes(): string[] {
    return Array.from(this.usedQuotes);
  }
}

// Export singleton instance
export const aiService = new AIService();
