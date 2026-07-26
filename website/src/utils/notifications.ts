import { notifications as mantineNotifications, type NotificationData } from "@mantine/notifications";

const DEFAULT_AUTO_CLOSE = 3000;

/**
 * Show a Mantine notification with a default autoClose duration of 3000ms.
 */
export const showNotification = (options: NotificationData) => {
  return mantineNotifications.show({
    autoClose: DEFAULT_AUTO_CLOSE,
    ...options,
  });
};

/**
 * Update an existing Mantine notification with a default autoClose duration of 3000ms.
 */
export const updateNotification = (options: NotificationData) => {
  return mantineNotifications.update({
    autoClose: DEFAULT_AUTO_CLOSE,
    ...options,
  });
};

/**
 * Wrapped notifications utility matching Mantine's notifications API,
 * defaulting autoClose to 3000ms.
 */
export const notifications = {
  ...mantineNotifications,
  show: showNotification,
  update: updateNotification,
};
