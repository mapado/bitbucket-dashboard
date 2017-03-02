import React, { Component } from 'react';
import moment from 'moment';
import urijs from 'urijs';
import './App.css';
import fetchBitbucket from './bitbucket';
import RepositoryList from './RepositoryList';
import PullRequest from './PullRequest';

const USERNAME = urijs.parseQuery(urijs().query()).who;

if (!process.env.REACT_APP_BB_AUTH) {
  console.warn('REACT_APP_BB_AUTH is not set, run REACT_APP_BB_AUTH="your-token" npm start');
}

function PullRequestList({ pullRequestList, title }) {
  console.log(pullRequestList);
  return (
    <div>
      <h2>{title}</h2>
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
          {pullRequestList.map(({pr, approvalList, activityList, statuses}) =>
            <PullRequest
              username={USERNAME}
              key={`${pr.source.repository.full_name}-${pr.id}`}
              pr={pr}
              activityList={activityList}
              statuses={statuses}
            />
          )}
          {pullRequestList.length === 0 &&
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
      })
    ;
  }

  fetchPullRequests() {
    const repositories = this.state.repositories;
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
          const fetchStatuses = fetchBitbucket(pr.links.statuses.href)
            .then(response => response.json());

          return Promise.all([fetchActivity, fetchSelf, fetchStatuses])
            .then(([activityList, self, statuses]) => {
              const approvalList = activityList.values.filter(activity => activity.approval);

              return {
                pr: self,
                approvalList,
                activityList: activityList.values,
                statuses,
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

  fetchLast15DaysPullRequests() {
    const repositories = this.state.repositories;
    if (!repositories) {
      return;
    }

    const promises = repositories.values.map(repo => {
      return fetchBitbucket(`repositories/mapado/${repo.name}/pullrequests?sort=-updated_on&q=${encodeURIComponent(`author.username="${USERNAME}" AND state="MERGED" AND updated_on >= ${moment().subtract(15, 'days').format('YYYY-MM-DD')}`)}`)
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

        this.setState({
          last15daysPullRequests: out.map(pr => ({ pr })),
        });
      })
    ;
  }

  componentDidMount() {
    this.reloadInterval = setInterval(this.reload, 30 * 60 * 1000); // 1 minute
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
      .then(() => {
        this.fetchPullRequests();
        this.fetchLast15DaysPullRequests();
      })
    ;
  }

  render() {
    if (!USERNAME) {
      const users = [
        'jdeniau',
        'zwit',
        'badaz',
        'cmozzati',
        'thomasdiluccio',
        'Senromain',
        'Fe4nn0r',
        'dallegoet',
        'adrien_fichet',
      ];

      return (<div>
        Who are you ?
        <ul>
          {users.map(user =>
            <li key={user}>
              <a href={`?who=${user}`}>
                {user}
              </a>
            </li>
          )}
        </ul>
      </div>);
    }
    if (!process.env.REACT_APP_BB_AUTH) {
      return (<div>
        Token not set
      </div>);
    }

    console.log(this.state);
    return (
      <div className="App">
        <h2>Last updated repos</h2>
        <RepositoryList repositoryList={this.state.repositories} />

        {this.state.myPullrequests &&
          <PullRequestList
            pullRequestList={this.state.myPullrequests}
            title="My Pull requests"
          />
        }

        {this.state.last15daysPullRequests &&
          <PullRequestList
            pullRequestList={this.state.last15daysPullRequests}
            title="Merged in the last 15 days"
          />
        }
      </div>
    );
  }
}

export default App;
