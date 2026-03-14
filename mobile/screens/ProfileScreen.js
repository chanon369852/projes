import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const [stats, setStats] = useState({
    completedTasks: 0,
    totalTasks: 0,
    totalExpenses: 0,
    studyHours: 0,
  });
  const [weeklyData, setWeeklyData] = useState({
    labels: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
  });

  useEffect(() => {
    loadStats();
    loadWeeklyData();
  }, []);

  async function loadStats() {
    try {
      const [tasksRes, expensesRes] = await Promise.all([
        api.get('/tasks/stats/summary'),
        api.get('/expenses/summary/monthly'),
      ]);

      setStats({
        completedTasks: tasksRes.data.stats?.completed_tasks || 0,
        totalTasks: tasksRes.data.stats?.total_tasks || 0,
        totalExpenses: expensesRes.data.summary?.total_expense || 0,
        studyHours: 24, // Mock data
      });
    } catch (error) {
      console.error('Load stats error:', error);
    }
  }

  async function loadWeeklyData() {
    // Mock data for weekly task completion
    setWeeklyData({
      labels: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'],
      datasets: [{ data: [3, 5, 2, 4, 6, 2, 1] }],
    });
  }

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 12,
    },
  };

  return (
    <ScrollView style={styles.container}>
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-done" size={24} color="#10B981" />
          <Text style={styles.statNumber}>{stats.completedTasks}</Text>
          <Text style={styles.statLabel}>งานเสร็จสิ้น</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="list" size={24} color="#6366F1" />
          <Text style={styles.statNumber}>{stats.totalTasks}</Text>
          <Text style={styles.statLabel}>งานทั้งหมด</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="wallet" size={24} color="#EF4444" />
          <Text style={styles.statNumber}>฿{(stats.totalExpenses / 1000).toFixed(1)}k</Text>
          <Text style={styles.statLabel}>ใช้จ่ายเดือนนี้</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.studyHours}h</Text>
          <Text style={styles.statLabel}>ชั่วโมงเรียน</Text>
        </View>
      </View>

      {/* Weekly Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>งานที่เสร็จรายสัปดาห์</Text>
        <BarChart
          data={weeklyData}
          width={width - 64}
          height={200}
          chartConfig={chartConfig}
          style={styles.chart}
          showValuesOnTopOfBars
          fromZero
        />
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ความสำเร็จ</Text>
        <View style={styles.achievementCard}>
          <View style={[styles.achievementIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="trophy" size={24} color="#F59E0B" />
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>นักเรียนขยัน</Text>
            <Text style={styles.achievementDesc}>เสร็จงานครบ 10 งานใน 1 สัปดาห์</Text>
          </View>
        </View>
        <View style={styles.achievementCard}>
          <View style={[styles.achievementIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="calendar" size={24} color="#10B981" />
          </View>
          <View style={styles.achievementContent}>
            <Text style={styles.achievementTitle}>ตรงต่อเวลา</Text>
            <Text style={styles.achievementDesc}>ไม่มีงานค้าง deadline 30 วัน</Text>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>การตั้งค่า</Text>
        <TouchableOption icon="notifications" text="การแจ้งเตือน" />
        <TouchableOption icon="moon" text="โหมดกลางคืน" />
        <TouchableOption icon="shield" text="ความเป็นส่วนตัว" />
        <TouchableOption icon="help-circle" text="ช่วยเหลือ" />
      </View>
    </ScrollView>
  );
}

function TouchableOption({ icon, text }) {
  return (
    <View style={styles.optionItem}>
      <View style={styles.optionLeft}>
        <Ionicons name={icon} size={20} color="#6B7280" />
        <Text style={styles.optionText}>{text}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: (width - 56) / 2,
    backgroundColor: 'white',
    margin: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  achievementCard: {
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
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementContent: {
    marginLeft: 12,
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  achievementDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 15,
    color: '#111827',
    marginLeft: 12,
  },
});
