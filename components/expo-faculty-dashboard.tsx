import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { apiService, ProfileUpdateData, ApiResponse, OverallAnalytics } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  id: string;
  name: string;
  day: string;
  period: string;
  start_time: string;
  end_time: string;
  block_name: string;
  wifi_name: string;
}

interface DetainedStudent {
  user_id: string;
  name: string;
  attendance_percentage: number;
}

interface PendingRequest {
  id: string;
  user_id: string;
  attendance_id: string;
  reason: string;
  created_at: string;
}

interface TimetableEntry {
  timetable_user_id: string;
  day: string;
  period: string;
  start_time: string;
  end_time: string;
  block_name: string;
  wifi_name: string;
}

const Tab = createBottomTabNavigator();

const OverviewScreen = () => {
  const [overallAnalytics, setOverallAnalytics] = useState<OverallAnalytics | null>(null);
  const [detainedStudents, setDetainedStudents] = useState<DetainedStudent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  useEffect(() => {
    const fetchOverallAnalytics = async () => {
      try {
        const response = await apiService.getOverallAnalytics();
        setOverallAnalytics(response.data as OverallAnalytics);
      } catch (error) {
        console.error('Error fetching overall analytics:', error);
      }
    };

    const fetchDetainedStudents = async () => {
      try {
        const response = await apiService.getDetainedStudents();
        setDetainedStudents(response.data);
      } catch (error) {
        console.error('Error fetching detained students:', error);
      }
    };

    const fetchPendingRequests = async () => {
      try {
        const response = await apiService.getPendingRequests();
        setPendingRequests(response.data);
      } catch (error) {
        console.error('Error fetching pending requests:', error);
      }
    };

    fetchOverallAnalytics();
    fetchDetainedStudents();
    fetchPendingRequests();
  }, []);

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.heading}>Overview</Text>
      <View style={styles.card}>
        <Ionicons name="bar-chart" size={24} color="#8e44ad" />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Overall Attendance</Text>
          <Text style={styles.cardValue}>{overallAnalytics ? overallAnalytics.attendance : 'N/A'}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Ionicons name="alert-circle" size={24} color="#8e44ad" />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Detained Students</Text>
          <Text style={styles.cardValue}>{detainedStudents.length}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Ionicons name="list" size={24} color="#8e44ad" />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Pending Requests</Text>
          <Text style={styles.cardValue}>{pendingRequests.length}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => apiService.exportAttendance()}>
        <Text style={styles.buttonText}>Export Attendance</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => apiService.updateAttendance({ attendance_id: 'example_id', new_status: 'present' })}>
        <Text style={styles.buttonText}>Update Attendance</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const StudentsScreen = () => {
  const [studentAnalytics, setStudentAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await apiService.getStudentAnalytics();
      
      if (response?.data) {
        setStudentAnalytics(response.data);
        setError(null);
      } else {
        setError('Invalid data received from server');
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setError('Unable to fetch analytics data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAnalytics}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!studentAnalytics) {
    return null;
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.heading}>Students Analytics</Text>

      <View style={styles.chartsContainer}>
        {studentAnalytics.students && studentAnalytics.students.length > 0 ? (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Attendance Distribution</Text>
              <BarChart
                data={{
                  labels: studentAnalytics.students.map((student: any) => student.name),
                  datasets: [{
                    data: studentAnalytics.students.map((student: any) => student.attendance_percentage)
                  }]
                }}
                width={350}
                height={220}
                yAxisLabel=""
                yAxisSuffix="%"
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(142, 68, 173, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                style={styles.chart}
              />
            </View>

            {/* Rest of your charts */}
          </>
        ) : (
          <Text style={styles.noDataText}>No student data available</Text>
        )}
      </View>
    </ScrollView>
  );
};

const TimetableScreen = () => {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [newEntry, setNewEntry] = useState<TimetableEntry>({
    timetable_user_id: '',
    day: '',
    period: '',
    start_time: '',
    end_time: '',
    block_name: '',
    wifi_name: ''
  });

  const fetchTimetable = async () => {
    try {
      const response = await apiService.getTimetableEntries();
      console.log('Fetched timetable:', response.data);
      setTimetable(response.data.data || []);
    } catch (error) {
      console.error('Timetable fetch error:', error);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const handleAddTimetable = async () => {
    try {
      await apiService.enterTimetable(newEntry);
      Alert.alert('Success', 'Timetable entry added successfully');
      fetchTimetable(); // Refresh the list after adding
      // Reset form
      setNewEntry({
        timetable_user_id: '',
        day: '',
        period: '',
        start_time: '',
        end_time: '',
        block_name: '',
        wifi_name: ''
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to add timetable entry');
    }
  };

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.heading}>Timetable Management</Text>

      {/* Entry Form */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Student ID"
          value={newEntry.timetable_user_id}
          onChangeText={(text) => setNewEntry({...newEntry, timetable_user_id: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Day"
          value={newEntry.day}
          onChangeText={(text) => setNewEntry({...newEntry, day: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Period"
          value={newEntry.period}
          onChangeText={(text) => setNewEntry({...newEntry, period: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Start Time (HH:MM)"
          value={newEntry.start_time}
          onChangeText={(text) => setNewEntry({...newEntry, start_time: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="End Time (HH:MM)"
          value={newEntry.end_time}
          onChangeText={(text) => setNewEntry({...newEntry, end_time: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Block Name"
          value={newEntry.block_name}
          onChangeText={(text) => setNewEntry({...newEntry, block_name: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="WiFi Name"
          value={newEntry.wifi_name}
          onChangeText={(text) => setNewEntry({...newEntry, wifi_name: text})}
        />
        <TouchableOpacity style={styles.button} onPress={handleAddTimetable}>
          <Text style={styles.buttonText}>Add Timetable Entry</Text>
        </TouchableOpacity>
      </View>

      {/* Timetable Display */}
      <View style={styles.timetableContainer}>
        {timetable.map((entry, index) => (
          <View key={index} style={styles.timetableCard}>
            <Text style={styles.dayText}>{entry.day}</Text>
            <View style={styles.timeContainer}>
              <Text style={styles.periodText}>Period {entry.period}</Text>
              <Text style={styles.timeText}>{entry.start_time} - {entry.end_time}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.formContainer}>
              <Text style={styles.blockText}>Block: {entry.block_name}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{entry.wifi_name}</Text>
              </View>
            </View>
            <Text style={styles.studentId}>Student ID: {entry.timetable_user_id}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<any[] | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await apiService.getUnreadNotifications();
        setNotifications(response.data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, []);

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.heading}>Notifications</Text>
      <View style={styles.placeholderContainer}>
        <Text>Your notifications will be displayed here</Text>
        {notifications && notifications.map((notification, index) => (
          <Text key={index}>{notification.message}</Text>
        ))}
      </View>
    </ScrollView>
  );
};

const ProfileScreen = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ProfileUpdateData>({
    name: '',
    email: '',
    department: ''
  });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const {
    data: profileData,
    loading,
    refreshing,
    onRefresh
  } = useApiCall(async () => {
    const response = await apiService.getFacultyProfile();
    return response.data;
  });

  useEffect(() => {
    if (profileData) {
      setEditedData({
        name: profileData.name,
        email: profileData.email,
        department: profileData.department || ''
      });
    }
  }, [profileData]);

  const animateTransition = (isEditing: boolean) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.spring(slideAnim, {
        toValue: isEditing ? 1 : 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      })
    ]).start(() => {
      setIsEditing(isEditing);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
    });
  };

  const handleUpdateProfile = async (updatedData: ProfileUpdateData) => {
    try {
      const response = await apiService.updateFacultyProfile(updatedData);
      if (response.status === 'success') {
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.1,
            friction: 3,
            useNativeDriver: true
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true
          })
        ]).start();
        Alert.alert('Success', 'Profile updated successfully');
        onRefresh();
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Update failed');
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.heading}>Profile</Text>
      {profileData && (
        <Animated.View
          style={[
            styles.profileContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 10]
                  })
                }
              ]
            }
          ]}
        >
          {isEditing ? (
            <>
              <TextInput
                style={[styles.input, styles.animatedInput]}
                value={editedData.name}
                onChangeText={(text) => setEditedData({...editedData, name: text})}
                placeholder="Name"
              />
              <TextInput
                style={[styles.input, styles.animatedInput]}
                value={editedData.email}
                onChangeText={(text) => setEditedData({...editedData, email: text})}
                placeholder="Email"
                keyboardType="email-address"
              />
              <TextInput
                style={[styles.input, styles.animatedInput]}
                value={editedData.department}
                onChangeText={(text) => setEditedData({...editedData, department: text})}
                placeholder="Department"
              />
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={() => {
                    handleUpdateProfile(editedData);
                    animateTransition(false);
                  }}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => animateTransition(false)}
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
                <Text style={styles.fieldLabel}>Department</Text>
                <Text style={styles.fieldValue}>{profileData.department}</Text>
              </View>
              <TouchableOpacity
                style={styles.button}
                onPress={() => animateTransition(true)}
              >
                <Text style={styles.buttonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
};

const FacultyDashboard = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Overview') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Students') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Timetable') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8e44ad',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="Students" component={StudentsScreen} />
      <Tab.Screen name="Timetable" component={TimetableScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#8e44ad',
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
  cardContent: {
    marginLeft: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#8e44ad',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8e44ad',
  },
  button: {
    backgroundColor: '#8e44ad',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#8e44ad',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  placeholderContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  animatedInput: {
    transform: [{scale: 1}],
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
  profileContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
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
    fontSize: 16,
    color: '#333',
  },
  fieldValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8e44ad',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  timetableCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  studentId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8e44ad',
    marginBottom: 5,
  },
  dayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  periodText: {
    fontSize: 16,
    color: '#34495e',
  },
  timeText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  blockText: {
    fontSize: 14,
    color: '#95a5a6',
  },
  locationText: {
    fontSize: 16,
    color: '#34495e',
  },
  wifiText: {
    fontSize: 14,
    color: '#95a5a6',
  },
  inputContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#8e44ad',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  timetableContainer: {
    marginTop: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },
  badge: {
    backgroundColor: '#8e44ad',
    padding: 5,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: '#8e44ad',
    padding: 5,
    borderRadius: 5,
  },
  chartsContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 20,
  },
  chartCard: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  pickerContainer: {
    marginTop: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 10,
  },
  picker: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    height: 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  analyticsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    textAlign: 'center',
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 5,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default FacultyDashboard;

function useApiCall(apiCall: () => Promise<any>) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await apiCall();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await apiCall();
      setData(result);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, refreshing, onRefresh };
}
