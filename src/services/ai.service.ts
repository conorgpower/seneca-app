import { callAIProxy } from './ai-proxy';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// The system prompt, model choice, history trimming and daily limits all live
// in the deepseek-proxy Supabase edge function.

export class AIService {
  // Only plain user/assistant turns. Philosophy passages are attached to the
  // current request only, so they are never resent on later turns.
  private conversationHistory: Message[] = [];
  private usedQuotes: Set<string> = new Set();
  private usedTexts: Set<string> = new Set();
  private personalizationHint: string | null = null;

  /**
   * Extract quotes from text to track usage
   */
  private extractQuotes(text: string): string[] {
    const quotePatterns = [
      /"([^"]+)"/g, // Double quotes
      /\u201c([^\u201d]+)\u201d/g, // Curly quotes
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
   * Send a message and get AI response
   */
  async sendMessage(userMessage: string, context?: string): Promise<string> {
    // Skip context if we've already used this exact text
    if (context && this.usedTexts.has(context.toLowerCase().trim())) {
      context = undefined;
    }

    const aiResponse = await callAIProxy({
      feature: 'chat',
      message: userMessage,
      context,
      history: this.conversationHistory,
      personalizationHint: this.personalizationHint,
      avoidQuotes: Array.from(this.usedQuotes).slice(-5),
    });

    if (context) this.usedTexts.add(context.toLowerCase().trim());
    this.extractQuotes(aiResponse).forEach(quote => this.usedQuotes.add(quote));

    this.conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: aiResponse }
    );

    return aiResponse;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    this.usedQuotes.clear();
    this.usedTexts.clear();
  }

  /**
   * Set lightweight personalization context from onboarding answers.
   * This is intentionally low-priority guidance.
   */
  setPersonalizationHint(hint: string | null) {
    this.personalizationHint = hint;
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
