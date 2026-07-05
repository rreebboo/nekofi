import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';
import { useBudgetStore, computeBudgetGroups } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import type { Transaction } from '@/types/transaction';

// Configure foreground notification presentations
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request OS permissions for local notifications
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push permissions for local notifications!');
      return;
    }
  } catch (err) {
    console.warn('Error checking notifications permission:', err);
  }
}

/**
 * Helper to present a local OS notification alert
 */
export async function showLocalNotificationAlert(title: string, body: string, data: Record<string, any> = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // immediate
    });
  } catch (err) {
    console.warn('Failed to trigger local alert:', err);
  }
}

/**
 * Schedule daily recording reminders and weekly/monthly summary notifications
 */
export async function scheduleReminders() {
  if (Platform.OS === 'web') return;
  try {
    // Clear existing to avoid duplicate scheduling
    await Notifications.cancelScheduledNotificationAsync('daily_reminder');
    await Notifications.cancelScheduledNotificationAsync('weekly_reminder');
    await Notifications.cancelScheduledNotificationAsync('monthly_reminder');

    // 1. Daily expense logging reminder at 8:00 PM
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily_reminder',
      content: {
        title: 'Daily Expense Logging 🐱',
        body: "Don't forget to record your transactions today! Keeping track daily keeps your budget healthy.",
        sound: true,
      },
      trigger: {
        hour: 20,
        minute: 0,
        repeats: true,
      },
    });

    // 2. Weekly summary reminder on Sunday at 8:00 PM
    await Notifications.scheduleNotificationAsync({
      identifier: 'weekly_reminder',
      content: {
        title: 'Weekly Spending Summary 📊',
        body: 'Your weekly spending summary is ready! Open Nekofi to see how much you saved this week.',
        sound: true,
      },
      trigger: {
        weekday: 1, // Sunday
        hour: 20,
        minute: 0,
        repeats: true,
      },
    });

    // 3. Monthly summary reminder on the 1st of every month at 9:00 AM
    await Notifications.scheduleNotificationAsync({
      identifier: 'monthly_reminder',
      content: {
        title: 'Monthly Spending Summary 📅',
        body: 'Another month is complete! Check your monthly Nekofi dashboard for your spending breakdown.',
        sound: true,
      },
      trigger: {
        day: 1,
        hour: 9,
        minute: 0,
        repeats: true,
      } as any,
    });
  } catch (err) {
    console.warn('Failed to schedule local reminders:', err);
  }
}

/**
 * Initialize notification listeners and schedule reminders
 */
export function initNotificationService() {
  registerForPushNotificationsAsync();
  scheduleReminders();

  // Handle tapped notifications to open the App's Notification Center
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    try {
      const { router } = require('expo-router');
      router.push('/notifications');
    } catch (err) {
      console.warn('Failed to handle notification tap navigation:', err);
    }
  });

  return () => {
    responseSubscription.remove();
  };
}

/**
 * Trigger welcome notification for newly signed-up users
 */
export async function triggerWelcomeNotification() {
  const store = useNotificationStore.getState();
  const hasWelcome = store.notifications.some(
    n => n.type === 'account' && n.title.includes('Welcome')
  );
  if (!hasWelcome) {
    const notify = await store.addNotification(
      'Welcome to Nekofi! 🐱',
      'Start by creating budgets and adding your first transactions. We are here to help you save!',
      'account',
      { action: 'welcome' }
    );
    await showLocalNotificationAlert(notify.title, notify.body);
  }
}

/**
 * Trigger successful login notifications
 */
export async function triggerLoginNotification(provider: 'email' | 'facebook' | 'google') {
  const store = useNotificationStore.getState();
  const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
  const notify = await store.addNotification(
    'Successful Login 🔐',
    `You have successfully signed in using ${providerLabel} authentication.`,
    'account',
    { provider }
  );
  await showLocalNotificationAlert(notify.title, notify.body);
}

/**
 * Trigger budget cycle resets (usually triggered during app starts on a new budget period)
 */
export async function triggerBudgetResetNotification(budgetName: string) {
  const store = useNotificationStore.getState();
  const notify = await store.addNotification(
    'Budget Cycle Reset 🔄',
    `Your budget group "${budgetName}" has started a new period. Resetting spending logs.`,
    'budget',
    { budgetName, action: 'reset' }
  );
  await showLocalNotificationAlert(notify.title, notify.body);
}

/**
 * Trigger goal notifications (spending limits, savings achievements)
 */
export async function triggerGoalNotification(title: string, body: string, metadata: Record<string, any> = {}) {
  const store = useNotificationStore.getState();
  const notify = await store.addNotification(title, body, 'goal', metadata);
  await showLocalNotificationAlert(notify.title, notify.body);
}

/**
 * Analyze transactions and check budget limits to issue warnings
 */
export async function processTransactionNotification(tx: Transaction) {
  const store = useNotificationStore.getState();
  const { useAuthStore } = require('@/stores/authStore');

  // Don't issue alerts if loading historical records in auth check
  const txTime = new Date(tx.createdAt).getTime();
  const nowTime = Date.now();
  if (nowTime - txTime > 60000) return; // Ignore records created > 1 minute ago

  // 1. Trigger Transaction Successfully Added Notification
  if (tx.type === 'income') {
    const notify = await store.addNotification(
      'Income Added 💰',
      `Successfully recorded income of ${tx.amount} ${tx.currency} under "${tx.category}".`,
      'income',
      { transactionId: tx.id }
    );
    await showLocalNotificationAlert(notify.title, notify.body);
  } else if (tx.type === 'expense') {
    const notify = await store.addNotification(
      'Expense Added 💸',
      `Successfully recorded expense of ${tx.amount} ${tx.currency} under "${tx.category}".`,
      'expense',
      { transactionId: tx.id }
    );
    await showLocalNotificationAlert(notify.title, notify.body);

    // 2. Check Large Expense (Custom trigger: >= 5000 units)
    if (tx.amount >= 5000) {
      const largeNotify = await store.addNotification(
        'Large Expense Warning ⚠️',
        `A high amount of ${tx.amount} ${tx.currency} was spent on "${tx.category}". Ensure this fits your plan.`,
        'expense',
        { transactionId: tx.id, triggerType: 'large_expense' }
      );
      await showLocalNotificationAlert(largeNotify.title, largeNotify.body);
    }

    // 3. Evaluate Budgets
    const budgetStore = useBudgetStore.getState();
    const transactionStore = useTransactionStore.getState();

    // Find budget groups related to the expense category
    const budgets = budgetStore.budgets;
    const transactions = transactionStore.transactions;
    const groups = computeBudgetGroups(budgets, transactions);

    const targetGroup = groups.find(g =>
      g.categories.some(cat => cat.category === tx.category)
    );

    if (targetGroup) {
      const budgetName = targetGroup.name;
      const spent = targetGroup.totalSpent;
      const amount = targetGroup.totalAmount;
      const ratio = spent / amount;

      // Load notifications to verify warnings haven't been repeated for the same cycle
      const currentCycleNotifications = store.notifications.filter(
        n => n.type === 'budget' &&
          n.metadata?.budgetName === budgetName &&
          n.metadata?.startDate === targetGroup.startDate
      );

      const hasSent80 = currentCycleNotifications.some(n => n.metadata?.threshold === '80%');
      const hasSent100 = currentCycleNotifications.some(n => n.metadata?.threshold === '100%');

      if (ratio >= 0.8 && ratio < 1.0 && !hasSent80) {
        // Almost reached (80%)
        const alert80 = await store.addNotification(
          'Budget Alert (80%) ⚠️',
          `You have spent 80% or more of your budget for "${budgetName}". (${spent.toFixed(0)} / ${amount.toFixed(0)})`,
          'budget',
          { budgetName, startDate: targetGroup.startDate, threshold: '80%' }
        );
        await showLocalNotificationAlert(alert80.title, alert80.body);
      } else if (ratio >= 1.0 && !hasSent100) {
        // Exceeded
        const alert100 = await store.addNotification(
          'Budget Limit Exceeded 🚨',
          `You have exceeded your budget limit for "${budgetName}". Total spent: ${spent.toFixed(0)} (limit: ${amount.toFixed(0)})`,
          'budget',
          { budgetName, startDate: targetGroup.startDate, threshold: '100%' }
        );
        await showLocalNotificationAlert(alert100.title, alert100.body);
      }
    }
  }
}
