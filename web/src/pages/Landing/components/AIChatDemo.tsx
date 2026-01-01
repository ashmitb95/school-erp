import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Database, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AIChatDemo.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  data?: any[];
  timestamp: Date;
}

const AIChatDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const hasAutoSentRef = useRef(false);

  const demoQueries = [
    "How many students have unpaid fees?",
    "Show me attendance statistics for this month",
    "Which students scored below 40% in recent exams?",
  ];

  const handleSend = (query?: string) => {
    const userQuery = query || input;
    if (!userQuery.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: userQuery,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const response = generateResponse(userQuery);
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 1500);
  };

  const generateResponse = (query: string): Message => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('fee') || lowerQuery.includes('unpaid')) {
      return {
        role: 'assistant',
        content: `I found **23 students** with unpaid fees totaling **₹1,45,000**. Here are the details:`,
        sql: `SELECT s.first_name, s.last_name, f.amount, f.due_date 
FROM fees f 
JOIN students s ON f.student_id = s.id 
WHERE f.status = 'pending' 
ORDER BY f.due_date ASC;`,
        data: [
          { first_name: 'Rahul', last_name: 'Sharma', amount: 5000, due_date: '2024-01-15' },
          { first_name: 'Priya', last_name: 'Patel', amount: 7500, due_date: '2024-01-20' },
          { first_name: 'Amit', last_name: 'Kumar', amount: 6000, due_date: '2024-01-25' },
        ],
        timestamp: new Date(),
      };
    }

    if (lowerQuery.includes('attendance')) {
      return {
        role: 'assistant',
        content: `Here's the attendance statistics for this month:\n\n- **Present**: 1,245 students (92%)\n- **Absent**: 85 students (6%)\n- **Late**: 25 students (2%)`,
        timestamp: new Date(),
      };
    }

    if (lowerQuery.includes('score') || lowerQuery.includes('exam')) {
      return {
        role: 'assistant',
        content: `I found **12 students** who scored below 40% in recent exams. Here are the details:`,
        sql: `SELECT s.first_name, s.last_name, er.marks_obtained, er.max_marks, 
ROUND((er.marks_obtained::float / er.max_marks * 100), 2) as percentage
FROM exam_results er
JOIN students s ON er.student_id = s.id
WHERE (er.marks_obtained::float / er.max_marks * 100) < 40
ORDER BY percentage ASC;`,
        data: [
          { first_name: 'Raj', last_name: 'Singh', marks_obtained: 28, max_marks: 100, percentage: 28 },
          { first_name: 'Sneha', last_name: 'Verma', marks_obtained: 32, max_marks: 100, percentage: 32 },
          { first_name: 'Vikram', last_name: 'Gupta', marks_obtained: 35, max_marks: 100, percentage: 35 },
        ],
        timestamp: new Date(),
      };
    }

    return {
      role: 'assistant',
      content: `I understand you're asking about: "${query}". I can help you query your school database using natural language. Try asking about students, fees, attendance, or exams!`,
      timestamp: new Date(),
    };
  };

  useEffect(() => {
    // Auto-start with first demo query - only once
    if (messages.length === 0 && !hasAutoSentRef.current) {
      hasAutoSentRef.current = true;
      const timer = setTimeout(() => {
        handleSend(demoQueries[0]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []); // Empty deps - only run on mount

  return (
    <div className={styles.chatDemo}>
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderContent}>
          <div className={styles.aiIcon}>
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className={styles.chatTitle}>AI Assistant</h3>
            <p className={styles.chatSubtitle}>Ask questions in natural language</p>
          </div>
        </div>
      </div>

      <div className={styles.messagesContainer}>
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.aiMessage}`}
            >
              {message.role === 'assistant' && (
                <>
                  {message.sql && (
                    <div className={styles.sqlDisplay}>
                      <Database size={14} />
                      <pre className={styles.sqlCode}>{message.sql}</pre>
                    </div>
                  )}
                  <div className={styles.messageContent}>{message.content}</div>
                  {message.data && message.data.length > 0 && (
                    <div className={styles.dataTable}>
                      <div className={styles.dataHeader}>
                        <BarChart3 size={14} />
                        <span>Query Results ({message.data.length} rows)</span>
                      </div>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            {Object.keys(message.data[0]).map((key) => (
                              <th key={key}>{key.replace('_', ' ')}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {message.data.map((row, idx) => (
                            <tr key={idx}>
                              {Object.values(row).map((value: any, cellIdx) => (
                                <td key={cellIdx}>{value}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              {message.role === 'user' && (
                <div className={styles.messageContent}>{message.content}</div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.typingIndicator}
          >
            <div className={styles.typingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </motion.div>
        )}

        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <Sparkles size={32} />
            <p>Try asking a question...</p>
            <div className={styles.demoQueries}>
              {demoQueries.map((query, idx) => (
                <button
                  key={idx}
                  className={styles.demoQueryButton}
                  onClick={() => handleSend(query)}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.inputContainer}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask me anything about your school..."
          className={styles.input}
          disabled={isTyping}
        />
        <button
          onClick={() => handleSend()}
          className={styles.sendButton}
          disabled={isTyping || !input.trim()}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIChatDemo;

