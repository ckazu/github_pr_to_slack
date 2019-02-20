// environment variables
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// for slack
const { IncomingWebhook } = require('@slack/client');
const slack = new IncomingWebhook(SLACK_WEBHOOK_URL);

exports.githubPrToSlack = async (req, res) => {
  const message = 'Hello World!';
  await post_to_slack(message);
  res.send(message);
};

post_to_slack = (message) => {
  slack.send(message, function(err, res) {
    if (err) {
      console.log('Error:', err);
    } else {
      console.log('Message sent: ', res);
    }
  });
};
