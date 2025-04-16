import * as React from 'react';
import { View, StyleSheet, Text } from 'react-native';

type Requirement = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

const passwordRequirements: Requirement[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (password: string) => password.length >= 8,
  },
  {
    id: 'number',
    label: 'At least 1 number',
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    id: 'uppercase',
    label: 'At least 1 uppercase letter',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'At least 1 lowercase letter',
    test: (password: string) => /[a-z]/.test(password),
  },
];

const checkPasswordRequirements = (password: string) => {
  const results: Record<string, boolean> = {};
  passwordRequirements.forEach(({ id, test }) => {
    results[id] = test(password);
  });
  return results;
}

const PasswordRequirementCheck = ({ password }: { password: string }) => {
  const results = checkPasswordRequirements(password);

  return (
    <View>
      <Text style={styles.title}>Password requirement:</Text>
      {passwordRequirements.map(({ id, label }) => {
        const requirementMet = results[id];
        return (
          <View key={id} style={styles.item}>
            <Text
              style={{ color: requirementMet ? 'green' : 'red' }}
            >
              - {label}{requirementMet ? ' ✓' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
    alignItems: 'center',
  },
  tick: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PasswordRequirementCheck;