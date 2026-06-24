import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  interpolate,
  withTiming,
  withSpring,
  useDerivedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTransactionStore } from '@/stores/transactionStore';
import { formatCurrency } from '@/utils/formatters';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = CARD_WIDTH * 0.63; // Perfect Golden Ratio for Credit Cards
const Y_OFFSET = CARD_HEIGHT * 0.14; // Mathematically calculated to expose 52px for the logo
const FRONT_Y = Y_OFFSET;
const PEEK_Y = -Y_OFFSET;
const DECK_HEIGHT = CARD_HEIGHT + (Y_OFFSET * 2);

const SWIPE_VELOCITY = 500;
const SWIPE_DISTANCE = width * 0.3;

interface CardData {
  id: string;
  number: string;
  brand: keyof typeof Ionicons.glyphMap;
  color: string;
  gradientEnd: string;
  balance: number;
  exp: string;
  textColor: string;
}

function CreditCardItem({ 
  item, 
  state 
}: { 
  item: CardData, 
  state: {
    x: Animated.SharedValue<number>;
    y: Animated.SharedValue<number>;
    s: Animated.SharedValue<number>;
    z: Animated.SharedValue<number>;
  }
}) {
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      zIndex: state.z.value,
      transform: [
        { translateX: state.x.value },
        { translateY: state.y.value },
        { scale: state.s.value },
        { rotate: `${(state.x.value / width) * 12}deg` } 
      ],
    };
  });

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <LinearGradient
        colors={[item.color, item.gradientEnd]}
        style={[styles.frontCard, { height: CARD_HEIGHT }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.frontHeader}>
          <Ionicons name={item.brand as any} size={20} color={item.textColor} />
          <Text style={[styles.cardNumberLight, { color: item.textColor }]}>**** **** **** {item.number}</Text>
        </View>

        <View style={styles.balanceSection}>
          <Text style={[styles.label, { color: item.textColor, opacity: 0.8 }]}>Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={[styles.balance, { color: item.textColor }]}>{formatCurrency(item.balance, 'PHP')}</Text>
            <View style={styles.expBox}>
              <Text style={[styles.expLabel, { color: item.textColor, opacity: 0.6 }]}>Exp. Date</Text>
              <Text style={[styles.expValue, { color: item.textColor }]}>{item.exp}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View>
            <Text style={[styles.nameLabel, { color: item.textColor, opacity: 0.6 }]}>Name</Text>
            <Text style={[styles.nameValue, { color: item.textColor }]}>Nekofi User</Text>
          </View>
          <View style={[styles.addButton, { backgroundColor: item.textColor === '#fff' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)' }]}>
            <Ionicons name="add" size={16} color={item.textColor} />
            <Text style={[styles.addText, { color: item.textColor }]}>Add Card</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export function BalanceCard() {
  const { transactions } = useTransactionStore();
  const colors = useThemeColors();

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const mockCards = useMemo<CardData[]>(() => [
    { id: '1', number: '4364', brand: 'logo-apple', color: colors.cardPurple, gradientEnd: '#8B3DCE', balance: balance, exp: '08/28', textColor: '#fff' },
    { id: '2', number: '7216', brand: 'eye', color: colors.cardYellow, gradientEnd: '#E3C148', balance: 12500, exp: '12/29', textColor: '#000' }
  ], [balance, colors]);

  const activeIndex = useSharedValue(0);

  // Independent physics state for Card 0 (Front)
  const x0 = useSharedValue(0);
  const y0 = useSharedValue(FRONT_Y);
  const s0 = useSharedValue(1);
  const z0 = useSharedValue(100);

  // Independent physics state for Card 1 (Back)
  const x1 = useSharedValue(0);
  const y1 = useSharedValue(PEEK_Y);
  const s1 = useSharedValue(0.92);
  const z1 = useSharedValue(50);

  const cardsState = useMemo(() => [
    { x: x0, y: y0, s: s0, z: z0 },
    { x: x1, y: y1, s: s1, z: z1 }
  ], []);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) 
    .onUpdate((e) => {
      const active = activeIndex.value;
      const inactive = (activeIndex.value + 1) % 2;

      // Move the active card
      cardsState[active].x.value = e.translationX;

      // Interpolate the inactive card to come forward
      const progress = Math.min(Math.abs(e.translationX) / (width * 0.5), 1);
      cardsState[inactive].s.value = 0.92 + progress * 0.08;
      cardsState[inactive].y.value = PEEK_Y + progress * (FRONT_Y - PEEK_Y);
    })
    .onEnd((e) => {
      const active = activeIndex.value;
      const inactive = (activeIndex.value + 1) % 2;

      // Swiped far enough or fast enough to swap
      if (Math.abs(e.translationX) > width * 0.25 || Math.abs(e.velocityX) > 400) {
        const direction = Math.sign(e.translationX || e.velocityX || 1);
        const targetX = direction * width * 1.2;

        // 1. Ensure the new front card fully ascends to the top instantly
        cardsState[inactive].s.value = withTiming(1, { duration: 200 });
        cardsState[inactive].y.value = withTiming(FRONT_Y, { duration: 200 });

        // 2. Throw the active card off screen
        cardsState[active].x.value = withTiming(targetX, { duration: 200 }, (finished) => {
          if (finished) {
            // 3. Once it is off screen, drop it to the back layer
            cardsState[active].z.value = 50;
            
            // 4. Animate it sliding back into the center of the deck from off-screen!
            cardsState[active].s.value = withTiming(0.92, { duration: 300 });
            cardsState[active].y.value = withTiming(PEEK_Y, { duration: 300 });
            cardsState[active].x.value = withSpring(0, { damping: 14, stiffness: 90 });
            
            // 5. Officially swap the active tracker
            cardsState[inactive].z.value = 100;
            activeIndex.value = inactive;
          }
        });
      } else {
        // Snap back if swipe was aborted
        cardsState[active].x.value = withSpring(0, { damping: 16, stiffness: 150, mass: 0.8 });
        cardsState[inactive].s.value = withSpring(0.92, { damping: 16, stiffness: 150, mass: 0.8 });
        cardsState[inactive].y.value = withSpring(PEEK_Y, { damping: 16, stiffness: 150, mass: 0.8 });
      }
    });

  return (
    <View style={styles.container}>
      {/* Wallet Deck Stack */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.deckContainer}>
          {mockCards.map((card, index) => {
            return (
              <CreditCardItem 
                key={card.id} 
                item={card} 
                state={cardsState[index]}
              />
            );
          })}
        </View>
      </GestureDetector>

      {/* Financial Summary Below Card */}
      <View style={[styles.summaryWrapper, { paddingHorizontal: 20 }]}>
        <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.stat}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.income}20` }]}>
               <Ionicons name="arrow-down" size={16} color={colors.income} />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Income</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(totalIncome, 'PHP')}</Text>
            </View>
          </View>
          <View style={styles.stat}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.expense}20` }]}>
               <Ionicons name="arrow-up" size={16} color={colors.expense} />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Expense</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(totalExpense, 'PHP')}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 16 },
  deckContainer: {
    height: DECK_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  cardWrapper: {
    position: 'absolute',
    width: CARD_WIDTH,
    alignSelf: 'center',
  },
  frontCard: {
    borderRadius: 24,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#A052E6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  frontHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNumberLight: { fontFamily: 'Inter-Medium', fontSize: 13 },
  balanceSection: { },
  label: { fontFamily: 'Inter-Medium', fontSize: 12, marginBottom: 4 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  balance: { fontFamily: 'Inter-Bold', fontSize: 32, letterSpacing: -1 },
  expBox: { alignItems: 'flex-end' },
  expLabel: { fontFamily: 'Inter-Regular', fontSize: 10 },
  expValue: { fontFamily: 'Inter-Medium', fontSize: 14 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameLabel: { fontFamily: 'Inter-Regular', fontSize: 10 },
  nameValue: { fontFamily: 'Inter-Medium', fontSize: 14 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addText: { fontFamily: 'Inter-Medium', fontSize: 12 },
  summaryWrapper: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 12, marginBottom: 2 },
  statValue: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
});
