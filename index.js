const moment = require('moment');

// environment variables
const GITHUB_ACCESSTOKEN = process.env.GITHUB_ACCESSTOKEN;
const GITHUB_SEARCH_QUERY = process.env.GITHUB_SEARCH_QUERY;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL;

// for octokit
const Octokit = require('@octokit/rest');
const octokit = new Octokit({ auth: `token ${GITHUB_ACCESSTOKEN}` });

// for slack
const { IncomingWebhook } = require('@slack/client');
const slack = new IncomingWebhook(SLACK_WEBHOOK_URL);

exports.githubPrToSlack = async (req, res) => {
  console.log(req.body);

  if(SLACK_CHANNEL != req.body.channel_id) {
    console.log('access denied', req.body);
    res.status(403).end('access denied.');
    return;
  }

  const query = req.body.text || GITHUB_SEARCH_QUERY;
  const prs = await fetchPullRequests(query);

  if(prs.status == 200) {
    await postToSlack(formatForSlack(prs, query));
  } else if(prs.errors) {
    await postToSlack(prs.errors[0].message);
  }
  // slash コマンドの場合でも、セキュリティのためレスポンスではなく、別途 incoming-webhook 経由で返却している
  res.status(200).end();
};

fetchPullRequests = async(query) => {
  return await octokit.search.issuesAndPullRequests({ q: query, state: 'open', sort: 'created', order: 'asc', per_page: 100 })
    .catch((error) => { console.error('octokit.search.issuesAndPullrequests', error); return error; });
};

formatPrForSlack = ((pr) => {
  const diff_days = moment().diff(moment(pr.updated_at), 'days');
  const labels = pr.labels.map(label => { return label.name; }).toString();
  return {
    color: slackColorOfPrDays(diff_days),
    title_link: pr.html_url,
    title: `${pr.number}: ${pr.title}`,
    text: `by ${pr.user.login} / ${diff_days}d / :speech_balloon: ${pr.comments} / :label: ${labels}`
  };
});

formatForSlack = ((prs, query) => {
  if(prs.data.total_count == 0) { return `PR はありません [${query}]`; }

  return {
    text: `PR 一覧 ${prs.data.total_count}件 [${query}]`,
    attachments: prs.data.items.map((pr) => { return formatPrForSlack(pr); })
  };
});

slackColorOfPrDays = (days) => {
  if(days <= 2) { return 'good'; }
  else if(days <= 7) { return 'warning'; }
  else { return 'danger'; }
};

postToSlack = async (message) => {
  if(typeof message == 'string')
    message = { text: message };

  return await slack.send(message, (err, res) => {
    if (err) { console.error('slack', err); }
  });
};
