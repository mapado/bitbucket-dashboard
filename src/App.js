import React, { Component } from 'react';
import cn from 'classnames';
import moment from 'moment';
import urijs from 'urijs';
import './App.css';

const USERNAME = urijs.parseQuery(urijs().query()).who;

if (!process.env.REACT_APP_BB_AUTH) {
  console.warn('REACT_APP_BB_AUTH is not set, run REACT_APP_BB_AUTH="your-token" npm start');
}

const bbAuth = process.env.REACT_APP_BB_AUTH;

function fetchBitbucket(endpoint) {
  const url = endpoint.startsWith('https://') ? endpoint : `https://api.bitbucket.org/2.0/${endpoint}`;
  return fetch(
    url,
    {
      'headers': {
        Authorization: `Basic ${bbAuth}`,
      },
    }
  );
}

function TimeFrom({ when }) {
  return (when &&
    <div title={moment(when).format()}>
      {moment(when).fromNow()}
    </div>
  );
}

function Comment({ comment }) {
  if (!comment) {
    return null;
  }

  return (<div className="media">
    <div className="media__object">
      <Avatar user={comment.comment.user} />
    </div>
    <div className="media__body">
      <TimeFrom when={comment.comment.created_on} />
      <div>
        {comment.comment.content.raw.substr(0, 20)}...
      </div>
    </div>
  </div>);
}

function PullRequest({ pr, activityList }) {
  const key = `${pr.source.repository.full_name}-${pr.id}`;

  const lastComment = activityList.find(activity => !!activity.comment);
  const myLastComment = activityList.find(activity => activity.comment && activity.comment.user.username === USERNAME);

  return (
    <tr key={key}>
      <td>{pr.source.repository.name}</td>
      <td>
        <a href={pr.links.html.href}>
          #{pr.id} {pr.title}
        </a>
      </td>
      <td className="ParticipantList">
        {pr.participants.map(participant =>
          <Participant key={participant.user.uuid} participant={participant} />
        )}
      </td>
      <td>-</td>
      <td>{pr.comment_count} comments</td>
      <td>
        <Comment comment={lastComment} />
      </td>
      <td>
        <Comment comment={myLastComment} />
      </td>
    </tr>
  );
}

function Avatar({ user }) {
  return (
    <img
      className="Participant-image"
      src={user.links.avatar.href}
      alt={user.display_name}
    />
  );
}

function Participant({ participant }) {
  return (
    <div key={participant.user.uuid} className={cn('Participant', participant.approved && 'Participant--approved')}>
      <Avatar user={participant.user} />
      {participant.approved &&
        <div className="Participant-badge"><span>✔️️</span></div>
      }
    </div>
  );
}

function RepositoryList({ repositoryList }) {
  if (!repositoryList) {
    return null;
  }

  return (
    <div className="grid-row-from-sm RepositoryList">
      {repositoryList.values.map(repo =>
        <div className="grid-col-6-from-sm grid-col-3-from-md">
          <div key={repo.uuid} className="mpd-block Repository">
            <a href={repo.links.html.href} className="mpd-block-content Repository-Link">
              <div>{repo.name}</div>
              <TimeFrom when={repo.updated_on} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

class App extends Component {
  state = {
    repositories: null,
    myPullrequests: [],
  }

  constructor(props) {
    super(props);

    this.fetchPullRequests = this.fetchPullRequests.bind(this);
    this.reload = this.reload.bind(this);
    this.reloadInterval = null;
  }

  fetchRepositories() {
    return fetchBitbucket('repositories/mapado?sort=-updated_on')
      .then(response => response.json())
      .then(repositories => {
        this.setState({
          repositories,
        });

        return repositories;
      })
    ;
  }

  fetchPullRequests(repositories) {
    if (!repositories) {
      return;
    }

    const promises = repositories.values.map(repo => {
      return fetchBitbucket(`repositories/mapado/${repo.name}/pullrequests?q=${encodeURIComponent(`author.username="${USERNAME}" AND state="OPEN"`)}`)
        .then(response => response.json())
        .then(prs => prs.values)
      ;
    });

    return Promise.all(promises)
      .then(pullrequestByRepo => {

        const out = pullrequestByRepo
          .filter(prByRepo => prByRepo.length > 0)
          .reduce(
            (out, prs) =>  out.concat(prs),
            []
          )
        ;
        console.log(out);

        Promise.all(out.map(pr => {
          const fetchActivity = fetchBitbucket(pr.links.activity.href)
            .then(response => response.json());
          const fetchSelf = fetchBitbucket(pr.links.self.href)
            .then(response => response.json());

          return Promise.all([fetchActivity, fetchSelf])
            .then(([activityList, self]) => {
              const approvalList = activityList.values.filter(activity => activity.approval);

              return {
                pr: self,
                approvalList,
                activityList: activityList.values,
              };
            })
          ;
        }))
          .then(out => {
            this.setState({
              myPullrequests: out,
            });
          })
        ;

      })
    ;
  }

  componentDidMount() {
    this.reloadInterval = setInterval(this.reload, 5 * 60 * 1000);
    this.reload();
  }

  componentWillUnmount() {
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval);
    }
  }

  reload() {
    this
      .fetchRepositories()
      .then(this.fetchPullRequests)
    ;
  }

  render() {
    if (!USERNAME) {
      return (<div>
        User not set{' '}
        <a href="?who=jdeniau">
          Let's try with jdeniau
        </a>
      </div>);
    }
    if (!bbAuth) {
      return (<div>
        Token not set
      </div>);
    }

    console.log(this.state);
    return (
      <div className="App">
        <h2>Last updated repos</h2>
        <RepositoryList repositoryList={this.state.repositories} />

        <h2>My Pull requests</h2>
        <table className="table">
          <thead>
            <tr>
              <td>Projet</td>
              <td>Title</td>
              <td>Reviewers</td>
              <td>Status</td>
              <td>Comments</td>
              <td>Last Comment</td>
              <td>My last comment</td>
            </tr>
          </thead>
          <tbody>
            {this.state.myPullrequests.map(({pr, approvalList, activityList}) =>
              <PullRequest
                key={`${pr.source.repository.full_name}-${pr.id}`}
                pr={pr}
                activityList={activityList}
              />
            )}
            {this.state.myPullrequests.length === 0 &&
              <tr>
                <td colSpan="100%">
                  No opened pull request
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    );
  }
}

export default App;
