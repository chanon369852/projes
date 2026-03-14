import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    deadline: new Date(),
    priority: 'medium',
    subject: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTasks();
  }, [filter]);

  async function loadTasks() {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/tasks', { params });
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Load tasks error:', error);
    }
  }

  async function addTask() {
    if (!newTask.title) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกชื่องาน');
      return;
    }

    try {
      await api.post('/tasks', {
        ...newTask,
        deadline: newTask.deadline.toISOString(),
      });
      setModalVisible(false);
      setNewTask({
        title: '',
        description: '',
        deadline: new Date(),
        priority: 'medium',
        subject: '',
      });
      loadTasks();
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเพิ่มงานได้');
    }
  }

  async function toggleTaskStatus(task) {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      loadTasks();
    } catch (error) {
      console.error('Toggle status error:', error);
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'urgent': return '#7C3AED';
      case 'medium': return '#F59E0B';
      default: return '#10B981';
    }
  };

  const renderTask = ({ item }) => {
    const isOverdue = new Date(item.deadline) < new Date() && item.status !== 'completed';
    
    return (
      <View style={[styles.taskItem, isOverdue && styles.taskOverdue]}>
        <TouchableOpacity
          style={[styles.checkbox, item.status === 'completed' && styles.checkboxChecked]}
          onPress={() => toggleTaskStatus(item)}
        >
          {item.status === 'completed' && (
            <Ionicons name="checkmark" size={18} color="white" />
          )}
        </TouchableOpacity>
        
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, item.status === 'completed' && styles.taskCompleted]}>
            {item.title}
          </Text>
          {item.subject && (
            <Text style={styles.taskSubject}>{item.subject}</Text>
          )}
          <Text style={[styles.taskDeadline, isOverdue && styles.deadlineOverdue]}>
            <Ionicons name="time-outline" size={12} />
            {' '}{new Date(item.deadline).toLocaleDateString('th-TH')}
          </Text>
        </View>
        
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'pending', 'completed'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'ทั้งหมด' : f === 'pending' ? 'รอดำเนินการ' : 'เสร็จสิ้น'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>เพิ่มงานใหม่</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="ชื่องาน"
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="รายละเอียด"
              multiline
              value={newTask.description}
              onChangeText={(text) => setNewTask({ ...newTask, description: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="วิชา (ถ้ามี)"
              value={newTask.subject}
              onChangeText={(text) => setNewTask({ ...newTask, subject: text })}
            />

            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>
                <Ionicons name="calendar" size={16} /> {' '}
                {newTask.deadline.toLocaleDateString('th-TH')}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={newTask.deadline}
                mode="date"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setNewTask({ ...newTask, deadline: selectedDate });
                  }
                }}
              />
            )}

            <View style={styles.priorityContainer}>
              {['low', 'medium', 'high', 'urgent'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityOption,
                    newTask.priority === p && { backgroundColor: getPriorityColor(p) + '30' },
                  ]}
                  onPress={() => setNewTask({ ...newTask, priority: p })}
                >
                  <Text style={{ color: getPriorityColor(p), fontWeight: '600' }}>
                    {p === 'low' ? 'ต่ำ' : p === 'medium' ? 'ปานกลาง' : p === 'high' ? 'สูง' : 'เร่งด่วน'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={addTask}>
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#6366F1',
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  taskSubject: {
    fontSize: 13,
    color: '#6366F1',
    marginTop: 2,
  },
  taskDeadline: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  deadlineOverdue: {
    color: '#EF4444',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
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
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  priorityOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
