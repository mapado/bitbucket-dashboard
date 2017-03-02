import React, { Component } from 'react';
import cn from 'classnames';
import './App.css';

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

function Participant({ participant }) {
  return (
    <div key={participant.user.uuid} className={cn('Participant', participant.approved && 'Participant--approved')}>
      <img
        className="Participant-image"
        src={participant.user.links.avatar.href}
        alt={participant.user.display_name}
      />
      {participant.approved &&
        <div className="Participant-badge"><span>✔️️</span></div>
      }
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
      return fetchBitbucket(`repositories/mapado/${repo.name}/pullrequests?q=${encodeURIComponent('author.username="jdeniau" AND state="OPEN"')}`)
        .then(response => response.json())
        .then(prs => prs.values)
      ;
    });

    return Promise.all(promises)
      .then(pullrequestByRepo => {

        const out = pullrequestByRepo
          .filter(prByRepo => prByRepo.length > 0)
          .reduce((out, prs) => {
            return out.concat(prs);
          })
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
    this
      .fetchRepositories()
      .then(this.fetchPullRequests)
    ;
  }

  render() {
    if (!bbAuth) {
      return (<div>
        Token not set
      </div>);
    }

    console.log(this.state);
    return (
      <div className="App">
        <h2>Last projects</h2>
        <ul>
          {this.state.repositories && this.state.repositories.values.map(project =>
            <li key={project.uuid}>{project.name}</li>
          )}
        </ul>

        <h2>My Pull requests</h2>
        <table>
          <thead>
            <tr>
              <td>Projet</td>
              <td>Title</td>
              <td>Reviewers</td>
              <td>Status</td>
              <td>Comments</td>
            </tr>
          </thead>
          <tbody>
            {this.state.myPullrequests.map(({pr, approvalList}) =>
              <tr key={`${pr.source.repository.full_name}-${pr.id}`}>
                <td>{pr.source.repository.name}</td>
                <td>
                  <a href={pr.links.html.href}>
                    #{pr.id} {pr.title}
                  </a>
                </td>
                <td>
                  {pr.participants.map(participant =>
                    <Participant key={participant.user.uuid} participant={participant} />
                  )}
                </td>
                <td>-</td>
                <td>{pr.comment_count} comments</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
}

export default App;
