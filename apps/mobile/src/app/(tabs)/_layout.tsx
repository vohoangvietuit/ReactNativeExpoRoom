import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'NFC Test',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📳</Text>,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
      <Tabs.Screen
        name="weigh"
        options={{
          title: 'Weigh',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚖️</Text>,
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📡</Text>,
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          title: 'Todos',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✅</Text>,
        }}
      />
    </Tabs>
  );
}
