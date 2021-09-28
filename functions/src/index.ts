import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as rp from 'request-promise';

admin.initializeApp();

type Report = {
  description: string;
  resolved: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
};

exports.notifyReportCreatedToDiscord = functions.firestore
  .document('reports/{docId}')
  .onCreate(async (change) => {
    const whUrl = functions.config().discord_cs.webhook_url;
    const report = change.data() as Report;
    const pngFile = admin.storage().bucket().file(`reports/${change.id}.png`);
    const imgUrl = await pngFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    await rp(whUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      json: true,
      body: {
        content: `**🙏アプリから新しいバグ報告が届きまさした‼🙏**\n\`\`\`${report.description}\`\`\``,
        embeds: [
          {
            image: {
              url: imgUrl[0],
            },
            fields: [
              {
                name: 'チケットID',
                value: change.id,
              },
              {
                name: '発行日時',
                value: report.createdAt.toDate().toDateString(),
              },
            ],
          },
        ],
      },
    });
  });

exports.notifyReportResolvedToDiscord = functions.firestore
  .document('reports/{docId}')
  .onUpdate(async (change) => {
    const whUrl = functions.config().discord_cs.webhook_url;
    const report = change.after.data() as Report;
    if (!report.resolved) {
      return;
    }

    const pngFile = admin
      .storage()
      .bucket()
      .file(`reports/${change.after.id}.png`);
    const imgUrl = await pngFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    await rp(whUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      json: true,
      body: {
        content: `**🎉バグが解決済みにマークされまさした‼🎉**\n\`\`\`${report.description}\`\`\``,
        embeds: [
          {
            image: {
              url: imgUrl[0],
            },
            fields: [
              {
                name: 'チケットID',
                value: change.after.id,
              },
              {
                name: '解決日時',
                value: report.createdAt.toDate().toDateString(),
              },
            ],
          },
        ],
      },
    });
  });
