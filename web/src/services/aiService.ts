import api from './api';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thoughtProcess?: string[];
  sql?: string;
  data?: any[];
  dataCount?: number;
  pendingSql?: string; // SQL to fetch data for large datasets
  error?: string;
  errorType?: 'sql' | 'network' | 'llm' | 'general';
}

export interface AISuggestion {
  type: 'action' | 'insight' | 'reminder';
  title: string;
  description: string;
  action?: () => void;
}

class AIService {
  private conversationHistory: AIMessage[] = [];

  async chat(message: string, context?: Record<string, any>): Promise<{ response: string; data?: any[]; type: string }> {
    try {
      // Call the AI service backend
      const response = await api.post('/ai/chat', {
        message,
        context,
      });

      const result = response.data;
      
      this.conversationHistory.push(
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: result.response || result.message || 'No response', timestamp: new Date() }
      );
      
      return {
        response: result.response || result.message || 'No response',
        data: result.data,
        type: result.type || 'conversation'
      };
    } catch (error: any) {
      console.error('AI chat error:', error);
      // Fallback to pattern matching if AI service is unavailable
      const fallbackResponse = await this.generateResponse(message, context);
      return {
        response: fallbackResponse,
        type: 'conversation'
      };
    }
  }

  private async generateResponse(message: string, context?: Record<string, any>): Promise<string> {
    const lowerMessage = message.toLowerCase();

    // Pattern matching for common queries
    if (lowerMessage.includes('attendance') || lowerMessage.includes('absent')) {
      return `I can help you with attendance. Based on recent data, I see ${context?.absentCount || 0} students were absent today. Would you like me to show you the details or send notifications to parents?`;
    }

    if (lowerMessage.includes('fee') || lowerMessage.includes('payment')) {
      return `For fee-related queries, I found ${context?.pendingFees || 0} pending fee payments. I can help you generate reminders or view payment history. What would you like to do?`;
    }

    if (lowerMessage.includes('student') || lowerMessage.includes('admission')) {
      return `I can help you with student information. You have ${context?.totalStudents || 0} active students. Would you like to search for a specific student or view class-wise distribution?`;
    }

    if (lowerMessage.includes('exam') || lowerMessage.includes('result')) {
      return `For exam results, I can help you analyze performance, generate reports, or identify students who need extra attention. What would you like to know?`;
    }

    // Default response
    return `I'm here to help you manage your school ERP. I can assist with:
- Student information and admissions
- Fee management and payments
- Attendance tracking
- Exam results and analytics
- Generating reports
- Sending notifications

What would you like to do today?`;
  }

  async getSuggestions(context: Record<string, any>): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];

    // Attendance suggestions
    if (context.pendingAttendance > 0) {
      suggestions.push({
        type: 'reminder',
        title: 'Mark Attendance',
        description: `${context.pendingAttendance} classes need attendance marked today`,
      });
    }

    // Fee suggestions
    if (context.overdueFees > 0) {
      suggestions.push({
        type: 'action',
        title: 'Send Fee Reminders',
        description: `${context.overdueFees} students have overdue fees`,
      });
    }

    // Performance insights
    if (context.lowPerformers > 0) {
      suggestions.push({
        type: 'insight',
        title: 'Performance Alert',
        description: `${context.lowPerformers} students need academic support`,
      });
    }

    return suggestions;
  }

  async smartSearch(query: string): Promise<any[]> {
    // This would integrate with a search API
    // For now, return empty array
    return [];
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getHistory(): AIMessage[] {
    return this.conversationHistory;
  }
}

export default new AIService();


