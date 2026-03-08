import React, { useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WheelPicker from '@quidone/react-native-wheel-picker';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';

const ITEM_HEIGHT = 48;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1930;
const MAX_YEAR = CURRENT_YEAR - 10;

const MONTH_DATA = MONTHS.map((m, i) => ({ value: i, label: m }));
const YEAR_DATA = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => {
    const y = MAX_YEAR - i;
    return { value: y, label: String(y) };
  },
);

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface DatePickerProps {
  onDateChange: (dateString: string) => void;
  initialDate?: { month: number; day: number; year: number };
}

export default function DatePicker({ onDateChange, initialDate }: DatePickerProps) {
  const [selectedMonth, setSelectedMonth] = React.useState(initialDate?.month ?? 0);
  const [selectedDay, setSelectedDay] = React.useState(initialDate?.day ?? 1);
  const [selectedYear, setSelectedYear] = React.useState(initialDate?.year ?? 2000);

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);

  const dayData = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
      })),
    [daysInMonth],
  );

  // Clamp day if month/year changes
  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [daysInMonth]);

  // Emit date changes
  useEffect(() => {
    const mm = String(selectedMonth + 1).padStart(2, '0');
    const dd = String(selectedDay).padStart(2, '0');
    onDateChange(`${selectedYear}-${mm}-${dd}`);
  }, [selectedMonth, selectedDay, selectedYear]);

  const handleHaptic = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: { value: number; label: string } }) => (
      <View style={styles.item}>
        <Text style={styles.itemText}>{item.label}</Text>
      </View>
    ),
    [],
  );

  const overlayStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.quaternary,
      borderRadius: 12,
      marginHorizontal: 6,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.pickerRow}>
        {/* Month */}
        <View style={styles.columnWide}>
          <WheelPicker
            data={MONTH_DATA}
            value={selectedMonth}
            onValueChanging={handleHaptic}
            onValueChanged={({ item }: { item: { value: number } }) => {
              setSelectedMonth(item.value);
            }}
            itemHeight={ITEM_HEIGHT}
            visibleItemCount={5}
            renderItem={renderItem}
            overlayItemStyle={overlayStyle}
          />
        </View>

        {/* Day */}
        <View style={styles.column}>
          <WheelPicker
            data={dayData}
            value={selectedDay}
            onValueChanging={handleHaptic}
            onValueChanged={({ item }: { item: { value: number } }) => {
              setSelectedDay(item.value);
            }}
            itemHeight={ITEM_HEIGHT}
            visibleItemCount={5}
            renderItem={renderItem}
            overlayItemStyle={overlayStyle}
          />
        </View>

        {/* Year */}
        <View style={styles.column}>
          <WheelPicker
            data={YEAR_DATA}
            value={selectedYear}
            onValueChanging={handleHaptic}
            onValueChanged={({ item }: { item: { value: number } }) => {
              setSelectedYear(item.value);
            }}
            itemHeight={ITEM_HEIGHT}
            visibleItemCount={5}
            renderItem={renderItem}
            overlayItemStyle={overlayStyle}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: '100%',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  columnWide: {
    flex: 2,
  },
  column: {
    flex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
