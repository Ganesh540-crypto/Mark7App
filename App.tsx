import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginSignup from './components/expo-login-signup';
import FacultyDashboard from './components/expo-faculty-dashboard';
import StudentDashboard from './components/expo-student-dashboard';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="LoginSignup">
        <Stack.Screen name="LoginSignup" component={LoginSignup} />
        <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
        <Stack.Screen name="FacultyDashboard" component={FacultyDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
