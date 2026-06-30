import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Alert } from 'react-native';
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
import { useAccountStore } from '@/stores/accountStore';
import { formatCurrency } from '@/utils/formatters';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = CARD_WIDTH * 0.63; // Perfect Golden Ratio for Credit Cards
const Y_OFFSET = CARD_HEIGHT * 0.14; 
const FRONT_Y = 20;
const DECK_HEIGHT = CARD_HEIGHT + 60;

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
  name: string;
}

type CardState = {
  x: Animated.SharedValue<number>;
  y: Animated.SharedValue<number>;
  s: Animated.SharedValue<number>;
  z: Animated.SharedValue<number>;
};

const getRestingY = (depth: number, numCards: number) => {
  'worklet';
  if (numCards === 1) return 0;
  if (depth === 0) return FRONT_Y;
  if (numCards === 2) return -50;
  return FRONT_Y - (depth * 14);
};

const getRestingS = (depth: number, numCards: number) => {
  'worklet';
  if (depth === 0) return 1;
  if (numCards <= 2) return 0.92;
  return 1 - (depth * 0.05);
};

function CreditCardItem({ 
  item, 
  state,
}: { 
  item: CardData, 
  state: CardState,
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
            <Text style={[styles.nameLabel, { color: item.textColor, opacity: 0.6 }]}>Account</Text>
            <Text style={[styles.nameValue, { color: item.textColor }]}>{item.name}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export function BalanceCard() {
  const router = useRouter();
  const { transactions } = useTransactionStore();
  const { accounts, fetchAccounts } = useAccountStore();
  const colors = useThemeColors();

  React.useEffect(() => {
    fetchAccounts();
  }, []);

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  
  const displayCards = useMemo<CardData[]>(() => {
    return accounts.slice(0, 5).map(acc => ({
      id: acc.id,
      number: acc.numberMasked || '••••',
      brand: acc.brandIcon,
      color: acc.color,
      gradientEnd: '#0F1115',
      balance: acc.balance,
      exp: 'Active',
      textColor: acc.textColor,
      name: acc.name
    }));
  }, [accounts]);

  const activeIndex = useSharedValue(0);
  const emptyScale = useSharedValue(1);

  const handleEmptyPressIn = () => {
    emptyScale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
  };
  
  const handleEmptyPressOut = () => {
    emptyScale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const animatedEmptyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emptyScale.value }],
  }));

  const cardsState = [
    { x: useSharedValue(0), y: useSharedValue(20), s: useSharedValue(1), z: useSharedValue(100) },
    { x: useSharedValue(0), y: useSharedValue(6), s: useSharedValue(0.95), z: useSharedValue(90) },
    { x: useSharedValue(0), y: useSharedValue(-8), s: useSharedValue(0.90), z: useSharedValue(80) },
    { x: useSharedValue(0), y: useSharedValue(-22), s: useSharedValue(0.85), z: useSharedValue(70) },
    { x: useSharedValue(0), y: useSharedValue(-36), s: useSharedValue(0.80), z: useSharedValue(60) },
  ];

  const numCards = displayCards.length;

  React.useEffect(() => {
    for (let i = 0; i < numCards; i++) {
      const depth = (i - activeIndex.value + numCards) % numCards;
      cardsState[i].y.value = withSpring(getRestingY(depth, numCards), { damping: 16, stiffness: 150 });
      cardsState[i].s.value = withSpring(getRestingS(depth, numCards), { damping: 16, stiffness: 150 });
      cardsState[i].z.value = depth === 0 ? 100 : 100 - depth * 10;
    }
  }, [numCards]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) 
    .onUpdate((e) => {
      if (numCards <= 1) return;
      const active = activeIndex.value;
      const inactive = (activeIndex.value + 1) % numCards;

      cardsState[active].x.value = e.translationX;

      const progress = Math.min(Math.abs(e.translationX) / (width * 0.5), 1);
      
      const targetY = getRestingY(0, numCards);
      const targetS = getRestingS(0, numCards);
      const startY = getRestingY(1, numCards);
      const startS = getRestingS(1, numCards);

      cardsState[inactive].s.value = startS + progress * (targetS - startS);
      cardsState[inactive].y.value = startY + progress * (targetY - startY);
    })
    .onEnd((e) => {
      if (numCards <= 1) return;
      const active = activeIndex.value;
      const inactive = (activeIndex.value + 1) % numCards;

      if (Math.abs(e.translationX) > width * 0.25 || Math.abs(e.velocityX) > 400) {
        const direction = Math.sign(e.translationX || e.velocityX || 1);
        const targetX = direction * width * 1.2;

        cardsState[inactive].s.value = withTiming(getRestingS(0, numCards), { duration: 200 });
        cardsState[inactive].y.value = withTiming(getRestingY(0, numCards), { duration: 200 });

        cardsState[active].x.value = withTiming(targetX, { duration: 200 }, (finished) => {
          if (finished) {
            activeIndex.value = inactive;
            
            for (let i = 0; i < numCards; i++) {
              const depth = (i - inactive + numCards) % numCards;
              cardsState[i].z.value = depth === 0 ? 100 : 100 - depth * 10;
              
              if (i === active) {
                cardsState[i].s.value = withTiming(getRestingS(depth, numCards), { duration: 300 });
                cardsState[i].y.value = withTiming(getRestingY(depth, numCards), { duration: 300 });
                cardsState[i].x.value = withSpring(0, { damping: 14, stiffness: 90 });
              } else if (i !== inactive) {
                cardsState[i].s.value = withTiming(getRestingS(depth, numCards), { duration: 300 });
                cardsState[i].y.value = withTiming(getRestingY(depth, numCards), { duration: 300 });
              }
            }
          }
        });
      } else {
        cardsState[active].x.value = withSpring(0, { damping: 16, stiffness: 150 });
        cardsState[inactive].s.value = withSpring(getRestingS(1, numCards), { damping: 16, stiffness: 150 });
        cardsState[inactive].y.value = withSpring(getRestingY(1, numCards), { damping: 16, stiffness: 150 });
      }
    });

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Accounts</Text>
        {displayCards.length > 0 && (
          <View style={styles.headerActions}>
            <Pressable 
              style={[styles.premiumAddBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/account/add' as any)}
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.premiumAddText}>Add</Text>
            </Pressable>
            <Pressable 
              style={[styles.viewAllBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => router.push('/account/list' as any)}
            >
              <Text style={[styles.viewAllText, { color: colors.text }]}>See all</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Wallet Deck Stack */}
      {displayCards.length > 0 ? (
        <GestureDetector gesture={displayCards.length > 1 ? panGesture : Gesture.Pan()}>
          <View style={styles.deckContainer}>
            {displayCards.map((card, index) => (
              <CreditCardItem 
                key={card.id} 
                item={card} 
                state={cardsState[index]}
              />
            ))}
          </View>
        </GestureDetector>
      ) : (
        <Animated.View style={[animatedEmptyStyle, { marginVertical: 16 }]}>
          <Pressable 
            onPressIn={handleEmptyPressIn}
            onPressOut={handleEmptyPressOut}
            onPress={() => router.push('/account/add' as any)}
          >
            <LinearGradient
              colors={[colors.surface, colors.background]}
              style={[styles.frontCard, { width: CARD_WIDTH, height: CARD_HEIGHT, borderWidth: 1, borderColor: colors.border, alignSelf: 'center', justifyContent: 'center' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={{ position: 'absolute', top: 24, left: 24 }}>
                <Ionicons name="card-outline" size={20} color={colors.textMuted} style={{ opacity: 0.6 }} />
              </View>

              <View style={{ alignItems: 'center' }}>
                <Ionicons name="add" size={56} color={colors.primary} style={{ opacity: 0.8 }} />
                <Text style={{ marginTop: 8, fontFamily: 'Inter-SemiBold', color: colors.text, fontSize: 16 }}>Link Card or E-Wallet</Text>
                <Text style={{ marginTop: 4, fontFamily: 'Inter-Regular', color: colors.textMuted, fontSize: 13 }}>Connect accounts to track balances</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}

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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 18 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  premiumAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  premiumAddText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#FFF' },
  viewAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewAllText: { fontFamily: 'Inter-Medium', fontSize: 13 },
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
    shadowColor: '#000',
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
