import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { apiService, ProfileUpdateData, ApiResponse, Checkout } from '../api';

const Tab = createBottomTabNavigator();

interface DashboardData {
  attendanceRate: number;
  upcomingClasses: number;
  pendingCorrections: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  year?: string;
  branch?: string;
}

interface AttendanceData {
  history: any[];
  analytics: any;
  report: any;
}

const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>{error}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>Retry</Text>
    </TouchableOpacity>
  </View>
);

// Custom hook for API calls with loading and error states
const useApiCall = <T,>(apiFunction: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const memoizedApiFunction = useCallback(apiFunction, []);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await memoizedApiFunction();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [memoizedApiFunction]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      fetchData();
    }
    return () => {
      mounted = false;
    };
  }, [fetchData]);

  return { data, loading, error, refreshing, onRefresh };
};

// Overview Screen Component
const OverviewScreen = () => {
  const {
    data: dashboardData,
    loading,
    refreshing,
    onRefresh
  } = useApiCall<DashboardData>(async () => {
    try {
      const [analytics, profile] = await Promise.all([
        apiService.getAttendanceAnalytics(),
        apiService.getStudentProfile()
      ]);

      // Provide default values if data is undefined
      return {
        attendanceRate: analytics.data?.overallAttendance || 0,
        upcomingClasses: analytics.data?.upcomingClasses || 0,
        pendingCorrections: analytics.data?.pendingCorrections || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Return default values if API call fails
      return {
        attendanceRate: 0,
        upcomingClasses: 0,
        pendingCorrections: 0
      };
    }
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.heading}>Overview</Text>
      <View style={styles.card}>
        <Ionicons name="checkmark-circle" size={24} color="#3498db" />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Attendance Rate</Text>
          <Text style={styles.cardValue}>{dashboardData?.attendanceRate}%</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Ionicons name="time" size={24} color="#3498db" />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Upcoming Classes</Text>
          <Text style={styles.cardValue}>{dashboardData?.upcomingClasses}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Ionicons name="alert-circle" size={24} color="#3498db" />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Pending Corrections</Text>
          <Text style={styles.cardValue}>{dashboardData?.pendingCorrections}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

// Attendance Screen Component
const AttendanceScreen = () => {
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [correctionModalVisible, setCorrectionModalVisible] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    attendance_id: '',
    reason: ''
  });
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const {
    data: attendanceData,
    loading,
    refreshing,
    onRefresh
  } = useApiCall<AttendanceData>(async () => {
    const [history, analytics, report] = await Promise.all([
      apiService.getAttendanceHistory(),
      apiService.getAttendanceAnalytics(),
      apiService.getAttendanceReport()
    ]);

    return {
      history: history.data,
      analytics: analytics.data,
      report: report.data
    };
  });

  const handleMarkAttendance = async (action: 'checkin' | 'checkout') => {
    try {
      setMarkingAttendance(true);
      const attendanceData = {
        wifi_name: "Campus_WiFi",
        block_name: "Main_Block"
      };

      if (action === 'checkin') {
        await apiService.markAttendance(attendanceData);
        Alert.alert('Success', 'Attendance marked successfully');
      } else if (action === 'checkout') {
        await apiService.checkout();
        Alert.alert('Success', 'Checked out successfully');
      }

      onRefresh();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('operator does not exist: character varying <= time without time zone')) {
          Alert.alert('Error', 'There was an issue with the time format. Please try again later.');
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        Alert.alert('Error', 'An unknown error occurred');
      }
    } finally {
      setMarkingAttendance(false);
      setAttendanceModalVisible(false);
    }
  };

  const handleRequestCorrection = async (formData: { attendance_id: string; reason: string }) => {
    try {
      await apiService.requestAttendanceCorrection({
        attendance_id: formData.attendance_id,
        reason: formData.reason
      });
      Alert.alert('Success', 'Correction request submitted');
      onRefresh();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('foreign key constraint')) {
          Alert.alert('Error', 'Attendance ID does not match any existing record.');
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        Alert.alert('Error', 'An unknown error occurred');
      }
    }
  };

  const renderAttendanceStats = () => {
    if (!attendanceData?.analytics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Overall Attendance</Text>
            <Text style={styles.cardValue}>
              {attendanceData.analytics.overallAttendance}%
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>This Month</Text>
            <Text style={styles.cardValue}>
              {attendanceData.analytics.monthlyAttendance}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.heading}>Attendance</Text>

      <TouchableOpacity
        style={[styles.button, markingAttendance && styles.buttonDisabled]}
        onPress={() => setAttendanceModalVisible(true)}
        disabled={markingAttendance}
      >
        <Text style={styles.buttonText}>
          {markingAttendance ? 'Marking...' : 'Mark Attendance'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => setReportModalVisible(true)}>
        <Text style={styles.buttonText}>View Attendance Report</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => setCorrectionModalVisible(true)}>
        <Text style={styles.buttonText}>Request Correction</Text>
      </TouchableOpacity>

      {renderAttendanceStats()}

      {attendanceData?.history && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Attendance</Text>
          {attendanceData.history.map((entry, index) => (
            <View key={index} style={styles.attendanceEntry}>
              <Text style={styles.entryDate}>{entry.date}</Text>
              <Text style={[
                styles.entryStatus,
                { color: entry.status === 'Present' ? '#27ae60' : '#e74c3c' }
              ]}>
                {entry.status}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={attendanceModalVisible}
        onRequestClose={() => setAttendanceModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mark Attendance</Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() => handleMarkAttendance('checkin')}
            >
              <Text style={styles.buttonText}>Check In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => handleMarkAttendance('checkout')}
            >
              <Text style={styles.buttonText}>Check Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setAttendanceModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={correctionModalVisible}
        onRequestClose={() => setCorrectionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Attendance Correction</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Attendance ID"
              value={correctionForm.attendance_id}
              onChangeText={(text) => setCorrectionForm({ ...correctionForm, attendance_id: text })}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Reason for correction"
              value={correctionForm.reason}
              onChangeText={(text) => setCorrectionForm({ ...correctionForm, reason: text })}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setCorrectionModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  handleRequestCorrection(correctionForm);
                  setCorrectionModalVisible(false);
                }}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Attendance Report</Text>
            {attendanceData?.report && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Week Attendance</Text>
                {attendanceData.report.weekly_report.map((entry: { week: string; attended_periods: number; total_periods: number }, index: number) => (
                  <View key={index} style={styles.attendanceEntry}>
                    <Text style={styles.entryDate}>Week {entry.week}</Text>
                    <Text style={styles.entryStatus}>
                      {entry.attended_periods} / {entry.total_periods}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setReportModalVisible(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

interface TimetableEntry {
  day: string;
  period: string;
  start_time: string;
  end_time: string;
  block_name: string;
  wifi_name: string;
}

const TimetableScreen = () => {
  const {
    data: timetableData,
    loading,
    error,
    refreshing,
    onRefresh
  } = useApiCall<TimetableEntry[]>(async () => {
    try {
      const response = await apiService.getTimetable();
      console.log('Student timetable response:', response);

      // Directly access timetable
      if (!response || !response.timetable) {
        throw new Error('Invalid API response structure');
      }

      return response.timetable;
    } catch (error) {
      console.error('Timetable API error:', error);
      throw error;
    }
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (error) {
    console.error('Error:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load timetable data.</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.heading}>Timetable</Text>
      {Array.isArray(timetableData) && timetableData.length > 0 ? (
        timetableData.map((entry, index) => (
          <View key={index} style={styles.timetableDay}>
            <Text style={styles.dayText}>{entry.day}</Text>
            <Text style={styles.periodText}>Period {entry.period}</Text>
            <Text style={styles.timeText}>{entry.start_time} - {entry.end_time}</Text>
            <Text style={styles.blockText}>Block: {entry.block_name}</Text>
            <Text style={styles.wifiText}>WiFi: {entry.wifi_name}</Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No timetable data available.</Text>
        </View>
      )}
    </ScrollView>
  );
};

// Profile Screen Component
const ProfileScreen = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ProfileUpdateData>({
    name: '',
    email: '',
    year: '',
    branch: ''
  });

  const {
    data: profileData,
    loading,
    refreshing,
    onRefresh
  } = useApiCall<UserData>(async () => {
    const response = await apiService.getStudentProfile();
    return response.data;
  });

  useEffect(() => {
    if (profileData) {
      setEditedData({
        name: profileData.name,
        email: profileData.email,
        year: profileData.year || '',
        branch: profileData.branch || ''
      });
    }
  }, [profileData]);

  const handleUpdateProfile = async (updatedData: ProfileUpdateData) => {
    try {
      const response = await apiService.updateStudentProfile(updatedData);
      if (response.status === 'success') {
        Alert.alert('Success', 'Profile updated successfully');
        const newProfile = await apiService.getStudentProfile();
        onRefresh();
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Update failed');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.heading}>Profile</Text>
      {profileData && (
        <View style={styles.profileContainer}>
          {isEditing ? (
            <>
              <TextInput
                style={styles.input}
                value={editedData.name}
                onChangeText={(text) => setEditedData({ ...editedData, name: text })}
                placeholder="Name"
              />
              <TextInput
                style={styles.input}
                value={editedData.email}
                onChangeText={(text) => setEditedData({ ...editedData, email: text })}
                placeholder="Email"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                value={editedData.year}
                onChangeText={(text) => setEditedData({ ...editedData, year: text })}
                placeholder="Year"
              />
              <TextInput
                style={styles.input}
                value={editedData.branch}
                onChangeText={(text) => setEditedData({ ...editedData, branch: text })}
                placeholder="Branch"
              />
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={() => {
                    handleUpdateProfile(editedData);
                    setIsEditing(false);
                  }}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.profileField}>
                <Text style={styles.fieldLabel}>Name</Text>
                <Text style={styles.fieldValue}>{profileData.name}</Text>
              </View>
              <View style={styles.profileField}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={styles.fieldValue}>{profileData.email}</Text>
              </View>
              <View style={styles.profileField}>
                <Text style={styles.fieldLabel}>Year</Text>
                <Text style={styles.fieldValue}>{profileData.year}</Text>
              </View>
              <View style={styles.profileField}>
                <Text style={styles.fieldLabel}>Branch</Text>
                <Text style={styles.fieldValue}>{profileData.branch}</Text>
              </View>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.buttonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// Main Dashboard Component
const StudentDashboard = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: 'home' | 'home-outline' | 'checkmark-circle' | 'checkmark-circle-outline' | 'calendar' | 'calendar-outline' | 'person' | 'person-outline' | undefined;

          if (route.name === 'Overview') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Attendance') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          } else if (route.name === 'Timetable') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Timetable" component={TimetableScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#3498db',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#3498db',
  },
  cardContent: {
    marginLeft: 15,
  },
  cardTitle: {
    fontSize: 16,
    color: '#333',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  placeholderContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  attendanceEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  entryDate: {
    color: '#34495e',
  },
  entryStatus: {
    fontWeight: 'bold',
  },
  profileContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileField: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  timetableContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  dayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  dayHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  classCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  classTime: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: 'bold',
  },
  className: {
    fontSize: 14,
    color: '#2c3e50',
    marginTop: 5,
  },
  classLocation: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#27ae60',
    flex: 1,
    marginRight: 5,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    flex: 1,
    marginLeft: 5,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#95a5a6',
    fontSize: 16,
  },
  timetableDay: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  classDetails: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 10,
  },
  blockName: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  wifiName: {
    fontSize: 14,
    color: '#95a5a6',
  },
  locationText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  timeText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  blockText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  wifiText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
});

export default StudentDashboard;
   
