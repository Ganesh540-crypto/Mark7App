import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Animated, Easing
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../api';
import { Ionicons } from '@expo/vector-icons';

const LoginSignup = ({ navigation }: { navigation: any }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [rotateAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    role: 'student',
    email: '',
    password: '',
    year: '',
    branch: '',
    department: '',
    username: '',
  });

  useEffect(() => {
    checkExistingSession();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userString = await AsyncStorage.getItem('user');

      if (token && userString) {
        const user = JSON.parse(userString);
        navigateToAppropriateDashboard(user.role);
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  };

  const navigateToAppropriateDashboard = (role: string) => {
    if (role === 'student') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'StudentDashboard' }],
      });
    } else if (role === 'faculty') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'FacultyDashboard' }],
      });
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (isLogin) {
      if (!formData.username || !formData.password) {
        Alert.alert('Validation Error', 'Please enter both username and password.');
        return false;
      }
    } else {
      const requiredFields = ['id', 'name', 'email', 'password'];

      if (formData.role === 'student') {
        requiredFields.push('year', 'branch');
      } else if (formData.role === 'faculty') {
        requiredFields.push('department');
      }

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          Alert.alert('Error', `Please fill in the ${field} field.`);
          return false;
        }
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        Alert.alert('Error', 'Please enter a valid email address.');
        return false;
      }

      if (!validatePassword(formData.password)) {
        Alert.alert('Error', 'Password must be at least 8 characters long, include an uppercase letter, a number, and a special character.');
        return false;
      }
    }
    return true;
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[!@#$%^&*]/.test(password)) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      if (isLogin) {
        const loginResponse = await apiService.login(formData.username, formData.password);
        if (loginResponse.status === 'success') {
          await AsyncStorage.setItem('token', loginResponse.token);
          await AsyncStorage.setItem('userRole', formData.role);
          navigateToAppropriateDashboard(formData.role);
        }
      } else {
        const signupPayload = {
          id: formData.id,
          name: formData.name,
          role: formData.role,
          email: formData.email,
          password: formData.password,
          ...(formData.role === 'student' ? {
            year: formData.year,
            branch: formData.branch,
          } : {
            department: formData.department,
          }),
        };

        const signupResponse = await apiService.register(signupPayload);
        if (signupResponse.status === 'success') {
          Alert.alert(
            'Success',
            'Registration successful! Please login with your credentials.',
            [{ 
              text: 'OK', 
              onPress: () => {
                setIsLogin(true);
                setFormData({
                  id: '',
                  name: '',
                  role: 'student',
                  email: '',
                  password: '',
                  year: '',
                  branch: '',
                  department: '',
                  username: '',
                });
              }
            }]
          );
        }
      }
    } catch (error) {
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleSubmit() }
        ],
        { cancelable: true }
      );
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Animated.View style={[styles.logoContainer, {
          transform: [
            { rotate: spin },
            { scale: scaleAnim }
          ]
        }]}>
          <Ionicons name="school" size={80} color="#3498db" />
          <Text style={styles.logoText}>MARK77</Text>
        </Animated.View>

        <Text style={styles.title}>{isLogin ? 'Login' : 'Sign Up'}</Text>

        {isLogin ? (
          <>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(itemValue) => handleChange('role', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Student" value="student" />
                <Picker.Item label="Faculty" value="faculty" />
              </Picker>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Username/ID"
              value={formData.username}
              onChangeText={(text) => handleChange('username', text)}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              secureTextEntry
            />
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="ID Number"
              value={formData.id}
              onChangeText={(text) => handleChange('id', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={formData.name}
              onChangeText={(text) => handleChange('name', text)}
            />
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(itemValue) => handleChange('role', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Student" value="student" />
                <Picker.Item label="Faculty" value="faculty" />
              </Picker>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              secureTextEntry
            />

            {formData.role === 'student' ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Year"
                  value={formData.year}
                  onChangeText={(text) => handleChange('year', text)}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Branch"
                  value={formData.branch}
                  onChangeText={(text) => handleChange('branch', text)}
                />
              </>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Department"
                value={formData.department}
                onChangeText={(text) => handleChange('department', text)}
              />
            )}
          </>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {
          setIsLogin(!isLogin);
          setFormData({ // Reset form data when switching between login and signup
            id: '',
            name: '',
            role: 'student',
            email: '',
            password: '',
            year: '',
            branch: '',
            department: '',
            username: '',
          });
        }}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#3498db'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: '#fff'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: '#fff'
  },
  picker: {
    height: 50,
    width: '100%'
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10
  },
  buttonDisabled: {
    backgroundColor: '#cccccc'
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  switchText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#3498db'
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    padding: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    marginTop: 10,
    letterSpacing: 2
  }
});

export default LoginSignup;
