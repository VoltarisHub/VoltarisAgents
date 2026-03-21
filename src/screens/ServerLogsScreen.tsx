import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Dialog from '../components/Dialog';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { RootStackParamList } from '../types/navigation';
import AppHeader from '../components/AppHeader';
import { logger } from '../utils/logger';
import type { LogMetadata } from '../utils/logger';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  category?: string;
  metadata?: LogMetadata;
}

export default function ServerLogsScreen() {
  const { theme: currentTheme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const themeColors = theme[currentTheme as 'light' | 'dark'];
  const scrollViewRef = useRef<ScrollView>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [clearDialogVisible, setClearDialogVisible] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('all');

  const FILTERS = ['all', 'inference', 'http', 'server', 'model', 'error'] as const;

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const maskSensitiveData = useCallback((value: string) => {
    if (!value) {
      return '';
    }

    let masked = value;
    masked = masked.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[email]');
    masked = masked.replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '[ip]');
    masked = masked.replace(/(Bearer|Token)\s+[A-Za-z0-9\-._~+/]+=*/gi, (_, label) => `${label} [redacted]`);
    masked = masked.replace(/(api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*([^\s]+)/gi, (match, label) => `${label.toLowerCase()}: [redacted]`);
    masked = masked.replace(/([?&](?:token|key|apikey|api_key|access_token|secret)=)([^&\s]+)/gi, (_, prefix) => `${prefix}[redacted]`);
    return masked;
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const serverLogs = await logger.getLogs();
      const normalizeNumber = (value: number) => {
        const formatted = value.toString();
        return formatted.padStart(2, '0');
      };
      const formatted = [...serverLogs]
        .reverse()
        .map((log: any, index: number) => {
          const timestampMs = typeof log.timestamp === 'number' ? log.timestamp : Date.now();
          const date = new Date(timestampMs);
          const year = date.getFullYear();
          const month = normalizeNumber(date.getMonth() + 1);
          const day = normalizeNumber(date.getDate());
          const hours = normalizeNumber(date.getHours());
          const minutes = normalizeNumber(date.getMinutes());
          const seconds = normalizeNumber(date.getSeconds());
          const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          const messageSource = log.msg || log.message || String(log);

          return {
            id: `${timestampMs}-${index}`,
            timestamp,
            level: (log.level || 'INFO').toUpperCase(),
            message: maskSensitiveData(String(messageSource)),
            category: log.category || 'server',
            metadata: log.metadata || undefined,
          };
        });
      setLogs(formatted);

      if (autoScroll && scrollViewRef.current) {
        requestAnimationFrame(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        });
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }, [autoScroll, maskSensitiveData]);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
      const interval = setInterval(loadLogs, 1000);
      return () => {
        clearInterval(interval);
      };
    }, [loadLogs])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadLogs();
    setIsRefreshing(false);
  }, [loadLogs]);

  const handleClearLogs = async () => {
    try {
      await logger.clearLogs();
      setLogs([]);
      setClearDialogVisible(false);
    } catch (error) {
      setClearDialogVisible(false);
    }
  };

  const getLevelColor = (level: string) => {
    const normalized = level.toUpperCase();

    switch (normalized) {
      case 'ERROR':
        return '#FF5C5C';
      case 'WARN':
        return '#FFC15C';
      case 'INFO':
        return themeColors.primary;
      case 'DEBUG':
        return '#9E9E9E';
      default:
        return '#FFFFFF';
    }
  };

  const getLevelIcon = (level: string) => {
    const normalized = level.toUpperCase();

    switch (normalized) {
      case 'ERROR':
        return 'alert-circle';
      case 'WARN':
        return 'alert';
      case 'INFO':
        return 'information';
      case 'DEBUG':
        return 'bug';
      default:
        return 'circle';
    }
  };

  const truncate = (text: string, max: number) => {
    if (text.length <= max) return text;
    return text.slice(0, max) + '...';
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'error') return log.level === 'ERROR';
    return log.category === filter;
  });

  const renderParams = (params: Record<string, any>) => {
    return Object.entries(params).map(([key, val]) => (
      <View key={key} style={styles.paramRow}>
        <Text style={styles.paramKey}>{key}</Text>
        <Text style={styles.paramVal}>{Array.isArray(val) ? val.join(', ') : String(val)}</Text>
      </View>
    ));
  };

  const renderMessages = (messages: Array<{ role: string; content: string }>) => {
    return messages.map((msg, i) => {
      const roleColor = msg.role === 'system' ? '#FF9F43' : msg.role === 'assistant' ? '#52D274' : '#4D7BFF';
      return (
        <View key={`${msg.role}-${i}`} style={styles.msgEntry}>
          <Text style={[styles.msgRole, { color: roleColor }]}>{msg.role}</Text>
          <Text style={styles.msgContent}>{truncate(maskSensitiveData(msg.content), 500)}</Text>
        </View>
      );
    });
  };

  const renderInference = (log: LogEntry) => {
    const meta = log.metadata;
    if (!meta) return null;
    const expanded = expandedIds.has(log.id);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => toggleExpand(log.id)}
        style={[styles.inferenceEntry, { borderLeftColor: meta.response ? '#52D274' : '#4D7BFF' }]}
      >
        <View style={styles.inferenceHeader}>
          <View style={styles.inferenceHeaderLeft}>
            <MaterialCommunityIcons
              name={meta.response ? 'check-circle' : 'arrow-right-circle'}
              size={14}
              color={meta.response ? '#52D274' : '#4D7BFF'}
            />
            <Text style={styles.inferenceTitle}>
              {meta.response ? 'Completion' : 'Request'}
            </Text>
            <Text style={styles.inferenceModel}>{meta.model}</Text>
            {meta.stream && <Text style={styles.streamBadge}>STREAM</Text>}
          </View>
          <View style={styles.inferenceHeaderRight}>
            {meta.duration != null && (
              <Text style={styles.durationText}>{meta.duration}ms</Text>
            )}
            <Text style={styles.logTimestamp}>{log.timestamp}</Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#666"
            />
          </View>
        </View>

        {expanded && (
          <View style={styles.inferenceBody}>
            {meta.endpoint && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Endpoint</Text>
                <Text style={styles.detailValue}>{meta.endpoint}</Text>
              </View>
            )}

            {meta.params && Object.keys(meta.params).length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Parameters</Text>
                <View style={styles.paramsGrid}>{renderParams(meta.params)}</View>
              </View>
            )}

            {meta.messages && meta.messages.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Messages ({meta.messages.length})</Text>
                {renderMessages(meta.messages)}
              </View>
            )}

            {meta.response && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Response</Text>
                <Text style={styles.responseText}>{truncate(maskSensitiveData(meta.response), 1000)}</Text>
              </View>
            )}

            {meta.status != null && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, { color: meta.status < 400 ? '#52D274' : '#FF5C5C' }]}>
                  {meta.status}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Server Logs"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightButtons={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setAutoScroll((prev) => !prev)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name={autoScroll ? 'arrow-down-bold' : 'arrow-down-bold-outline'}
                size={20}
                color={autoScroll ? themeColors.primary : '#FFFFFF'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setClearDialogVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.section}>
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.countText}>{filteredLogs.length}</Text>
        </View>
        <ScrollView
          ref={scrollViewRef}
          style={styles.logsContainer}
          contentContainerStyle={styles.logsContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#FFFFFF"
              colors={['#FFFFFF']}
              progressBackgroundColor="#101010"
            />
          }
          showsVerticalScrollIndicator
          onContentSizeChange={() => {
            if (autoScroll && scrollViewRef.current) {
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          }}
        >
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="text-box-outline" size={48} color="#FFFFFF" />
              <Text style={styles.emptyText}>No logs available</Text>
              <Text style={styles.emptySubtext}>
                Server logs will appear here when generated
              </Text>
            </View>
          ) : (
            filteredLogs.map((log) => {
              if (log.metadata) {
                return <React.Fragment key={log.id}>{renderInference(log)}</React.Fragment>;
              }

              return (
                <View key={log.id} style={[styles.logEntry, { borderLeftColor: getLevelColor(log.level) }]}>
                  <Text style={styles.logLine}>
                    <Text style={styles.logTimestamp}>[{log.timestamp}]</Text>
                    <Text style={[styles.logLevelTag, { color: getLevelColor(log.level) }]}>{` [${log.level}]`}</Text>
                    {log.category && (
                      <Text style={styles.logCategoryTag}>{` [${log.category}]`}</Text>
                    )}
                    <Text style={styles.logMessage}>{` ${log.message}`}</Text>
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={handleRefresh}>
          <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.footerButtonText}>Refresh</Text>
        </TouchableOpacity>
        <Text style={styles.autoScrollText}>Auto-scroll: {autoScroll ? 'ON' : 'OFF'}</Text>
      </View>

      <Dialog
        visible={clearDialogVisible}
        onDismiss={() => setClearDialogVisible(false)}
        title="Clear Logs"
        description="Are you sure you want to clear all server logs?"
        primaryButtonText="Clear"
        onPrimaryPress={handleClearLogs}
        secondaryButtonText="Cancel"
        onSecondaryPress={() => setClearDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterContent: {
    gap: 6,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#222',
  },
  filterChipActive: {
    backgroundColor: '#1A2940',
    borderColor: '#4D7BFF',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 0.5,
  },
  filterTextActive: {
    color: '#4D7BFF',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
    marginLeft: 6,
  },
  logsContainer: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#111111',
    backgroundColor: '#050505',
  },
  logsContent: {
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 20,
    color: '#A0A0A0',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  logEntry: {
    paddingVertical: 6,
    borderLeftWidth: 2,
    marginBottom: 4,
  },
  logLine: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
    color: '#E4E4E4',
  },
  logTimestamp: {
    color: '#4D7BFF',
    fontSize: 11,
  },
  logLevelTag: {
    fontWeight: '700',
  },
  logCategoryTag: {
    color: '#52D274',
  },
  logMessage: {
    color: '#E4E4E4',
  },
  inferenceEntry: {
    borderLeftWidth: 3,
    borderRadius: 8,
    backgroundColor: '#0A0A0A',
    marginBottom: 6,
    overflow: 'hidden',
  },
  inferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inferenceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  inferenceHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inferenceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E4E4E4',
  },
  inferenceModel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#888',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  streamBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF9F43',
    backgroundColor: '#2A1A00',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#52D274',
  },
  inferenceBody: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#151515',
  },
  detailSection: {
    marginTop: 10,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#CCC',
  },
  paramsGrid: {
    backgroundColor: '#0F0F0F',
    borderRadius: 6,
    padding: 8,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  paramKey: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#4D7BFF',
  },
  paramVal: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#CCC',
  },
  msgEntry: {
    backgroundColor: '#0F0F0F',
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  msgRole: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  msgContent: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 17,
    color: '#D0D0D0',
  },
  responseText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 17,
    color: '#52D274',
    backgroundColor: '#0A1A0A',
    borderRadius: 6,
    padding: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
    backgroundColor: '#050505',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  autoScrollText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '500',
  },
});
