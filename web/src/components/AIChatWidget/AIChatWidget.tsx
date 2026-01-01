import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Send, Sparkles, X, Minimize2, Maximize2, Loader, Code, Database, AlertCircle, BarChart3 } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions } from 'ag-grid-community';
import { AgChartsReact } from 'ag-charts-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { AIMessage } from '../../services/aiService';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import Button from '../Button/Button';
import Input from '../Input/Input';
import Card from '../Card/Card';
import styles from './AIChatWidget.module.css';

const AIChatWidget: React.FC = () => {
  const { user } = useAuthStore();
  const schoolId = user?.school_id;
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchedSqlRef = useRef<Set<string>>(new Set());

  // Fetch context for AI - filtered by school_id
  const { data: context } = useQuery(['ai-context', schoolId], async () => {
    if (!schoolId) return { totalStudents: 0, pendingFees: 0, absentCount: 0 };
    const today = new Date().toISOString().split('T')[0];
    const [students, pendingFees, attendance] = await Promise.all([
      api.get(`/student?school_id=${schoolId}&limit=1`).catch(() => ({ data: { pagination: { total: 0 } } })),
      api.get(`/fees?school_id=${schoolId}&status=pending&limit=1`).catch(() => ({ data: { pagination: { total: 0 } } })),
      api.get(`/attendance/stats?school_id=${schoolId}&start_date=${today}&end_date=${today}`).catch(() => ({ data: { stats: [] } })),
    ]);

    const attendanceStats = attendance.data.stats || [];
    const absentCount = attendanceStats.find((s: any) => s.status === 'absent')?.count || 0;

    return {
      totalStudents: students.data.pagination?.total || 0,
      pendingFees: pendingFees.data.pagination?.total || 0,
      absentCount: parseInt(absentCount),
    };
  }, {
    enabled: !!schoolId,
    refetchInterval: 60000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Effect to fetch data for messages with pending SQL (same logic as AIChat)
  useEffect(() => {
    const fetchPendingData = async () => {
      const messageWithPendingSql = messages
        .slice()
        .reverse()
        .find((msg) => msg.role === 'assistant' && msg.pendingSql && !msg.data);

      if (messageWithPendingSql && messageWithPendingSql.pendingSql) {
        const sqlHash = messageWithPendingSql.pendingSql.substring(0, 200);
        if (fetchedSqlRef.current.has(sqlHash)) return;

        fetchedSqlRef.current.add(sqlHash);

        try {
          const token = localStorage.getItem('auth-storage');
          let authToken = '';
          if (token) {
            try {
              const parsed = JSON.parse(token);
              authToken = parsed.state?.token || '';
            } catch (e) {}
          }

          const dataResponse = await fetch(`/api/ai/execute-sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
            },
            body: JSON.stringify({ sql: messageWithPendingSql.pendingSql }),
          });

          if (dataResponse.ok) {
            const result = await dataResponse.json();
            const fetchedData = result.data || [];
            const fetchedCount = result.count || fetchedData.length;

            setMessages((prev) => {
              return prev.map((msg) => {
                if (msg.pendingSql === messageWithPendingSql.pendingSql) {
                  return {
                    ...msg,
                    data: fetchedData,
                    dataCount: fetchedCount,
                    pendingSql: undefined,
                  };
                }
                return msg;
              });
            });
          } else {
            fetchedSqlRef.current.delete(sqlHash);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          fetchedSqlRef.current.delete(sqlHash);
        }
      }
    };

    fetchPendingData();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: AIMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const query = input;
    setInput('');
    setLoading(true);

    const assistantMessage: AIMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thoughtProcess: [],
      sql: undefined,
      data: undefined,
      error: undefined,
      errorType: undefined,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const token = localStorage.getItem('auth-storage');
      let authToken = '';
      if (token) {
        try {
          const parsed = JSON.parse(token);
          authToken = parsed.state?.token || '';
        } catch (e) {}
      }

      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch(`/api/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          message: query,
          context: context || {},
          conversationHistory: conversationHistory,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let currentContent = '';
      let queryData: any[] = [];
      let generatedSQL = '';
      let thoughtProcess: string[] = [];
      let currentEvent = '';
      let errorMessage = '';
      let errorType: 'sql' | 'network' | 'llm' | 'general' = 'general';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (data.error) {
                errorMessage = data.error;
                errorType = data.errorType || 'general';
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (updated[lastIndex]?.role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      error: errorMessage,
                      errorType: errorType,
                    };
                  }
                  return updated;
                });
              } else if (currentEvent === 'thinking' || (data.message && !data.token && !data.sql && !data.data && !data.error)) {
                const thought = data.message || data;
                if (typeof thought === 'string' && thought) {
                  thoughtProcess.push(thought);
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (updated[lastIndex]?.role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        thoughtProcess: [...(updated[lastIndex].thoughtProcess || []), thought],
                      };
                    }
                    return updated;
                  });
                }
              } else if ((currentEvent === 'sql' || data.sql) && !data.fetchViaApi && data.count === undefined) {
                generatedSQL = data.sql || data;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (updated[lastIndex]?.role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      sql: generatedSQL,
                    };
                  }
                  return updated;
                });
              } else if (data.token) {
                currentContent += data.token;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (updated[lastIndex]?.role === 'assistant') {
                    const existingData = updated[lastIndex].data;
                    const existingCount = updated[lastIndex].dataCount;
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: currentContent,
                      data: existingData || (queryData.length > 0 ? queryData : undefined),
                      dataCount: existingCount || (queryData.length > 0 ? queryData.length : undefined),
                    };
                  }
                  return updated;
                });
              } else if (currentEvent === 'data' || data.data || data.fetchViaApi || data.sql) {
                if ((data.fetchViaApi && data.sql) || (data.sql && !data.token && !data.message && currentEvent !== 'sql')) {
                  const dataCount = data.count || 0;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (updated[lastIndex]?.role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        dataCount: dataCount,
                        pendingSql: data.sql,
                      };
                    }
                    return updated;
                  });
                } else if (data.data) {
                  queryData = data.data || [];
                  const dataCount = data.count !== undefined ? data.count : queryData.length;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (updated[lastIndex]?.role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        data: queryData,
                        dataCount: dataCount,
                      };
                    }
                    return updated;
                  });
                }
              } else if (data.type === 'data_query' || data.type === 'conversation' || data.type === 'error') {
                if (queryData.length > 0) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (updated[lastIndex]?.role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        data: queryData,
                        dataCount: queryData.length,
                      };
                    }
                    return updated;
                  });
                }
                setLoading(false);
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setLoading(false);
    } catch (error: any) {
      if (error.name === 'AbortError') return;

      const errorMessage: AIMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        error: error.message || 'Sorry, I encountered an error. Please try again.',
        errorType: error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('fetch') ? 'network' : 'general',
      };
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (updated[lastIndex]?.role === 'assistant') {
          updated[lastIndex] = errorMessage;
        } else {
          updated.push(errorMessage);
        }
        return updated;
      });
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const generateColumnDefs = (data: any[]): ColDef[] => {
    if (!data || data.length === 0) return [];

    const firstRow = data[0];
    return Object.keys(firstRow).map((key) => {
      const sampleValue = firstRow[key];
      let cellRenderer: any = undefined;
      let valueFormatter: any = undefined;

      if (typeof sampleValue === 'number') {
        if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
          valueFormatter = (params: any) => new Date(params.value).toLocaleDateString();
        } else {
          valueFormatter = (params: any) => params.value.toLocaleString();
        }
      } else if (typeof sampleValue === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('time'))) {
        valueFormatter = (params: any) => new Date(params.value).toLocaleDateString();
      }

      return {
        headerName: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        field: key,
        flex: 1,
        minWidth: 100,
        cellRenderer,
        valueFormatter,
      };
    });
  };

  if (!isOpen) {
    return (
      <button
        className={styles.chatButton}
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
      >
        <Sparkles size={20} />
        <span>AI Assistant</span>
      </button>
    );
  }

  return (
    <div className={`${styles.chatWidget} ${isMinimized ? styles.minimized : ''}`}>
      <div className={styles.chatHeader}>
        <div className={styles.headerContent}>
          <div className={styles.aiIcon}>
            <Sparkles size={18} />
          </div>
          <div>
            <div className={styles.title}>AI Assistant</div>
            <div className={styles.subtitle}>Ask me anything about your school</div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.iconButton}
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
          </button>
          <button
            className={styles.iconButton}
            onClick={() => {
              setIsOpen(false);
              setIsMinimized(false);
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className={styles.messagesContainer} ref={messagesEndRef}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <Sparkles size={48} className={styles.emptyIcon} />
                <h3>Ask me anything!</h3>
                <p>I can help you with student data, attendance, fees, exams, and more.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.aiMessage}`}
                >
                  <div className={styles.messageCard}>
                    {message.role === 'assistant' && message.thoughtProcess && message.thoughtProcess.length > 0 && (
                      <div className={styles.thoughtProcess}>
                        {message.thoughtProcess.map((thought, i) => (
                          <div key={i} className={styles.thoughtItem}>
                            <Code size={12} />
                            <span>{thought}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {message.error ? (
                      <div className={styles.errorMessage}>
                        <AlertCircle size={16} />
                        <span>{message.error}</span>
                      </div>
                    ) : (
                      <>
                        {message.content && (
                          <div className={styles.messageContent}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}

                        {message.sql && (
                          <div className={styles.sqlBlock}>
                            <div className={styles.sqlHeader}>
                              <Database size={14} />
                              <span>Generated SQL</span>
                            </div>
                            <pre className={styles.sqlCode}>{message.sql}</pre>
                          </div>
                        )}

                        {message.data && message.data.length > 0 && (
                          <div className={styles.dataBlock}>
                            <div className={styles.dataHeader}>
                              <BarChart3 size={14} />
                              <span>Results ({message.dataCount || message.data.length} rows)</span>
                            </div>
                            <div className={styles.dataTable}>
                              <AgGridReact
                                columnDefs={generateColumnDefs(message.data)}
                                rowData={message.data}
                                defaultColDef={{ sortable: true, filter: true, resizable: true }}
                                domLayout="autoHeight"
                                gridOptions={{ suppressCellFocus: true } as GridOptions}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className={styles.loadingMessage}>
                <Loader size={16} className={styles.spinner} />
                <span>Thinking...</span>
              </div>
            )}
          </div>

          <div className={styles.inputContainer}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your school data..."
              disabled={loading}
              fullWidth
            />
            <Button
              icon={loading ? <Loader size={16} className={styles.spinner} /> : <Send size={16} />}
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className={styles.sendButton}
            >
              Send
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AIChatWidget;

