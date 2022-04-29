import { initializeApp } from 'firebase-admin';
import * as functions from 'firebase-functions';

const app = initializeApp();

exports.detectInactiveSubscribersOrPublishers = functions.pubsub
  .schedule('every 3 minutes')
  .onRun(async () => {
    const visitorsRef = app.database().ref('/mirroringShare/visitors');
    const visitorsDataSnapshot = await visitorsRef.get();
    visitorsDataSnapshot.forEach((snapshot) =>
      snapshot.forEach((visitorSnapshot) => {
        const visitor = visitorSnapshot.val();
        const diff = visitor.timestamp - new Date().getTime();
        // 1分無通信のビジターをしばく
        const isDisconnected = diff / (60 * 1000) < -1;
        // 何人いたか知りたいので論理削除する
        if (isDisconnected && !visitor.inactive) {
          visitorSnapshot.ref.update(
            {
              inactive: true,
            },
            console.error
          );
        }
      })
    );

    const sessionsRef = app.database().ref('/mirroringShare/sessions');
    const sessionsSnapshot = await sessionsRef.get();
    sessionsSnapshot.forEach((snapshot) => {
      const session = snapshot.val();
      const diff = session.timestamp - new Date().getTime();
      // ３分無通信のセッションをしばく
      const isDisconnected = diff / (60 * 1000) < -3;
      if (isDisconnected) {
        snapshot.ref.remove().catch(console.error);
      }
    });

    return null;
  });
