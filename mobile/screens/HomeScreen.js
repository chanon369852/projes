import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const response = await api.get('/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  if (!dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <Text>กำลังโหลด...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Card */}
      <LinearGradient
        colors={['#6366F1', '#4F46E5']}
        style={styles.welcomeCard}
      >
        <Text style={styles.greeting}>{dashboard.greeting}</Text>
        <Text style={styles.userName}>{user?.full_name}</Text>
        <Text style={styles.date}>วัน{dashboard.today?.day_name}ที่ {dashboard.today?.date}</Text>
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          icon="alert-circle"
          color="#EF4444"
          value={dashboard.tasks?.urgent_count || 0}
          label="งานเร่งด่วน"
        />
        <StatCard
          icon="calendar"
          color="#F59E0B"
          value={dashboard.today?.schedule_count || 0}
          label="คาบเรียนวันนี้"
        />
        <StatCard
          icon="wallet"
          color="#10B981"
          value={`฿${(dashboard.expenses?.summary?.total_expense || 0).toFixed(0)}`}
          label="ใช้จ่ายเดือนนี้"
        />
        <StatCard
          icon="brain"
          color={dashboard.stress?.level === 'high' ? '#EF4444' : '#10B981'}
          value={dashboard.stress?.score || 0}
          label="คะแนนความเครียด"
        />
      </View>

      {/* Today's Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ตารางเรียนวันนี้</Text>
        {dashboard.today?.schedule?.length > 0 ? (
          dashboard.today.schedule.map((item, index) => (
            <View key={index} style={[styles.scheduleItem, { borderLeftColor: item.color || '#6366F1' }]}>
              <Text style={styles.scheduleTime}>
                {item.start_time?.substring(0, 5)} - {item.end_time?.substring(0, 5)}
              </Text>
              <Text style={styles.scheduleSubject}>{item.subject_name}</Text>
              <Text style={styles.scheduleRoom}>{item.building} {item.room}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="coffee" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>วันนี้ไม่มีตารางเรียน</Text>
          </View>
        )}
      </View>

      {/* AI Suggestions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>คำแนะนำจาก AI</Text>
        {dashboard.ai_suggestions?.slice(0, 3).map((suggestion, index) => (
          <TouchableOpacity key={index} style={styles.suggestionCard}>
            <View style={[styles.suggestionIcon, { 
              backgroundColor: suggestion.priority === 'high' ? '#FEE2E2' : 
                               suggestion.priority === 'medium' ? '#FEF3C7' : '#D1FAE5'
            }]}>
              <Ionicons 
                name={suggestion.type === 'urgent_task' ? 'warning' : 
                      suggestion.type === 'stress_warning' ? 'brain' : 'bulb'} 
                size={20} 
                color={suggestion.priority === 'high' ? '#EF4444' : 
                       suggestion.priority === 'medium' ? '#F59E0B' : '#10B981'}
              />
            </View>
            <View style={styles.suggestionContent}>
              <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
              <Text style={styles.suggestionMessage}>{suggestion.message}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, color, value, label }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
  },
  greeting: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  date: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: 'white',
    margin: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  scheduleItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  scheduleTime: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
  },
  scheduleSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  scheduleRoom: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#9CA3AF',
    marginTop: 8,
  },
  suggestionCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  suggestionMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
