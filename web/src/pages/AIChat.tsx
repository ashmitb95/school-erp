import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Send, Sparkles, Loader, Code, Database, AlertCircle, BarChart3 } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions } from 'ag-grid-community';
import { AgChartsReact } from 'ag-charts-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { AIMessage } from '../services/aiService';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/Button/Button';
import Input from '../components/Input/Input';
import Card from '../components/Card/Card';
import styles from './AIChat.module.css';

const AIChat: React.FC = () => {
  const { user } = useAuthStore();
  const schoolId = user?.school_id;
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchedSqlRef = useRef<Set<string>>(new Set()); // Track which SQL queries we've already fetched

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
    refetchInterval: 60000, // Refetch every minute
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Effect to fetch data for messages with pending SQL
  useEffect(() => {
    const fetchPendingData = async () => {
      // Find the most recent message with pending SQL
      const messageWithPendingSql = messages
        .slice()
        .reverse()
        .find((msg) => msg.role === 'assistant' && msg.pendingSql && !msg.data);

      if (messageWithPendingSql && messageWithPendingSql.pendingSql) {
        // Check if we've already fetched this SQL
        const sqlHash = messageWithPendingSql.pendingSql.substring(0, 200); // Use first 200 chars as hash
        if (fetchedSqlRef.current.has(sqlHash)) {
          console.log('[Frontend] useEffect: Already fetched this SQL, skipping');
          return;
        }

        console.log('[Frontend] useEffect: Found message with pending SQL, fetching data...', {
          sql: messageWithPendingSql.pendingSql.substring(0, 100),
          count: messageWithPendingSql.dataCount,
          messageIndex: messages.indexOf(messageWithPendingSql)
        });

        // Mark as fetching
        fetchedSqlRef.current.add(sqlHash);

        try {
          const token = localStorage.getItem('auth-storage');
          let authToken = '';
          if (token) {
            try {
              const parsed = JSON.parse(token);
              authToken = parsed.state?.token || '';
            } catch (e) {
              // Ignore
            }
          }

          console.log('[Frontend] Making API call to /api/ai/execute-sql');
          const dataResponse = await fetch(`/api/ai/execute-sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
            },
            body: JSON.stringify({ sql: messageWithPendingSql.pendingSql }),
          });

          console.log('[Frontend] API response status:', dataResponse.status);

          if (dataResponse.ok) {
            const result = await dataResponse.json();
            const fetchedData = result.data || [];
            const fetchedCount = result.count || fetchedData.length;

            console.log('[Frontend] Successfully fetched data via API:', {
              dataLength: fetchedData.length,
              count: fetchedCount,
              sampleRow: fetchedData[0]
            });

            setMessages((prev) => {
              return prev.map((msg) => {
                // Match by pendingSql to avoid reference issues
                if (msg.pendingSql === messageWithPendingSql.pendingSql) {
                  return {
                    ...msg,
                    data: fetchedData,
                    dataCount: fetchedCount,
                    pendingSql: undefined, // Clear pending SQL
                  };
                }
                return msg;
              });
            });
          } else {
            const errorText = await dataResponse.text();
            console.error('[Frontend] Failed to fetch data via API:', dataResponse.status, errorText);
            // Remove from set so we can retry
            fetchedSqlRef.current.delete(sqlHash);
          }
        } catch (error) {
          console.error('[Frontend] Error fetching data via API:', error);
          // Remove from set so we can retry
          fetchedSqlRef.current.delete(sqlHash);
        }
      }
    };

    fetchPendingData();
  }, [messages]);

  const handleSend = async () => {
    console.log('[Frontend] handleSend called', { input: input.substring(0, 50), loading });

    if (!input.trim() || loading) {
      console.log('[Frontend] handleSend early return', { hasInput: !!input.trim(), loading });
      return;
    }

    const userMessage: AIMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    console.log('[Frontend] Adding user message to state');
    setMessages((prev) => [...prev, userMessage]);
    const query = input;
    setInput('');
    setLoading(true);
    console.log('[Frontend] Starting SSE connection...');

    // Create placeholder for streaming response
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

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      // Get auth token
      const token = localStorage.getItem('auth-storage');
      let authToken = '';
      if (token) {
        try {
          const parsed = JSON.parse(token);
          authToken = parsed.state?.token || '';
        } catch (e) {
          // Ignore
        }
      }

      // Build conversation history (last 10 messages for context)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Use fetch with streaming
      console.log('[Frontend] Making SSE request to /api/ai/chat/stream', {
        message: query.substring(0, 50),
        hasContext: !!context,
        conversationHistoryLength: conversationHistory.length
      });

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

      console.log('[Frontend] SSE response received:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Frontend] SSE response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        console.error('[Frontend] No response body reader available');
        throw new Error('No response body');
      }

      console.log('[Frontend] SSE stream reader created, starting to read...');

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
            console.log('[Frontend] SSE Event received:', currentEvent);
            continue;
          }

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            console.log('[Frontend] SSE Data received:', {
              event: currentEvent,
              dataLength: dataStr.length,
              dataPreview: dataStr.substring(0, 200),
              fullData: dataStr
            });

            try {
              const data = JSON.parse(dataStr);
              console.log('[Frontend] Parsed SSE data:', {
                event: currentEvent,
                hasData: !!data.data,
                hasFetchViaApi: !!data.fetchViaApi,
                hasSql: !!data.sql,
                hasToken: !!data.token,
                hasMessage: !!data.message,
                count: data.count,
                keys: Object.keys(data),
                fullData: data
              });

              // SPECIAL CHECK: If this is a data event, log it prominently
              if (currentEvent === 'data' || data.fetchViaApi || (data.sql && data.count !== undefined && !data.token)) {
                console.log('[Frontend] ⚠️ DATA EVENT DETECTED!', {
                  currentEvent,
                  fetchViaApi: data.fetchViaApi,
                  hasSql: !!data.sql,
                  hasData: !!data.data,
                  count: data.count,
                  hasToken: !!data.token,
                  fullData: data
                });
              }

              // Handle error events
              if (currentEvent === 'error' || data.error || (data.message && data.message.toLowerCase().includes('error'))) {
                errorMessage = data.message || data.error || 'An error occurred';

                // Determine error type
                if (errorMessage.toLowerCase().includes('sql') || errorMessage.toLowerCase().includes('query') || errorMessage.toLowerCase().includes('database')) {
                  errorType = 'sql';
                } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('connection')) {
                  errorType = 'network';
                } else if (errorMessage.toLowerCase().includes('llm') || errorMessage.toLowerCase().includes('api key') || errorMessage.toLowerCase().includes('anthropic') || errorMessage.toLowerCase().includes('openai')) {
                  errorType = 'llm';
                }

                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (updated[lastIndex]?.role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      error: errorMessage,
                      errorType,
                      content: currentContent || errorMessage,
                    };
                  }
                  return updated;
                });
                setLoading(false);
                continue;
              }

              // Handle different event types
              // IMPORTANT: Check data event FIRST before sql/token handlers
              if (currentEvent === 'data' || data.fetchViaApi || (data.sql && data.count !== undefined && !data.token)) {
                // Data event - can be direct data or a reference to fetch via API
                console.log('[Frontend] ⚠️ DATA EVENT HANDLER TRIGGERED:', {
                  currentEvent,
                  hasData: !!data.data,
                  hasFetchViaApi: !!data.fetchViaApi,
                  hasSql: !!data.sql,
                  count: data.count,
                  fullData: data,
                  allKeys: Object.keys(data)
                });

                if ((data.fetchViaApi && data.sql) || (data.sql && data.count !== undefined && !data.token && !data.message)) {
                  // Large dataset - store SQL for useEffect to fetch
                  console.log('[Frontend] Large dataset - storing SQL for API fetch:', {
                    sqlLength: data.sql.length,
                    count: data.count
                  });
                  const dataCount = data.count || 0;

                  // Store SQL and count - useEffect will handle the fetch
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (updated[lastIndex]?.role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        dataCount: dataCount,
                        pendingSql: data.sql, // Store SQL for useEffect to fetch
                      };
                    }
                    return updated;
                  });
                } else if (data.data) {
                  // Small dataset - data sent directly via SSE
                  queryData = data.data || [];
                  const dataCount = data.count !== undefined ? data.count : queryData.length;
                  console.log('[Frontend] Processing data event (direct):', {
                    event: currentEvent,
                    dataLength: queryData.length,
                    count: dataCount,
                    hasData: queryData.length > 0,
                    sampleRow: queryData[0]
                  });
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
              } else if (currentEvent === 'thinking' || (data.message && !data.token && !data.sql && !data.data && !data.error)) {
                // Thinking event
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
                // SQL event (but not if it's part of a data event with fetchViaApi)
                console.log('[Frontend] SQL event (standalone):', { currentEvent, hasSql: !!data.sql, fetchViaApi: data.fetchViaApi });
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
                // Token event - stream tokens as they arrive
                currentContent += data.token;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (updated[lastIndex]?.role === 'assistant') {
                    // Preserve existing data when updating content
                    const existingData = updated[lastIndex].data;
                    const existingCount = updated[lastIndex].dataCount;
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: currentContent,
                      // Always preserve existing data - don't overwrite it
                      data: existingData || (queryData.length > 0 ? queryData : undefined),
                      dataCount: existingCount || (queryData.length > 0 ? queryData.length : undefined),
                    };
                  }
                  return updated;
                });
              } else if (currentEvent === 'data' || data.data || data.fetchViaApi || data.sql) {
                // Data event - can be direct data or a reference to fetch via API
                // Also check for data.sql as a fallback since the event might not be set correctly
                console.log('[Frontend] ⚠️ DATA EVENT HANDLER TRIGGERED:', {
                  currentEvent,
                  hasData: !!data.data,
                  hasFetchViaApi: !!data.fetchViaApi,
                  hasSql: !!data.sql,
                  count: data.count,
                  fullData: data,
                  allKeys: Object.keys(data)
                });

                if ((data.fetchViaApi && data.sql) || (data.sql && !data.token && !data.message && currentEvent !== 'sql')) {
                  // Large dataset - store SQL for useEffect to fetch
                  console.log('[Frontend] Large dataset - storing SQL for API fetch:', {
                    sqlLength: data.sql.length,
                    count: data.count
                  });
                  const dataCount = data.count || 0;

                  // Store SQL and count - useEffect will handle the fetch
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (updated[lastIndex]?.role === 'assistant') {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        dataCount: dataCount,
                        pendingSql: data.sql, // Store SQL for useEffect to fetch
                      };
                    }
                    return updated;
                  });
                } else if (data.data) {
                  // Small dataset - data sent directly via SSE
                  queryData = data.data || [];
                  const dataCount = data.count !== undefined ? data.count : queryData.length;
                  console.log('[Frontend] Processing data event (direct):', {
                    event: currentEvent,
                    dataLength: queryData.length,
                    count: dataCount,
                    hasData: queryData.length > 0,
                    sampleRow: queryData[0]
                  });
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
                // Don't return here - continue processing
              } else if (data.type === 'data_query' || data.type === 'conversation' || data.type === 'error') {
                // Done event - but make sure data is set first
                console.log('[Frontend] Done event received:', {
                  type: data.type,
                  queryDataLength: queryData.length
                });
                if (queryData.length > 0) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (updated[lastIndex]?.role === 'assistant') {
                      // Always set data if we have it, even if it was set before
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
      if (error.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }

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

  // Generate column definitions from data
  const generateColumnDefs = (data: any[]): ColDef[] => {
    if (!data || data.length === 0) return [];

    const firstRow = data[0];
    const columns: ColDef[] = Object.keys(firstRow).map((key) => {
      // Determine column type and formatting
      const sampleValue = firstRow[key];
      let cellRenderer: any = undefined;
      let valueFormatter: any = undefined;

      if (typeof sampleValue === 'number') {
        if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
          valueFormatter = (params: any) => {
            if (params.value) {
              return new Date(params.value).toLocaleDateString();
            }
            return '';
          };
        } else if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('fee') || key.toLowerCase().includes('price')) {
          valueFormatter = (params: any) => {
            if (params.value) {
              return `₹${Number(params.value).toLocaleString('en-IN')}`;
            }
            return '';
          };
        }
      } else if (sampleValue instanceof Date) {
        valueFormatter = (params: any) => {
          if (params.value) {
            return new Date(params.value).toLocaleDateString();
          }
          return '';
        };
      }

      return {
        field: key,
        headerName: key
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        sortable: true,
        filter: true,
        resizable: true,
        flex: 1,
        minWidth: 100,
        valueFormatter,
        cellRenderer,
      };
    });

    return columns;
  };

  // Detect if data should be rendered as a chart
  const shouldRenderChart = (data: any[]): boolean => {
    if (!data || data.length === 0) return false;

    // Check if data has structure suitable for charts (e.g., categories and values)
    const firstRow = data[0];
    const keys = Object.keys(firstRow);

    // Look for common chart patterns
    const hasCategory = keys.some(k => k.toLowerCase().includes('category') || k.toLowerCase().includes('label') || k.toLowerCase().includes('name') || k.toLowerCase().includes('status') || k.toLowerCase().includes('type'));
    const hasValue = keys.some(k => k.toLowerCase().includes('count') || k.toLowerCase().includes('value') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('total') || k.toLowerCase().includes('sum') || k.toLowerCase().includes('avg') || k.toLowerCase().includes('average'));

    // Check if all values in value columns are numbers
    if (hasCategory && hasValue) {
      const valueKey = keys.find(k => k.toLowerCase().includes('count') || k.toLowerCase().includes('value') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('total') || k.toLowerCase().includes('sum') || k.toLowerCase().includes('avg') || k.toLowerCase().includes('average'));
      if (valueKey) {
        return data.every(row => typeof row[valueKey] === 'number' || !isNaN(Number(row[valueKey])));
      }
    }

    return false;
  };

  // Generate chart options from data
  const generateChartOptions = (data: any[]): any => {
    if (!data || data.length === 0) return null;

    const firstRow = data[0];
    const keys = Object.keys(firstRow);

    // Find category and value keys
    const categoryKey = keys.find(k =>
      k.toLowerCase().includes('category') ||
      k.toLowerCase().includes('label') ||
      k.toLowerCase().includes('name') ||
      k.toLowerCase().includes('status') ||
      k.toLowerCase().includes('type') ||
      k.toLowerCase().includes('class') ||
      k.toLowerCase().includes('subject')
    ) || keys[0];

    const valueKey = keys.find(k =>
      k.toLowerCase().includes('count') ||
      k.toLowerCase().includes('value') ||
      k.toLowerCase().includes('amount') ||
      k.toLowerCase().includes('total') ||
      k.toLowerCase().includes('sum') ||
      k.toLowerCase().includes('avg') ||
      k.toLowerCase().includes('average') ||
      k.toLowerCase().includes('percentage')
    ) || keys[1];

    if (!categoryKey || !valueKey) return null;

    // Determine chart type based on data
    const chartType = data.length <= 10 ? 'pie' : 'bar';

    const chartData = data.map(row => ({
      [categoryKey]: String(row[categoryKey] || ''),
      [valueKey]: Number(row[valueKey]) || 0,
    }));

    if (chartType === 'pie') {
      return {
        data: chartData,
        series: [
          {
            type: 'pie',
            angleKey: valueKey,
            labelKey: categoryKey,
            fills: [
              '#474448', // gunmetal
              '#534b52', // taupe-grey
              '#2d232e', // shadow-grey
              '#e0ddcf', // bone
              '#F59E0B', // orange for warnings
              '#EF4444', // red for errors
            ],
            strokes: [
              '#474448',
              '#534b52',
              '#2d232e',
              '#e0ddcf',
              '#F59E0B',
              '#EF4444',
            ],
          },
        ],
        legend: {
          enabled: true,
          position: 'bottom',
        },
      };
    } else {
      return {
        data: chartData,
        series: [
          {
            type: 'bar',
            xKey: categoryKey,
            yKey: valueKey,
            fill: 'var(--color-primary)',
            stroke: 'var(--color-primary)',
          },
        ],
        axes: [
          {
            type: 'category',
            position: 'bottom',
          },
          {
            type: 'number',
            position: 'left',
          },
        ],
      };
    }
  };

  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  const gridOptions: GridOptions = {
    enableCellTextSelection: true,
    suppressCellFocus: true,
    animateRows: true,
    pagination: true,
    paginationPageSize: 20,
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.aiIcon}>
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className={styles.title}>AI Assistant</h1>
            <p className={styles.subtitle}>Ask me anything about your school - I'll respond in real-time!</p>
          </div>
        </div>
      </div>

      <div className={styles.messagesContainer}>
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <Sparkles size={48} className={styles.emptyIcon} />
            <h2>Start a conversation</h2>
            <p>Ask me about students, fees, attendance, exams, or anything else!</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.7 }}>
              Try: "how many students have unpaid library fees in the last month?"
            </p>
          </div>
        )}

        {messages.map((message, index) => {
          // Debug: log message data for troubleshooting
          if (message.role === 'assistant' && message.data) {
            console.log(`[Frontend] Rendering message ${index} with data:`, {
              hasData: !!message.data,
              dataLength: message.data?.length,
              dataCount: message.dataCount,
              sample: message.data?.[0]
            });
          }

          return (
            <div
              key={index}
              className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.aiMessage}`}
            >
              <Card padding="md" className={styles.messageCard}>
                {message.role === 'assistant' && (
                  <>
                    {/* Error Display */}
                    {message.error && (
                      <div className={styles.errorDisplay}>
                        <div className={styles.errorHeader}>
                          <AlertCircle size={16} />
                          <span>
                            {message.errorType === 'sql' && 'SQL Error'}
                            {message.errorType === 'network' && 'Network Error'}
                            {message.errorType === 'llm' && 'AI Service Error'}
                            {!message.errorType && 'Error'}
                          </span>
                        </div>
                        <div className={styles.errorMessage}>{message.error}</div>
                        {message.sql && (
                          <div className={styles.errorSQL}>
                            <strong>SQL Query:</strong>
                            <pre>{message.sql}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Thought Process */}
                    {!message.error && message.thoughtProcess && message.thoughtProcess.length > 0 && (
                      <div className={styles.thoughtProcess}>
                        <div className={styles.thoughtHeader}>
                          <Loader size={14} className={styles.spinner} />
                          <span>Thinking...</span>
                        </div>
                        <ul className={styles.thoughtList}>
                          {message.thoughtProcess.map((thought, idx) => (
                            <li key={idx}>{thought}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* SQL Display */}
                    {!message.error && message.sql && (
                      <div className={styles.sqlDisplay}>
                        <div className={styles.sqlHeader}>
                          <Code size={14} />
                          <span>Generated SQL</span>
                        </div>
                        <pre className={styles.sqlCode}>
                          <code>{message.sql}</code>
                        </pre>
                      </div>
                    )}

                    {/* Main Content - Markdown */}
                    {!message.error && message.content && (
                      <div className={styles.messageContent}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Chart Display */}
                    {!message.error && message.data && message.data.length > 0 && shouldRenderChart(message.data) && (
                      <div className={styles.chartDisplay}>
                        <div className={styles.chartHeader}>
                          <BarChart3 size={14} />
                          <span>Visualization</span>
                        </div>
                        <div style={{ height: '300px', marginTop: '0.75rem' }}>
                          <AgChartsReact options={generateChartOptions(message.data)} />
                        </div>
                      </div>
                    )}

                    {/* Data Table */}
                    {!message.error && message.data && message.data.length > 0 && (
                      <div className={styles.dataTable}>
                        <div className={styles.dataHeader}>
                          <Database size={14} />
                          <span>Query Results ({message.dataCount !== undefined ? message.dataCount : message.data.length} {(message.dataCount !== undefined ? message.dataCount : message.data.length) === 1 ? 'row' : 'rows'})</span>
                        </div>
                        <div className="ag-theme-alpine" style={{ height: '400px', width: '100%', marginTop: '0.75rem' }}>
                          <AgGridReact
                            rowData={message.data}
                            columnDefs={generateColumnDefs(message.data)}
                            defaultColDef={defaultColDef}
                            gridOptions={gridOptions}
                            getRowId={(params) => {
                              // Try to find an ID field
                              if (params.data.id) return params.data.id;
                              if (params.data.student_id) return params.data.student_id;
                              // Generate a unique ID from the data
                              const dataStr = JSON.stringify(params.data);
                              return `${index}-${dataStr.substring(0, 50)}`;
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {message.role === 'user' && (
                  <div className={styles.messageContent}>{message.content}</div>
                )}

                <div className={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </Card>
            </div>
          );
        })}

        {loading && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && !messages[messages.length - 1]?.error && (
          <div className={styles.message}>
            <Card padding="md" className={styles.messageCard}>
              <div className={styles.loading}>
                <Loader size={16} className={styles.spinner} />
                <span>Thinking...</span>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputContainer}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything..."
          fullWidth
          disabled={loading}
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()} icon={<Send size={18} />}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default AIChat;
