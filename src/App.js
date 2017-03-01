import React, { Component } from 'react';
import logo from './logo.svg';
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
          return fetchBitbucket(pr.links.activity.href)
            .then(response => response.json())
            .then(activityList => {
              const approvalList = activityList.values.filter(activity => activity.approval);

              return {
                pr,
                approvalList,
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
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to React</h2>
        </div>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>

        <ul>
          {this.state.repositories && this.state.repositories.values.map(project =>
            <li key={project.uuid}>{project.name}</li>
          )}
        </ul>

        <h2>My Pull requests</h2>
        <ul>
          {this.state.myPullrequests.map(({pr, approvalList}) =>
            <li key={`${pr.source.repository.full_name}-${pr.id}`}>
              <a href={pr.links.html.href}>
                {pr.source.repository.name} {' - '}
                {pr.id} {' - '}
                {pr.title} {' - '}
                {pr.comment_count} comments {' - '}
                {approvalList.length} approval {' - '}
              </a>
            </li>
          )}
        </ul>
      </div>
    );
  }
}

export default App;
