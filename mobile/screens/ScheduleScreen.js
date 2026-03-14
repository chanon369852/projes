import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';

const { width } = Dimensions.get('window');

const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export default function ScheduleScreen() {
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    subject_name: '',
    teacher: '',
    building: '',
    room: '',
    day_of_week: 1,
    start_time: new Date(),
    end_time: new Date(),
    color: '#6366F1',
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  async function loadSchedules() {
    try {
      const response = await api.get('/schedules');
      setSchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Load schedules error:', error);
    }
  }

  async function addSchedule() {
    try {
      const formatTime = (date) => {
        return date.toTimeString().slice(0, 5);
      };

      await api.post('/schedules', {
        ...newSchedule,
        start_time: formatTime(newSchedule.start_time),
        end_time: formatTime(newSchedule.end_time),
      });
      setModalVisible(false);
      loadSchedules();
    } catch (error) {
      console.error('Add schedule error:', error);
    }
  }

  const getSchedulesForDay = (dayIndex) => {
    return schedules
      .filter((s) => s.day_of_week === dayIndex)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const colors = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444'];

  return (
    <View style={styles.container}>
      {/* Weekly View */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weeklyView}>
        {DAYS.map((day, index) => {
          const daySchedules = getSchedulesForDay(index);
          const isToday = new Date().getDay() === index;
          
          return (
            <View key={index} style={[styles.dayColumn, isToday && styles.todayColumn]}>
              <View style={[styles.dayHeader, isToday && styles.todayHeader]}>
                <Text style={[styles.dayText, isToday && styles.todayText]}>{day}</Text>
              </View>
              <ScrollView style={styles.dayContent}>
                {daySchedules.map((schedule, idx) => (
                  <View
                    key={idx}
                    style={[styles.classCard, { backgroundColor: schedule.color + '20', borderLeftColor: schedule.color }]}
                  >
                    <Text style={[styles.classTime, { color: schedule.color }]}>
                      {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
                    </Text>
                    <Text style={styles.className}>{schedule.subject_name}</Text>
                    <Text style={styles.classRoom}>
                      {schedule.building} {schedule.room}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Schedule Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>เพิ่มวิชา</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="ชื่อวิชา"
              value={newSchedule.subject_name}
              onChangeText={(text) => setNewSchedule({ ...newSchedule, subject_name: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="อาจารย์ผู้สอน"
              value={newSchedule.teacher}
              onChangeText={(text) => setNewSchedule({ ...newSchedule, teacher: text })}
            />

            <View style={styles.rowInput}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="อาคาร"
                value={newSchedule.building}
                onChangeText={(text) => setNewSchedule({ ...newSchedule, building: text })}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="ห้อง"
                value={newSchedule.room}
                onChangeText={(text) => setNewSchedule({ ...newSchedule, room: text })}
              />
            </View>

            {/* Day Selector */}
            <Text style={styles.label}>วัน</Text>
            <View style={styles.daySelector}>
              {DAY_NAMES.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayOption,
                    newSchedule.day_of_week === index && styles.dayOptionActive,
                  ]}
                  onPress={() => setNewSchedule({ ...newSchedule, day_of_week: index })}
                >
                  <Text
                    style={[
                      styles.dayOptionText,
                      newSchedule.day_of_week === index && styles.dayOptionTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Pickers */}
            <View style={styles.rowInput}>
              <TouchableOpacity
                style={[styles.input, styles.halfInput]}
                onPress={() => setShowStartPicker(true)}
              >
                <Text>เริ่ม: {newSchedule.start_time.toTimeString().slice(0, 5)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.input, styles.halfInput]}
                onPress={() => setShowEndPicker(true)}
              >
                <Text>จบ: {newSchedule.end_time.toTimeString().slice(0, 5)}</Text>
              </TouchableOpacity>
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={newSchedule.start_time}
                mode="time"
                onChange={(event, selectedDate) => {
                  setShowStartPicker(false);
                  if (selectedDate) {
                    setNewSchedule({ ...newSchedule, start_time: selectedDate });
                  }
                }}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={newSchedule.end_time}
                mode="time"
                onChange={(event, selectedDate) => {
                  setShowEndPicker(false);
                  if (selectedDate) {
                    setNewSchedule({ ...newSchedule, end_time: selectedDate });
                  }
                }}
              />
            )}

            {/* Color Selector */}
            <Text style={styles.label}>สี</Text>
            <View style={styles.colorSelector}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newSchedule.color === color && styles.colorOptionActive,
                  ]}
                  onPress={() => setNewSchedule({ ...newSchedule, color })}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={addSchedule}>
              <Text style={styles.saveButtonText}>บันทึก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  weeklyView: {
    flexDirection: 'row',
    padding: 16,
  },
  dayColumn: {
    width: 140,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    maxHeight: '90%',
  },
  todayColumn: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  dayHeader: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
  },
  todayHeader: {
    backgroundColor: '#6366F1',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  todayText: {
    color: 'white',
  },
  dayContent: {
    padding: 8,
  },
  classCard: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  classTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  className: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  classRoom: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
  },
  rowInput: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dayOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  dayOptionActive: {
    backgroundColor: '#6366F1',
  },
  dayOptionText: {
    fontSize: 13,
    color: '#6B7280',
  },
  dayOptionTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  colorSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
