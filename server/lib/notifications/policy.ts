/** System accounts never receive inbox notifications, including mandatory types. */
export const canReceiveNotifications = (userId: string) => userId !== 'swubase';
